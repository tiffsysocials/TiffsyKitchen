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
  Modal,
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
  const [disableModalVisible, setDisableModalVisible] = useState(false);
  const [disableReason, setDisableReason] = useState('');
  const [disableError, setDisableError] = useState('');
  const [disabling, setDisabling] = useState(false);
  const [item, setItem] = useState<MenuItem | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [menuType, setMenuType] = useState<MenuType>('ON_DEMAND_MENU');
  const [mealWindows, setMealWindows] = useState<MealWindow[]>(['LUNCH']);
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
      // Prefer the new array; fall back to legacy single-value field for older docs.
      const loadedWindows = loadedItem.mealWindows && loadedItem.mealWindows.length > 0
        ? loadedItem.mealWindows
        : (loadedItem.mealWindow ? [loadedItem.mealWindow] : []);
      setMealWindows(loadedWindows.length > 0 ? loadedWindows : ['LUNCH']);
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

    if (menuType === 'MEAL_MENU' && mealWindows.length === 0) {
      showWarning('Validation Error', 'Select at least one meal window (Lunch or Dinner)');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      // Base payload — meal window is added per-call below.
      const basePayload: Omit<CreateMenuItemRequest, 'mealWindow' | 'mealWindows'> = {
        kitchenId,
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        menuType,
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
        // ------ EDIT FLOW ------
        // One MenuItem in DB == one mealWindow. The current item keeps its window if still
        // selected; any newly-toggled window spawns a new MenuItem alongside it.
        if (menuType !== 'MEAL_MENU') {
          await menuManagementService.updateMenuItem(itemId, basePayload as UpdateMenuItemRequest);
          showSuccess('Success', 'Menu item updated successfully', () => {
            onSaved();
            onBack();
          });
        } else {
          const currentWindow = item?.mealWindow ||
            (item?.mealWindows && item.mealWindows[0]) ||
            mealWindows[0];

          // Window the existing item keeps: prefer the current one if still selected,
          // else fall back to the first selected (= user is switching windows).
          const targetWindow = mealWindows.includes(currentWindow as MealWindow)
            ? currentWindow
            : mealWindows[0];
          const additionalWindows = mealWindows.filter(w => w !== targetWindow);

          // 1. Update the existing item to its target window.
          // 2. In parallel, create one new MenuItem for each additional window.
          const updatePromise = menuManagementService.updateMenuItem(itemId, {
            ...basePayload,
            mealWindow: targetWindow,
            mealWindows: targetWindow ? [targetWindow as MealWindow] : undefined,
          } as UpdateMenuItemRequest);

          const createPromises = additionalWindows.map(window =>
            menuManagementService.createMenuItem({
              ...basePayload,
              mealWindow: window,
              mealWindows: [window],
            } as CreateMenuItemRequest),
          );

          const results = await Promise.allSettled([updatePromise, ...createPromises]);

          const updateResult = results[0];
          const createResults = results.slice(1);
          const failedCreates = createResults.filter(r => r.status === 'rejected');

          if (updateResult.status === 'rejected') {
            // The primary update failed — propagate.
            throw (updateResult as PromiseRejectedResult).reason;
          }

          if (additionalWindows.length === 0) {
            showSuccess('Success', 'Menu item updated successfully', () => {
              onSaved();
              onBack();
            });
          } else if (failedCreates.length === 0) {
            showSuccess(
              'Success',
              `Updated and added ${additionalWindows.length} new meal-window item(s).`,
              () => {
                onSaved();
                onBack();
              },
            );
          } else {
            const failedWindows = additionalWindows.filter(
              (_, i) => createResults[i].status === 'rejected',
            );
            const firstError = (failedCreates[0] as PromiseRejectedResult).reason;
            showError(
              'Partially saved',
              `Updated the existing item, but failed to add: ${failedWindows.join(', ')}.\n${firstError?.message || ''}`,
            );
            onSaved();
          }
        }
      } else if (menuType === 'MEAL_MENU' && mealWindows.length > 1) {
        // Both Lunch + Dinner selected: create one MenuItem per meal window (parallel API calls).
        const results = await Promise.allSettled(
          mealWindows.map(window =>
            menuManagementService.createMenuItem({
              ...basePayload,
              mealWindow: window,
              mealWindows: [window],
            } as CreateMenuItemRequest),
          ),
        );

        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length === 0) {
          showSuccess(
            'Success',
            `Created ${mealWindows.length} menu items (one per meal window).`,
            () => {
              onSaved();
              onBack();
            },
          );
        } else if (failed.length < mealWindows.length) {
          // Partial success — surface the failed window(s) so admin can retry that one.
          const failedWindows = mealWindows.filter((_, i) => results[i].status === 'rejected');
          const firstError = (failed[0] as PromiseRejectedResult).reason;
          showError(
            'Partially saved',
            `Created the other meal-window item but failed for: ${failedWindows.join(', ')}.\n${firstError?.message || ''}`,
          );
          onSaved();
        } else {
          // All failed.
          const firstError = (failed[0] as PromiseRejectedResult).reason;
          throw firstError;
        }
      } else {
        // Single meal window (or ON_DEMAND_MENU).
        const createPayload: CreateMenuItemRequest = {
          ...basePayload,
          ...(menuType === 'MEAL_MENU' && {
            mealWindow: mealWindows[0],
            mealWindows: [mealWindows[0]],
          }),
        } as CreateMenuItemRequest;
        await menuManagementService.createMenuItem(createPayload);
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
    setDisableReason('');
    setDisableError('');
    setDisableModalVisible(true);
  };

  const handleConfirmDisable = async () => {
    const trimmed = disableReason.trim();
    if (!trimmed) {
      setDisableError('Reason is required');
      return;
    }
    setDisabling(true);
    try {
      await menuManagementService.disableMenuItem(itemId!, trimmed);
      setDisableModalVisible(false);
      showSuccess('Success', 'Menu item disabled', () => {
        onSaved();
        loadMenuItem();
      });
    } catch (error) {
      showError('Error', 'Failed to disable menu item');
    } finally {
      setDisabling(false);
    }
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

        {/* Meal Windows (only for MEAL_MENU). Multi-select: pick Lunch, Dinner, or both. */}
        {menuType === 'MEAL_MENU' && (
          <View style={styles.field}>
            <Text style={styles.label}>Meal Windows *</Text>
            <View style={styles.segmentControl}>
              {(['LUNCH', 'DINNER'] as MealWindow[]).map((window) => {
                const selected = mealWindows.includes(window);
                return (
                  <TouchableOpacity
                    key={window}
                    style={[
                      styles.segmentButton,
                      selected && styles.segmentButtonActive,
                    ]}
                    onPress={() => {
                      setMealWindows(prev =>
                        prev.includes(window)
                          ? prev.filter(w => w !== window)
                          : [...prev, window],
                      );
                    }}
                  >
                    <Text
                      style={[
                        styles.segmentButtonText,
                        selected && styles.segmentButtonTextActive,
                      ]}
                    >
                      {window === 'LUNCH' ? 'Lunch' : 'Dinner'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.helperText}>
              Tap to toggle. Selecting both creates two menu items — one for Lunch, one for Dinner.
            </Text>
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

      <Modal
        visible={disableModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !disabling && setDisableModalVisible(false)}
      >
        <View style={styles.disableOverlay}>
          <View style={styles.disableContainer}>
            <Text style={styles.disableTitle}>Disable Menu Item</Text>
            <Text style={styles.disableMessage}>
              Please provide a reason for disabling this item:
            </Text>
            <TextInput
              style={[styles.disableInput, disableError ? styles.disableInputError : null]}
              value={disableReason}
              onChangeText={(text) => {
                setDisableReason(text);
                if (disableError) setDisableError('');
              }}
              placeholder="Enter reason..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!disabling}
              autoFocus
            />
            {!!disableError && <Text style={styles.disableErrorText}>{disableError}</Text>}
            <View style={styles.disableActions}>
              <TouchableOpacity
                style={[styles.disableButton, styles.disableCancelButton]}
                onPress={() => setDisableModalVisible(false)}
                disabled={disabling}
              >
                <Text style={styles.disableCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.disableButton,
                  styles.disableConfirmButton,
                  disabling && { opacity: 0.6 },
                ]}
                onPress={handleConfirmDisable}
                disabled={disabling}
              >
                {disabling ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.disableConfirmText}>Disable</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
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
  disableOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  disableContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
  },
  disableTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  disableMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  disableInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
  },
  disableInputError: {
    borderColor: '#ef4444',
  },
  disableErrorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  disableActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  disableButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disableCancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  disableCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  disableConfirmButton: {
    backgroundColor: '#ef4444',
  },
  disableConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
