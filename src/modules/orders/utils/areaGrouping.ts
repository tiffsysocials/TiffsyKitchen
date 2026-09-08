/**
 * Grouping orders by delivery area, then by company within that area.
 *
 * Kitchen and admin order lists are chronological by default, which means
 * packing one area involves scanning the whole list. These helpers group
 * orders into area sections so a run can be worked through one area at a
 * time — and, within an area, into sub-groups so two different companies
 * sharing that area (e.g. two corporate offices both in "Sinhasa") don't get
 * their orders mixed together.
 *
 * Why `deliveryAddress.locality` for the area key and not something that
 * sounds more official:
 *   - `matchedAreaName` / `matchedAreaId` exist on the order schema but are
 *     never written — 0% populated across production orders.
 *   - `deliveryZoneId` is populated (~92%) but almost every order resolves to a
 *     single "Default Zone", so it yields one giant group.
 *   - `deliveryAddress.pincode` is always present but lopsided — most orders
 *     share one pincode.
 *   - `deliveryAddress.locality` is 100% populated and carries the actual
 *     neighbourhood ("Agrawal Nagar", "Sinhasa", "Kanchan Bagh").
 *
 * Within an area, orders split by `corporateId` (or "Retail" when absent) —
 * but ONLY when the area actually mixes two or more sources. An area with
 * only retail orders, or only one company's orders, stays a flat list with
 * no sub-header; the nesting exists purely to disambiguate, e.g. Sinhasa
 * once both BEL and CastNX have orders landing there.
 */
import { Order } from '../../../types/api.types';

export const UNKNOWN_AREA_TITLE = 'Other';
const RETAIL_KEY = 'retail';
const CORPORATE_KEY_PREFIX = 'corporate:';

/** One company-or-retail slice within an area section. */
export interface OrderSubGroup {
  /** 'retail', or 'corporate:<id>' for a company. */
  key: string;
  /** Company name, or 'Retail'. */
  title: string;
  isCorporate: boolean;
  orders: Order[];
}

export interface OrderAreaSection {
  /** Normalised key used for grouping (lower-cased, whitespace-collapsed). */
  key: string;
  /** Human-facing name — the most common spelling seen for this area. */
  title: string;
  /** Every order in this area, flattened oldest-first (for the area's own count badge). */
  orders: Order[];
  /**
   * Company/retail sub-groups within this area. Length 1 means the area has
   * only one source — render as a flat list with no sub-header. Length 2+
   * means the area mixes sources — render each group under its own sub-header.
   */
  groups: OrderSubGroup[];
}

/** Collapse a locality to a stable grouping key, or empty string when absent. */
const normalise = (value?: string | null): string =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

const corporateOf = (order: Order) =>
  order?.corporateId && typeof order.corporateId === 'object' ? order.corporateId : null;

/**
 * `locality` is free text the customer types, so the same area arrives spelled
 * several ways — production has both "Jaora compound" and "Jaora Compound".
 * Grouping on the raw string would split them into two sections.
 */
const areaKeyOf = (order: Order): string =>
  normalise(order?.deliveryAddress?.locality).toLowerCase();

/** 'retail', or the corporate's stable id — used as the within-area sub-key. */
const subKeyOf = (order: Order): string => {
  const corporate = corporateOf(order);
  return corporate ? CORPORATE_KEY_PREFIX + corporate._id : RETAIL_KEY;
};

const placedTime = (order: Order): number => {
  const t = new Date(order?.placedAt ?? 0).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/**
 * Group orders into area sections, each internally split into company/retail
 * sub-groups.
 *
 * Areas sort busiest-first (largest run to pack at the top, ties broken
 * alphabetically for a stable order between refreshes), with an "Other"
 * section for orders with no locality pinned last. Within an area, company
 * sub-groups sort ahead of Retail (a company's orders are one office drop,
 * usually worth packing as a unit), alphabetically among themselves. Orders
 * inside a sub-group are oldest-first. Orders with no locality still collect
 * into "Other" rather than being dropped — the section counts always add up
 * to the input length.
 */
export const groupOrdersByArea = (orders: Order[]): OrderAreaSection[] => {
  const areaBuckets = new Map<string, { spellings: Map<string, number>; orders: Order[] }>();

  (orders ?? []).forEach(order => {
    const key = areaKeyOf(order);
    let bucket = areaBuckets.get(key);
    if (!bucket) {
      bucket = { spellings: new Map<string, number>(), orders: [] };
      areaBuckets.set(key, bucket);
    }
    if (key) {
      const spelling = normalise(order.deliveryAddress?.locality);
      bucket.spellings.set(spelling, (bucket.spellings.get(spelling) ?? 0) + 1);
    }
    bucket.orders.push(order);
  });

  const sections: OrderAreaSection[] = [];
  areaBuckets.forEach((bucket, key) => {
    // Display whichever spelling of this area appears most often.
    let title = UNKNOWN_AREA_TITLE;
    let best = 0;
    bucket.spellings.forEach((count, spelling) => {
      if (count > best) {
        best = count;
        title = spelling;
      }
    });

    // Second pass: split this area's orders by company/retail.
    const subBuckets = new Map<string, { title: string; isCorporate: boolean; orders: Order[] }>();
    bucket.orders.forEach(order => {
      const subKey = subKeyOf(order);
      let sub = subBuckets.get(subKey);
      if (!sub) {
        const corporate = corporateOf(order);
        sub = { title: corporate?.name ?? 'Retail', isCorporate: !!corporate, orders: [] };
        subBuckets.set(subKey, sub);
      }
      sub.orders.push(order);
    });

    const groups: OrderSubGroup[] = [...subBuckets.entries()]
      .map(([subKey, sub]) => ({
        key: subKey,
        title: sub.title,
        isCorporate: sub.isCorporate,
        orders: [...sub.orders].sort((a, b) => placedTime(a) - placedTime(b)),
      }))
      .sort((a, b) => {
        // Companies ahead of Retail, alphabetical among companies.
        if (a.isCorporate !== b.isCorporate) return a.isCorporate ? -1 : 1;
        return a.title.localeCompare(b.title);
      });

    sections.push({
      key: key || UNKNOWN_AREA_TITLE,
      title,
      orders: [...bucket.orders].sort((a, b) => placedTime(a) - placedTime(b)),
      groups,
    });
  });

  return sections.sort((a, b) => {
    // "Other" always last, whatever its size.
    const aUnknown = a.key === UNKNOWN_AREA_TITLE;
    const bUnknown = b.key === UNKNOWN_AREA_TITLE;
    if (aUnknown !== bUnknown) return aUnknown ? 1 : -1;
    if (b.orders.length !== a.orders.length) return b.orders.length - a.orders.length;
    return a.title.localeCompare(b.title);
  });
};
