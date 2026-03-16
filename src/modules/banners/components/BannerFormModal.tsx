/**
 * BannerFormModal
 *
 * Used for both creating a new banner (Upload) and editing an existing one.
 * Image selection uses react-native-image-picker.
 * Install with: npm install react-native-image-picker
 * Then run: cd android && ./gradlew clean
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { Banner, CreateBannerRequest, UpdateBannerRequest } from '../../../services/banner.service';

// ─── react-native-image-picker (install if not present) ──────────────────────
// npm install react-native-image-picker
let launchImageLibrary: any = null;
try {
  const picker = require('react-native-image-picker');
  launchImageLibrary = picker.launchImageLibrary;
} catch {
  // Library not installed — image picker will show install prompt
}
// ─────────────────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

interface SelectedImage {
  uri: string;
  name: string;
  type: string;
  fileSize?: number;
}

interface BannerFormModalProps {
  visible: boolean;
  banner: Banner | null; // null = create, non-null = edit
  onClose: () => void;
  onSave: (request: CreateBannerRequest | UpdateBannerRequest, isEdit: boolean) => Promise<void>;
}

export const BannerFormModal: React.FC<BannerFormModalProps> = ({
  visible,
  banner,
  onClose,
  onSave,
}) => {
  const isEdit = banner !== null;

  // Form state
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [title, setTitle] = useState('');
  const [redirectLink, setRedirectLink] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileSizeWarning, setFileSizeWarning] = useState(false);

  // Pre-fill when editing
  useEffect(() => {
    if (visible) {
      if (banner) {
        setTitle(banner.title ?? '');
        setRedirectLink(banner.redirect_link ?? '');
        setDisplayOrder(String(banner.display_order));
        setIsActive(banner.status === 'active');
        setSelectedImage(null);
      } else {
        setTitle('');
        setRedirectLink('');
        setDisplayOrder('0');
        setIsActive(true);
        setSelectedImage(null);
      }
      setError(null);
      setFileSizeWarning(false);
    }
  }, [visible, banner]);

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

        const oversized = (asset.fileSize ?? 0) > MAX_FILE_SIZE_BYTES;
        setFileSizeWarning(oversized);

        setSelectedImage({
          uri: asset.uri ?? '',
          name: asset.fileName ?? `banner_${Date.now()}.jpg`,
          type: asset.type ?? 'image/jpeg',
          fileSize: asset.fileSize,
        });
      },
    );
  };

  const handleSubmit = async () => {
    setError(null);

    if (!isEdit && !selectedImage) {
      setError('Please select an image to upload.');
      return;
    }

    if (fileSizeWarning) {
      setError('Image exceeds 2 MB limit. Please choose a smaller file.');
      return;
    }

    const orderNum = parseInt(displayOrder, 10);
    if (isNaN(orderNum) || orderNum < 0) {
      setError('Display order must be a non-negative number.');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        const request: UpdateBannerRequest = {
          ...(selectedImage ? { file: selectedImage } : {}),
          title: title.trim() || undefined,
          redirect_link: redirectLink.trim() || undefined,
          display_order: orderNum,
          status: isActive ? 'active' : 'inactive',
        };
        await onSave(request, true);
      } else {
        const request: CreateBannerRequest = {
          file: selectedImage!,
          title: title.trim() || undefined,
          redirect_link: redirectLink.trim() || undefined,
          display_order: orderNum,
          status: isActive ? 'active' : 'inactive',
        };
        await onSave(request, false);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  // Derive the image preview source
  const previewUri = selectedImage?.uri ?? (isEdit ? banner?.image_url : null);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isEdit ? 'Edit Banner' : 'Upload Banner'}
            </Text>
            <TouchableOpacity onPress={onClose} disabled={saving}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* ── Image Picker ── */}
            <Text style={styles.label}>Banner Image {!isEdit && <Text style={styles.required}>*</Text>}</Text>

            <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage} activeOpacity={0.8}>
              {previewUri ? (
                <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="cover" />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Icon name="add-photo-alternate" size={40} color={colors.primary} />
                  <Text style={styles.imagePlaceholderText}>Tap to browse image</Text>
                  <Text style={styles.imageDimHint}>Recommended: 1200 × 400 px (3:1)</Text>
                </View>
              )}
            </TouchableOpacity>

            {previewUri && (
              <TouchableOpacity style={styles.changeImageBtn} onPress={handlePickImage}>
                <Icon name="swap-horiz" size={16} color={colors.primary} />
                <Text style={styles.changeImageText}>
                  {isEdit ? 'Replace image' : 'Change image'}
                </Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.hint, fileSizeWarning && styles.hintWarning]}>
              {fileSizeWarning
                ? '⚠️ File exceeds 2 MB limit — please choose a smaller image.'
                : 'Max file size: 2 MB  ·  Accepts images only'}
            </Text>

            {/* ── Title ── */}
            <Text style={styles.label}>Title <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Hot & Healthy Meals"
              placeholderTextColor={colors.textMuted}
              maxLength={100}
              editable={!saving}
            />
            <Text style={styles.charCount}>{title.length}/100</Text>

            {/* ── Redirect Link ── */}
            <Text style={styles.label}>Redirect Link <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              value={redirectLink}
              onChangeText={setRedirectLink}
              placeholder="e.g. /menu, /offers"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
            />

            {/* ── Display Order ── */}
            <Text style={styles.label}>Display Order <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              value={displayOrder}
              onChangeText={setDisplayOrder}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              editable={!saving}
            />
            <Text style={styles.hint}>0 = shown first in the home slider</Text>

            {/* ── Status Toggle ── */}
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.label}>Status</Text>
                <Text style={styles.hint}>
                  {isActive ? 'Banner is visible on home screen' : 'Banner is hidden from home screen'}
                </Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: colors.gray300, true: colors.success + '66' }}
                thumbColor={isActive ? colors.success : colors.gray400}
                disabled={saving}
              />
            </View>

            {/* ── Error ── */}
            {error && (
              <View style={styles.errorBox}>
                <Icon name="error-outline" size={16} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* ── Submit ── */}
            <TouchableOpacity
              style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name={isEdit ? 'save' : 'cloud-upload'} size={20} color="#fff" />
                  <Text style={styles.submitText}>
                    {isEdit ? 'Save Changes' : 'Upload Banner'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: spacing.xl }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  body: {
    padding: spacing.lg,
  },

  // Image picker
  imagePicker: {
    borderWidth: 2,
    borderColor: colors.primary + '55',
    borderStyle: 'dashed',
    borderRadius: spacing.borderRadiusMd,
    overflow: 'hidden',
    backgroundColor: colors.primaryLight ?? '#fff7ed',
    marginBottom: spacing.sm,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 3,
  },
  imagePlaceholder: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  imageDimHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  changeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  changeImageText: {
    fontSize: 13,
    color: colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },

  // Labels / hints
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.error,
  },
  optional: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  hintWarning: {
    color: '#d97706',
    fontWeight: '500',
  },
  charCount: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },

  // Inputs
  input: {
    borderWidth: 1,
    borderColor: colors.gray200 ?? '#e5e7eb',
    borderRadius: spacing.borderRadiusMd,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: '#fafafa',
  },

  // Status toggle
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray100 ?? '#f3f4f6',
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: spacing.borderRadiusMd,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.error,
  },

  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadiusMd,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
