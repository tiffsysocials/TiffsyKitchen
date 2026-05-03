import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAlert } from '../../hooks/useAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaScreen } from '../../components/common/SafeAreaScreen';
import { authService } from '../../services/auth.service';

const PRIMARY_COLOR = '#FE8733';

interface PhoneAuthScreenProps {
  onVerificationComplete: (data: { token: string; user: any; role: string; isNewUser: boolean; kitchenApprovalStatus?: string; phone: string }) => void;
}

const PhoneAuthScreen: React.FC<PhoneAuthScreenProps> = ({ onVerificationComplete }) => {
  const otpInputRefs = useRef<Array<TextInput | null>>([]);
  const { showSuccess } = useAlert();

  // State management
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [otpError, setOtpError] = useState<string | undefined>();

  // Validate Indian phone number
  const validateIndianPhoneNumber = (number: string): boolean => {
    // Remove any spaces or special characters
    const cleanNumber = number.replace(/\s+/g, '');

    // Indian phone numbers should be 10 digits and start with 6-9
    const indianPhoneRegex = /^[6-9]\d{9}$/;

    return indianPhoneRegex.test(cleanNumber);
  };

  // Handle phone number change
  const handlePhoneChange = (text: string) => {
    // Only allow digits
    const cleaned = text.replace(/\D/g, '');
    setPhoneNumber(cleaned);

    // Clear error when user types
    if (phoneError) {
      setPhoneError(undefined);
    }
  };

  // Send OTP via backend (MSG91)
  const handleSendOtp = async () => {
    if (!phoneNumber.trim()) {
      setPhoneError('Phone number is required');
      return;
    }

    if (!validateIndianPhoneNumber(phoneNumber)) {
      setPhoneError('Please enter a valid 10-digit Indian phone number');
      return;
    }

    setIsSubmitting(true);
    setPhoneError(undefined);

    try {
      console.log('========== SEND OTP REQUEST ==========');
      console.log('Phone Number:', phoneNumber);
      console.log('==========================================');

      await authService.sendOTP(phoneNumber);

      setShowOtpInput(true);
      showSuccess('Success', 'OTP has been sent to your phone number');
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      setPhoneError(error.message || 'Failed to send OTP. Please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle OTP input change
  const handleOtpChange = (text: string, index: number) => {
    // Only allow digits
    const cleaned = text.replace(/\D/g, '');

    if (cleaned.length === 0) {
      // Handle backspace
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);

      // Move to previous input
      if (index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (cleaned.length === 1) {
      // Single digit input
      const newOtp = [...otp];
      newOtp[index] = cleaned;
      setOtp(newOtp);

      // Move to next input
      if (index < 5) {
        otpInputRefs.current[index + 1]?.focus();
      }
    } else if (cleaned.length === 6 && index === 0) {
      // Handle paste of complete OTP
      const otpArray = cleaned.split('').slice(0, 6);
      setOtp(otpArray);
      otpInputRefs.current[5]?.focus();
    }

    // Clear error when user types
    if (otpError) {
      setOtpError(undefined);
    }
  };

  // Handle OTP key press
  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Verify OTP via backend (MSG91)
  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      setOtpError('Please enter the complete 6-digit OTP');
      return;
    }

    setIsSubmitting(true);
    setOtpError(undefined);

    try {
      console.log('========== VERIFY OTP REQUEST ==========');
      console.log('Phone:', phoneNumber);
      console.log('==========================================');

      const response = await authService.verifyOTP(phoneNumber, otpCode);
      const { token, user, isNewUser } = response.data || {};

      console.log('========== VERIFY OTP RESPONSE ==========');
      console.log('Is New User:', isNewUser);
      console.log('User Role:', user?.role);
      console.log('==========================================');

      // Store phone number for later use
      await AsyncStorage.setItem('userPhoneNumber', phoneNumber);

      // Pass verification result to parent
      onVerificationComplete({
        token: token || response.data?.registrationToken || '',
        user,
        role: user?.role || '',
        isNewUser: isNewUser || false,
        kitchenApprovalStatus: response.data?.kitchenApprovalStatus,
        phone: phoneNumber,
      });
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      setOtpError(error.message || 'Failed to verify OTP. Please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP via backend
  const handleResendOtp = async () => {
    setOtp(['', '', '', '', '', '']);
    setOtpError(undefined);
    try {
      await authService.sendOTP(phoneNumber);
      showSuccess('Success', 'OTP resent successfully');
    } catch (error: any) {
      setOtpError(error.message || 'Failed to resend OTP');
    }
  };

  const isPhoneValid = validateIndianPhoneNumber(phoneNumber);
  const isOtpComplete = otp.every(digit => digit !== '');

  return (
    <SafeAreaScreen style={styles.container} backgroundColor={PRIMARY_COLOR}>
      <View style={styles.contentContainer}>
        {/* Login Card */}
        <View style={styles.card}>
          {/* Logo / Brand */}
          <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
              <Icon name="restaurant" size={40} color={PRIMARY_COLOR} />
            </View>
            <Text style={styles.brandText}>Tiffsy Kitchen</Text>
          </View>

          {/* Title & Subtitle */}
          <View style={styles.titleContainer}>
            {showOtpInput && <Text style={styles.title}>Verify OTP</Text>}
            <Text style={styles.subtitle}>
              {showOtpInput
                ? `Enter the 6-digit code sent to +91 ${phoneNumber}`
                : 'Enter your phone number to continue'}
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {!showOtpInput ? (
              // Phone Number Input
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Phone Number</Text>
                <View
                  style={[
                    styles.phoneInputWrapper,
                    phoneError ? styles.inputError : null,
                  ]}
                >
                  <View style={styles.countryCodeContainer}>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="Enter 10-digit phone number"
                    placeholderTextColor="#9ca3af"
                    value={phoneNumber}
                    onChangeText={handlePhoneChange}
                    keyboardType="phone-pad"
                    maxLength={10}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSendOtp}
                    editable={!isSubmitting}
                    accessibilityLabel="Phone number input"
                  />
                </View>
                {phoneError && (
                  <Text style={styles.errorText}>{phoneError}</Text>
                )}
                <Text style={styles.helperText}>
                  We'll send a verification code to this number
                </Text>
              </View>
            ) : (
              // OTP Input
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Enter OTP</Text>
                <View style={styles.otpContainer}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => (otpInputRefs.current[index] = ref)}
                      style={[
                        styles.otpInput,
                        otpError ? styles.otpInputError : null,
                        digit !== '' ? styles.otpInputFilled : null,
                      ]}
                      value={digit}
                      onChangeText={(text) => handleOtpChange(text, index)}
                      onKeyPress={(e) => handleOtpKeyPress(e, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                      editable={!isSubmitting}
                      accessibilityLabel={`OTP digit ${index + 1}`}
                    />
                  ))}
                </View>
                {otpError && (
                  <Text style={styles.errorText}>{otpError}</Text>
                )}

                {/* Resend OTP */}
                <TouchableOpacity
                  style={styles.resendContainer}
                  onPress={handleResendOtp}
                  disabled={isSubmitting}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.resendText}>Didn't receive the code? </Text>
                  <Text style={styles.resendLink}>Resend OTP</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                ((!isPhoneValid && !showOtpInput) ||
                  (!isOtpComplete && showOtpInput) ||
                  isSubmitting) &&
                styles.actionButtonDisabled,
              ]}
              onPress={showOtpInput ? handleVerifyOtp : handleSendOtp}
              disabled={
                (!isPhoneValid && !showOtpInput) ||
                (!isOtpComplete && showOtpInput) ||
                isSubmitting
              }
              activeOpacity={0.8}
              accessibilityLabel={showOtpInput ? 'Verify OTP' : 'Send OTP'}
              accessibilityRole="button"
            >
              {isSubmitting ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>
                    {showOtpInput ? 'Verifying...' : 'Sending...'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.actionButtonText}>
                  {showOtpInput ? 'Verify OTP' : 'Send OTP'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Back Button (when showing OTP input) */}
            {showOtpInput && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  setShowOtpInput(false);
                  setOtp(['', '', '', '', '', '']);
                  setOtpError(undefined);
                }}
                disabled={isSubmitting}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Icon name="arrow-back" size={18} color={PRIMARY_COLOR} />
                <Text style={styles.backButtonText}>Change Phone Number</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © Tiffsy Kitchen
          </Text>
        </View>
      </View>
    </SafeAreaScreen>
  );
};

PhoneAuthScreen.displayName = 'PhoneAuthScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIMARY_COLOR,
  },

  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },

  logoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  brandText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },

  titleContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },

  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 10,
  },

  formContainer: {
    // Using marginBottom on children
  },

  fieldContainer: {
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },

  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    overflow: 'hidden',
  },

  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },

  countryCodeContainer: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#f3f4f6',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },

  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },

  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
  },

  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
    marginLeft: 4,
  },

  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 6,
    marginLeft: 4,
  },

  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  otpInput: {
    width: 48,
    height: 56,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1f2937',
  },

  otpInputFilled: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: '#fff7ed',
  },

  otpInputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },

  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    minHeight: 44,
  },

  resendText: {
    fontSize: 14,
    color: '#6b7280',
  },

  resendLink: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },

  actionButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 50,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  actionButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },

  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    minHeight: 44,
  },

  backButtonText: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: '500',
    marginLeft: 6,
  },

  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingBottom: 16,
  },

  footerText: {
    fontSize: 12,
    color: '#ffffff',
  },
});

export { PhoneAuthScreen };
export default PhoneAuthScreen;
