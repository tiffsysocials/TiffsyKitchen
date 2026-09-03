/**
 * Grouping orders by delivery area.
 *
 * Kitchen and admin order lists are chronological by default, which means
 * packing one area involves scanning the whole list. These helpers group orders
 * into area sections so a run can be worked through one area at a time.
 *
 * Why `deliveryAddress.locality` and not something that sounds more official:
 *   - `matchedAreaName` / `matchedAreaId` exist on the order schema but are
 *     never written — 0% populated across production orders.
 *   - `deliveryZoneId` is populated (~92%) but almost every order resolves to a
 *     single "Default Zone", so it yields one giant group.
 *   - `deliveryAddress.pincode` is always present but lopsided — most orders
 *     share one pincode.
 *   - `deliveryAddress.locality` is 100% populated and carries the actual
 *     neighbourhood ("Agrawal Nagar", "Sinhasa", "Kanchan Bagh").
 */
import { Order } from '../../../types/api.types';

export const UNKNOWN_AREA_TITLE = 'Other';

export interface OrderAreaSection {
  /** Normalised key used for grouping (lower-cased, whitespace-collapsed). */
  key: string;
  /** Human-facing name — the most common spelling seen for this area. */
  title: string;
  orders: Order[];
}

/** Collapse a locality to a stable grouping key, or '' when absent. */
const normalise = (value?: string | null): string =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

/**
 * `locality` is free text the customer types, so the same area arrives spelled
 * several ways — production has both "Jaora compound" and "Jaora Compound".
 * Grouping on the raw string would split them into two sections.
 */
export const areaKeyOf = (order: Order): string =>
  normalise(order?.deliveryAddress?.locality).toLowerCase();

const placedTime = (order: Order): number => {
  const t = new Date(order?.placedAt ?? 0).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/**
 * Group orders into area sections.
 *
 * Sections are ordered busiest-first so the largest run to pack is at the top,
 * with ties broken alphabetically for a stable order between refreshes. Orders
 * inside a section are oldest-first, so the longest-waiting order comes first.
 *
 * Orders with no locality collect into an "Other" section pinned last rather
 * than being dropped — the section counts always add up to the input length.
 */
export const groupOrdersByArea = (orders: Order[]): OrderAreaSection[] => {
  const buckets = new Map<string, { spellings: Map<string, number>; orders: Order[] }>();

  (orders ?? []).forEach(order => {
    const key = areaKeyOf(order);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { spellings: new Map<string, number>(), orders: [] };
      buckets.set(key, bucket);
    }
    if (key) {
      const spelling = normalise(order.deliveryAddress?.locality);
      bucket.spellings.set(spelling, (bucket.spellings.get(spelling) ?? 0) + 1);
    }
    bucket.orders.push(order);
  });

  const sections: OrderAreaSection[] = [];
  buckets.forEach((bucket, key) => {
    // Display whichever spelling of this area appears most often.
    let title = UNKNOWN_AREA_TITLE;
    let best = 0;
    bucket.spellings.forEach((count, spelling) => {
      if (count > best) {
        best = count;
        title = spelling;
      }
    });
    sections.push({
      key: key || UNKNOWN_AREA_TITLE,
      title,
      orders: [...bucket.orders].sort((a, b) => placedTime(a) - placedTime(b)),
    });
  });

  return sections.sort((a, b) => {
    // "Other" sits last regardless of size.
    const aUnknown = a.key === UNKNOWN_AREA_TITLE;
    const bUnknown = b.key === UNKNOWN_AREA_TITLE;
    if (aUnknown !== bUnknown) return aUnknown ? 1 : -1;
    if (b.orders.length !== a.orders.length) return b.orders.length - a.orders.length;
    return a.title.localeCompare(b.title);
  });
};
