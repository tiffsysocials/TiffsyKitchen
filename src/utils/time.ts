/**
 * Time utility helpers for "HH:MM" 24-hour strings used across operating-hours
 * forms (kitchens, cutoff settings, etc.). Originally lived in
 * src/modules/cutoff/models/types.ts and re-exported from there.
 */

export interface TimeValue {
  /** 0-23 */
  hours: number;
  /** 0-59 */
  minutes: number;
}

export const parseTimeString = (timeStr: string): TimeValue => {
  const [hours, minutes] = (timeStr || '').split(':').map(Number);
  return { hours: hours || 0, minutes: minutes || 0 };
};

export const formatTimeToString = (time: TimeValue): string =>
  `${time.hours.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}`;

export const formatTimeToDisplay = (time: TimeValue): string => {
  const hours12 = time.hours % 12 || 12;
  const period = time.hours >= 12 ? 'PM' : 'AM';
  return `${hours12.toString().padStart(2, '0')}:${time.minutes
    .toString()
    .padStart(2, '0')} ${period}`;
};

export const timeToMinutes = (time: TimeValue): number => time.hours * 60 + time.minutes;

/** -1 if a < b, 0 if equal, 1 if a > b */
export const compareTimes = (a: TimeValue, b: TimeValue): number => {
  const aM = timeToMinutes(a);
  const bM = timeToMinutes(b);
  if (aM < bM) return -1;
  if (aM > bM) return 1;
  return 0;
};
