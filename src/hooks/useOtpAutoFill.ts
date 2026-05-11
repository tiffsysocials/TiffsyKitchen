import { useEffect, useRef } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

const { SmsUserConsent } = NativeModules as {
  SmsUserConsent?: {
    startListening: () => Promise<boolean>;
    stopListening: () => Promise<boolean>;
  };
};

interface Options {
  enabled: boolean;
  length?: number;
}

/**
 * Auto-read SMS OTP via Android's SMS User Consent API (no permission, one-tap).
 * No-op on iOS — iOS surfaces the OTP via the keyboard suggestion bar when the
 * OTP TextInput has `textContentType="oneTimeCode"`.
 */
export function useOtpAutoFill(
  onCode: (code: string) => void,
  { enabled, length = 6 }: Options,
): void {
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;

  useEffect(() => {
    if (Platform.OS !== 'android' || !enabled || !SmsUserConsent) return;

    const emitter = new NativeEventEmitter(NativeModules.SmsUserConsent);
    const digitPattern = new RegExp(`(\\d{${length}})`);

    const otpSub = emitter.addListener('SmsUserConsent_otpReceived', (smsBody: string) => {
      const match = digitPattern.exec(smsBody);
      if (match) onCodeRef.current(match[1]);
    });
    const errSub = emitter.addListener('SmsUserConsent_error', (msg: string) => {
      if (__DEV__) console.log('[SmsUserConsent]', msg);
    });

    SmsUserConsent.startListening().catch((e: any) => {
      if (__DEV__) console.log('[SmsUserConsent] startListening failed:', e?.message);
    });

    return () => {
      otpSub.remove();
      errSub.remove();
      SmsUserConsent.stopListening().catch(() => {});
    };
  }, [enabled, length]);
}
