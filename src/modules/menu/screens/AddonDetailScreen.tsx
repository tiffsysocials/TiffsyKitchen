import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { GradientBox } from '../../../components/common/GradientBox';
import { useAlert } from '../../../hooks/useAlert';
import { addonService } from '../../../services/addon.service';
import { Addon, DietaryType, CreateAddonRequest, AddonImageFile } from '../../../types/api.types';

// Lazy-load react-native-image-picker (matches BannerFormModal pattern)
let launchImageLibrary: any = null;
try {
  const picker = require('react-native-image-picker');
  launchImageLibrary = picker.launchImageLibrary;
} catch {
  // Library not installed — user will see install prompt on tap
}

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

interface AddonDetailScreenProps {
  addonId?: string;
  kitchenId: string;
  onBack: () => void;
  onSaved: () => void;
}

export const AddonDetailScreen: React.FC<AddonDetailScreenProps> = ({
  addonId,
  kitchenId,
  onBack,
  onSaved,
}) => {
  const { showSuccess, showError, showWarning, showInfo, showConfirm } = useAlert();
  const isEditMode = !!addonId;

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [addon, setAddon] = useState<Addon | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [dietaryType, setDietaryType] = useState<DietaryType>('VEG');
  const [minQuantity, setMinQuantity] = useState('0');
  const [maxQuantity, setMaxQuantity] = useState('10');
  const [displayOrder, setDisplayOrder] = useState('1');
  const [selectedImage, setSelectedImage] = useState<AddonImageFile | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | undefined>(undefined);
  const [imageSizeWarning, setImageSizeWarning] = useState(false);

  useEffect(() => {
    if (isEditMode && addonId) {
      loadAddon();
    }
  }, [addonId]);

  const loadAddon = async () => {
    try {
      const response = await addonService.getAddonById(addonId!);
      const loadedAddon = response.addon;

      setAddon(loadedAddon);
      setName(loadedAddon.name);
      setDescription(loadedAddon.description || '');
      setPrice(String(loadedAddon.price));
      setDietaryType(loadedAddon.dietaryType);
      setMinQuantity(String(loadedAddon.minQuantity));
      setMaxQuantity(String(loadedAddon.maxQuantity));
      setDisplayOrder(String(loadedAddon.displayOrder));
      setExistingImageUrl(loadedAddon.image);
    } catch (error) {
      console.error('Error loading addon:', error);
      showError('Error', 'Failed to load add-on');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = () => {
    if (!launchImageLibrary) {
      Alert.alert(
        'Library Required',
        'Install react-native-image-picker to enable image uploads:\n\nnpm install react-native-image-picker',
      );
      return;
    }

    launchImageLibrary(
      { mediaType: 'photo', quality: 0.9, includeBase64: false },
      (response: any) => {
        if (response.didCancel || response.errorCode) return;

        const asset = response.assets?.[0];
        if (!asset) return;

        const oversized = (asset.fileSize ?? 0) > MAX_IMAGE_SIZE_BYTES;
        setImageSizeWarning(oversized);

        setSelectedImage({
          uri: asset.uri ?? '',
          name: asset.fileName ?? `addon_${Date.now()}.jpg`,
          type: asset.type ?? 'image/jpeg',
        });
      },
    );
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

    const min = Number(minQuantity);
    const max = Number(maxQuantity);

    if (isNaN(min) || min < 0) {
      showWarning('Validation Error', 'Min quantity must be 0 or greater');
      return false;
    }

    if (isNaN(max) || max < 1) {
      showWarning('Validation Error', 'Max quantity must be at least 1');
      return false;
    }

    if (min > max) {
      showWarning('Validation Error', 'Min quantity cannot exceed max quantity');
      return false;
    }

    if (imageSizeWarning) {
      showWarning('Validation Error', 'Image exceeds 2 MB limit. Please choose a smaller file.');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const data: CreateAddonRequest = {
        kitchenId,
        name: name.trim(),
        description: description.trim() || undefined,
        price: Number(price),
        dietaryType,
        minQuantity: Number(minQuantity),
        maxQuantity: Number(maxQuantity),
        isAvailable: true,
        displayOrder: Number(displayOrder),
        imageFile: selectedImage ?? undefined,
      };

      if (isEditMode && addonId) {
        await addonService.updateAddon(addonId, data);
        showSuccess('Success', 'Add-on updated successfully', () => {
          onSaved();
          onBack();
        });
      } else {
        await addonService.createAddon(data);
        showSuccess('Success', 'Add-on created successfully', () => {
          onSaved();
          onBack();
        });
      }
    } catch (error: any) {
      console.error('Error saving addon:', error);
      showError('Error', error.message || 'Failed to save add-on');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (addon?.menuItemCount && addon.menuItemCount > 0) {
      showInfo(
        'Cannot Delete',
        `This add-on is used in ${addon.menuItemCount} menu item${addon.menuItemCount > 1 ? 's' : ''}. Remove it from all menu items first.`
      );
      return;
    }

    showConfirm(
      'Delete Add-on',
      'Are you sure you want to delete this add-on?',
      async () => {
        try {
          await addonService.deleteAddon(addonId!);
          showSuccess('Success', 'Add-on deleted', () => {
            onSaved();
            onBack();
          });
        } catch (error) {
          showError('Error', 'Failed to delete add-on');
        }
      },
      undefined,
      { confirmText: 'Delete', cancelText: 'Cancel', isDestructive: true }
    );
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
        <Text style={styles.headerTitle}>{isEditMode ? 'Edit Add-on' : 'Create Add-on'}</Text>
        <View style={styles.headerPlaceholder} />
      </GradientBox>

      <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
        {/* Image Picker */}
        <View style={styles.field}>
          <Text style={styles.label}>Photo</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage} activeOpacity={0.8}>
            {selectedImage?.uri || existingImageUrl ? (
              <Image
                source={{ uri: selectedImage?.uri || existingImageUrl! }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Icon name="add-photo-alternate" size={40} color="#FE8733" />
                <Text style={styles.imagePlaceholderText}>Tap to add a photo</Text>
                <Text style={styles.imageDimHint}>Recommended: square image (1:1)</Text>
              </View>
            )}
          </TouchableOpacity>
          {(selectedImage?.uri || existingImageUrl) && (
            <TouchableOpacity style={styles.changeImageBtn} onPress={handlePickImage}>
              <Icon name="swap-horiz" size={16} color="#FE8733" />
              <Text style={styles.changeImageText}>
                {existingImageUrl && !selectedImage ? 'Replace photo' : 'Change photo'}
              </Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.hint, imageSizeWarning && styles.hintWarning]}>
            {imageSizeWarning
              ? '⚠️ File exceeds 2 MB limit — please choose a smaller image.'
              : 'Max file size: 2 MB · Images only'}
          </Text>
        </View>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Extra Roti"
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Optional description"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Price */}
        <View style={styles.field}>
          <Text style={styles.label}>Price (₹) *</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="0"
            keyboardType="numeric"
          />
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

        {/* Quantity Limits */}
        <View style={styles.row}>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Min Quantity</Text>
            <TextInput
              style={styles.input}
              value={minQuantity}
              onChangeText={setMinQuantity}
              placeholder="0"
              keyboardType="numeric"
            />
            <Text style={styles.hint}>Minimum number customer can order</Text>
          </View>

          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Max Quantity</Text>
            <TextInput
              style={styles.input}
              value={maxQuantity}
              onChangeText={setMaxQuantity}
              placeholder="10"
              keyboardType="numeric"
            />
            <Text style={styles.hint}>Maximum number customer can order</Text>
          </View>
        </View>

        {/* Display Order */}
        <View style={styles.field}>
          <Text style={styles.label}>Display Order</Text>
          <TextInput
            style={styles.input}
            value={displayOrder}
            onChangeText={setDisplayOrder}
            placeholder="1"
            keyboardType="numeric"
          />
          <Text style={styles.hint}>Lower numbers appear first</Text>
        </View>

        {/* Usage Info (Edit mode only) */}
        {isEditMode && addon && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Usage Information</Text>
            <Text style={styles.infoText}>
              This add-on is used in <Text style={styles.infoBold}>{addon.menuItemCount || 0}</Text> menu item{addon.menuItemCount !== 1 ? 's' : ''}
            </Text>
            {addon.menuItemCount && addon.menuItemCount > 0 && (
              <Text style={styles.infoWarning}>
                Remove from all menu items before deleting
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {isEditMode && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEditMode ? 'Save Changes' : 'Create Add-on'}
            </Text>
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
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  hintWarning: {
    color: '#d97706',
    fontWeight: '500',
  },
  imagePicker: {
    borderWidth: 2,
    borderColor: 'rgba(254, 135, 51, 0.35)',
    borderStyle: 'dashed',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff7ed',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 1,
  },
  imagePlaceholder: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 4,
    fontSize: 14,
    color: '#FE8733',
    fontWeight: '600',
  },
  imageDimHint: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  changeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingVertical: 6,
  },
  changeImageText: {
    fontSize: 13,
    color: '#FE8733',
    marginLeft: 4,
    fontWeight: '500',
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
  infoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#3b82f6',
  },
  infoBold: {
    fontWeight: '700',
  },
  infoWarning: {
    fontSize: 12,
    color: '#FE8733',
    marginTop: 4,
    fontStyle: 'italic',
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
    backgroundColor: '#FE8733',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
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
