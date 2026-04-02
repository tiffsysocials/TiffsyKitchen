import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { GradientBox } from '../../../components/common/GradientBox';
import { useAlert } from '../../../hooks/useAlert';
import { menuManagementService } from '../../../services/menu-management.service';
import {
  MenuItem,
  MenuType,
  MealWindow,
  DietaryType,
  SpiceLevel,
  MenuItemCategory,
  CreateMenuItemRequest,
  UpdateMenuItemRequest,
} from '../../../types/api.types';

interface MenuDetailScreenProps {
  itemId?: string;
  kitchenId: string;
  onBack: () => void;
  onSaved: () => void;
  onNavigateToAddonManagement?: (itemId: string) => void;
  userRole: 'ADMIN' | 'KITCHEN_STAFF';
}

export const MenuDetailScreen: React.FC<MenuDetailScreenProps> = ({
  itemId,
  kitchenId,
  onBack,
  onSaved,
  onNavigateToAddonManagement,
  userRole,
}) => {
  const { showSuccess, showError, showWarning, showConfirm } = useAlert();
  const isEditMode = !!itemId;

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [item, setItem] = useState<MenuItem | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [menuType, setMenuType] = useState<MenuType>('ON_DEMAND_MENU');
  const [mealWindow, setMealWindow] = useState<MealWindow>('LUNCH');
  const [category, setCategory] = useState<MenuItemCategory>('MAIN_COURSE');
  const [price, setPrice] = useState('');
  const [discountedPrice, setDiscountedPrice] = useState('');
  const [portionSize, setPortionSize] = useState('');
  const [preparationTime, setPreparationTime] = useState('');
  const [dietaryType, setDietaryType] = useState<DietaryType>('VEG');
  const [isJainFriendly, setIsJainFriendly] = useState(false);
  const [spiceLevel, setSpiceLevel] = useState<SpiceLevel>('MEDIUM');
  const [includes, setIncludes] = useState<string[]>([]);
  const [includesInput, setIncludesInput] = useState('');
  const [displayOrder, setDisplayOrder] = useState('1');
  const [isFeatured, setIsFeatured] = useState(false);

  useEffect(() => {
    if (isEditMode && itemId) {
      loadMenuItem();
    }
  }, [itemId]);

  const loadMenuItem = async () => {
    try {
      const response = await menuManagementService.getMenuItemById(itemId!);
      const loadedItem = response.menuItem;

      setItem(loadedItem);
      setName(loadedItem.name);
      setDescription(loadedItem.description || '');
      setMenuType(loadedItem.menuType);
      setMealWindow(loadedItem.mealWindow || 'LUNCH');
      setCategory(loadedItem.category);
      setPrice(String(loadedItem.price));
      setDiscountedPrice(loadedItem.discountedPrice ? String(loadedItem.discountedPrice) : '');
      setPortionSize(loadedItem.portionSize || '');
      setPreparationTime(loadedItem.preparationTime ? String(loadedItem.preparationTime) : '');
      setDietaryType(loadedItem.dietaryType);
      setIsJainFriendly(loadedItem.isJainFriendly);
      setSpiceLevel(loadedItem.spiceLevel);
      setIncludes(loadedItem.includes);
      setDisplayOrder(String(loadedItem.displayOrder));
      setIsFeatured(loadedItem.isFeatured);
    } catch (error) {
      console.error('Error loading menu item:', error);
      showError('Error', 'Failed to load menu item');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      showWarning('Validation Error', 'Name is required');
      return false;
    }

    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      showWarning('Validation Error', 'Valid price is required');
      return false;
    }

    if (discountedPrice && Number(discountedPrice) >= Number(price)) {
      showWarning('Validation Error', 'Discounted price must be less than regular price');
      return false;
    }

    if (menuType === 'MEAL_MENU' && !mealWindow) {
      showWarning('Validation Error', 'Meal window is required for Meal Menu items');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const data: CreateMenuItemRequest | UpdateMenuItemRequest = {
        kitchenId,
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        menuType,
        ...(menuType === 'MEAL_MENU' && { mealWindow }),
        price: Number(price),
        discountedPrice: discountedPrice ? Number(discountedPrice) : undefined,
        portionSize: portionSize.trim() || undefined,
        preparationTime: preparationTime ? Number(preparationTime) : undefined,
        dietaryType,
        isJainFriendly,
        spiceLevel,
        images: [],
        includes,
        isAvailable: true,
        displayOrder: Number(displayOrder),
        isFeatured,
      };

      if (isEditMode && itemId) {
        await menuManagementService.updateMenuItem(itemId, data);
        showSuccess('Success', 'Menu item updated successfully', () => {
          onSaved();
          onBack();
        });
      } else {
        const newItem = await menuManagementService.createMenuItem(data as CreateMenuItemRequest);
        showSuccess('Success', 'Menu item created successfully', () => {
          onSaved();
          onBack();
        });
      }
    } catch (error: any) {
      console.error('Error saving menu item:', error);
      showError('Error', error.message || 'Failed to save menu item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    showConfirm(
      'Delete Menu Item',
      'Are you sure you want to delete this item?',
      async () => {
        try {
          await menuManagementService.deleteMenuItem(itemId!);
          showSuccess('Success', 'Menu item deleted', () => {
            onSaved();
            onBack();
          });
        } catch (error) {
          showError('Error', 'Failed to delete menu item');
        }
      },
      undefined,
      { confirmText: 'Delete', cancelText: 'Cancel', isDestructive: true }
    );
  };

  const handleDisable = () => {
    // Alert.prompt is iOS-only, kept for the prompt functionality
    Alert.prompt(
      'Disable Menu Item',
      'Please provide a reason for disabling this item:',
      async (reason) => {
        if (reason && reason.trim()) {
          try {
            await menuManagementService.disableMenuItem(itemId!, reason.trim());
            showSuccess('Success', 'Menu item disabled', () => {
              onSaved();
              loadMenuItem();
            });
          } catch (error) {
            showError('Error', 'Failed to disable menu item');
          }
        }
      }
    );
  };

  const handleEnable = async () => {
    try {
      await menuManagementService.enableMenuItem(itemId!);
      showSuccess('Success', 'Menu item enabled', () => {
        onSaved();
        loadMenuItem();
      });
    } catch (error) {
      showError('Error', 'Failed to enable menu item');
    }
  };

  const handleAddInclude = () => {
    if (includesInput.trim()) {
      setIncludes([...includes, includesInput.trim()]);
      setIncludesInput('');
    }
  };

  const handleRemoveInclude = (index: number) => {
    setIncludes(includes.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FE8733" />
      </View>
    );
  }

  return (
    <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
      <GradientBox style={[styles.header, { paddingTop: 8 }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? 'Edit Menu Item' : 'Create Menu Item'}</Text>
        <View style={styles.headerPlaceholder} />
      </GradientBox>

      <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter item name"
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter description"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Menu Type (only for create) */}
        {!isEditMode && (
          <View style={styles.field}>
            <Text style={styles.label}>Menu Type *</Text>
            <View style={styles.segmentControl}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  menuType === 'MEAL_MENU' && styles.segmentButtonActive,
                ]}
                onPress={() => setMenuType('MEAL_MENU')}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    menuType === 'MEAL_MENU' && styles.segmentButtonTextActive,
                  ]}
                >
                  Meal Menu
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  menuType === 'ON_DEMAND_MENU' && styles.segmentButtonActive,
                ]}
                onPress={() => setMenuType('ON_DEMAND_MENU')}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    menuType === 'ON_DEMAND_MENU' && styles.segmentButtonTextActive,
                  ]}
                >
                  On-Demand
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Meal Window (only for MEAL_MENU) */}
        {menuType === 'MEAL_MENU' && (
          <View style={styles.field}>
            <Text style={styles.label}>Meal Window *</Text>
            <View style={styles.segmentControl}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  mealWindow === 'LUNCH' && styles.segmentButtonActive,
                ]}
                onPress={() => setMealWindow('LUNCH')}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    mealWindow === 'LUNCH' && styles.segmentButtonTextActive,
                  ]}
                >
                  Lunch
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  mealWindow === 'DINNER' && styles.segmentButtonActive,
                ]}
                onPress={() => setMealWindow('DINNER')}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    mealWindow === 'DINNER' && styles.segmentButtonTextActive,
                  ]}
                >
                  Dinner
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Price */}
        <View style={styles.row}>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Price *</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Discounted Price</Text>
            <TextInput
              style={styles.input}
              value={discountedPrice}
              onChangeText={setDiscountedPrice}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Dietary Type */}
        <View style={styles.field}>
          <Text style={styles.label}>Dietary Type *</Text>
          <View style={styles.radioGroup}>
            {(['VEG', 'NON_VEG', 'VEGAN', 'EGGETARIAN'] as DietaryType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.radioButton,
                  dietaryType === type && styles.radioButtonActive,
                ]}
                onPress={() => setDietaryType(type)}
              >
                <Text
                  style={[
                    styles.radioButtonText,
                    dietaryType === type && styles.radioButtonTextActive,
                  ]}
                >
                  {type.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Spice Level */}
        <View style={styles.field}>
          <Text style={styles.label}>Spice Level</Text>
          <View style={styles.radioGroup}>
            {(['MILD', 'MEDIUM', 'SPICY', 'EXTRA_SPICY'] as SpiceLevel[]).map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.radioButton,
                  spiceLevel === level && styles.radioButtonActive,
                ]}
                onPress={() => setSpiceLevel(level)}
              >
                <Text
                  style={[
                    styles.radioButtonText,
                    spiceLevel === level && styles.radioButtonTextActive,
                  ]}
                >
                  {level.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Switches */}
        <View style={styles.field}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Jain Friendly</Text>
            <Switch
              value={isJainFriendly}
              onValueChange={setIsJainFriendly}
              trackColor={{ false: '#d1d5db', true: '#86efac' }}
              thumbColor={isJainFriendly ? '#16a34a' : '#f3f4f6'}
            />
          </View>
        </View>

        <View style={styles.field}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Featured</Text>
            <Switch
              value={isFeatured}
              onValueChange={setIsFeatured}
              trackColor={{ false: '#d1d5db', true: '#86efac' }}
              thumbColor={isFeatured ? '#16a34a' : '#f3f4f6'}
            />
          </View>
        </View>

        {/* Includes */}
        <View style={styles.field}>
          <Text style={styles.label}>Includes (Thali Contents)</Text>
          <View style={styles.includesInput}>
            <TextInput
              style={[styles.input, styles.includesTextInput]}
              value={includesInput}
              onChangeText={setIncludesInput}
              placeholder="Add item..."
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddInclude}>
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          {includes.map((item, index) => (
            <View key={index} style={styles.includeItem}>
              <Text style={styles.includeItemText}>{item}</Text>
              <TouchableOpacity onPress={() => handleRemoveInclude(index)}>
                <Text style={styles.removeButton}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Actions */}
        {isEditMode && itemId && onNavigateToAddonManagement && (
          <TouchableOpacity
            style={styles.addonButton}
            onPress={() => onNavigateToAddonManagement(itemId)}
          >
            <Text style={styles.addonButtonText}>Manage Add-ons</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {isEditMode && (
          <>
            {userRole === 'ADMIN' && item?.status !== 'DISABLED_BY_ADMIN' && (
              <TouchableOpacity style={styles.disableButton} onPress={handleDisable}>
                <Text style={styles.disableButtonText}>Disable</Text>
              </TouchableOpacity>
            )}
            {userRole === 'ADMIN' && item?.status === 'DISABLED_BY_ADMIN' && (
              <TouchableOpacity style={styles.enableButton} onPress={handleEnable}>
                <Text style={styles.enableButtonText}>Enable</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>{isEditMode ? 'Save Changes' : 'Create Item'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  halfField: {
    flex: 1,
    marginRight: 8,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  segmentControl: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  segmentButtonActive: {
    backgroundColor: '#FE8733',
  },
  segmentButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  segmentButtonTextActive: {
    color: '#ffffff',
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radioButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  radioButtonActive: {
    backgroundColor: '#FE8733',
    borderColor: '#FE8733',
  },
  radioButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  radioButtonTextActive: {
    color: '#ffffff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  includesInput: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  includesTextInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#FE8733',
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  includeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  includeItemText: {
    fontSize: 14,
    color: '#374151',
  },
  removeButton: {
    fontSize: 16,
    color: '#dc2626',
    fontWeight: '600',
  },
  addonButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addonButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  disableButton: {
    flex: 1,
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disableButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  enableButton: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  enableButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#FE8733',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});
