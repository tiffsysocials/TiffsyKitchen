// src/services/appUpdate.service.ts
//
// Force / soft update gate for the KITCHEN/ADMIN app. On launch (and on resume)
// it asks the backend for the minimum required version for this platform + app,
// compares it against its own installed versionName, and decides whether to show
// a blocking ("required") or dismissible ("available") update modal.
//
// FAIL-OPEN: any network/parse error resolves to { status: 'none' } so a backend
// outage can never lock the kitchen out of the app.

import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { BASE_URL } from '../config/env';

export type UpdateStatus = 'none' | 'available' | 'required';

export interface UpdateCheckResult {
  status: UpdateStatus;
  message: string;
  storeUrl: string;
  installedVersion: string;
  latestVersion: string;
}

const NO_UPDATE: UpdateCheckResult = {
  status: 'none',
  message: '',
  storeUrl: '',
  installedVersion: '',
  latestVersion: '',
};

/** Compare dotted numeric version strings ("1.0.7" vs "1.0.8"). -1 / 0 / 1. */
export function compareSemver(a: string, b: string): number {
  const parse = (v: string): number[] =>
    String(v || '0').split('.').map((p) => parseInt(p, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

export function getInstalledVersion(): string {
  try {
    return DeviceInfo.getVersion();
  } catch {
    return '';
  }
}

/**
 * Ask the backend whether this kitchen install must / should update.
 * Never throws — returns { status: 'none' } on any failure (fail-open).
 */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  try {
    const platform: 'android' | 'ios' = Platform.OS === 'ios' ? 'ios' : 'android';
    const installed = getInstalledVersion();
    if (!installed) return NO_UPDATE;

    const res = await fetch(
      `${BASE_URL}/api/app/config?platform=${platform}&app=kitchen`,
      { method: 'GET' },
    );
    if (!res.ok) return NO_UPDATE;
    const body = await res.json();
    const cfg = body?.data;
    if (!cfg || !cfg.minVersion || !cfg.latestVersion) return NO_UPDATE;

    const belowMin = compareSemver(installed, cfg.minVersion) < 0;
    const belowLatest = compareSemver(installed, cfg.latestVersion) < 0;

    if (belowMin && cfg.forceUpdate) {
      return {
        status: 'required',
        message: cfg.message || 'A new version is required to continue.',
        storeUrl: cfg.storeUrl || '',
        installedVersion: installed,
        latestVersion: cfg.latestVersion,
      };
    }
    if (belowLatest) {
      return {
        status: 'available',
        message: cfg.message || 'A new version is available.',
        storeUrl: cfg.storeUrl || '',
        installedVersion: installed,
        latestVersion: cfg.latestVersion,
      };
    }
    return NO_UPDATE;
  } catch (error: any) {
    console.log('[appUpdate] checkForUpdate failed (fail-open):', error?.message);
    return NO_UPDATE;
  }
}

export default { checkForUpdate, compareSemver, getInstalledVersion };
