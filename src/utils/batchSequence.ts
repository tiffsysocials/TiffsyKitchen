/**
 * Phase 10 — order-within-batch sorting.
 *
 * Every screen that lists the orders inside a batch should render them in
 * the OPTIMIZED delivery sequence (the order in which they'll actually be
 * delivered), not the order they were placed in.
 *
 * Source priority (matches BatchDetailScreen.seqOf):
 *   1. assignment.sequenceInBatch   — driver's live in-trip order
 *   2. batch.optimizedSequence      — route-optimizer output
 *   3. batch.deliverySequence       — fallback FIFO sequence
 *   4. Math.POSITIVE_INFINITY       — unknown stops sink to the end,
 *                                     keeping their input order via Array.sort stability
 */

type SequenceEntry = {
  orderId?: string | { toString(): string };
  sequenceNumber?: number;
};

type SequenceCarrier = {
  optimizedSequence?: SequenceEntry[];
  deliverySequence?: SequenceEntry[];
};

type AssignmentLike = {
  orderId?: string | { toString(): string };
  sequenceInBatch?: number;
};

type OrderLike = { _id: string };

const idStr = (v: any): string => (v == null ? '' : String(v));

export function getEffectiveSequenceNumber(
  orderId: string,
  batch: SequenceCarrier | null | undefined,
  assignments: AssignmentLike[] | null | undefined,
): number {
  const oid = idStr(orderId);
  const a = (assignments || []).find((x) => idStr(x.orderId) === oid);
  if (a?.sequenceInBatch != null) return a.sequenceInBatch;
  const opt = batch?.optimizedSequence?.find((s) => idStr(s.orderId) === oid);
  if (opt?.sequenceNumber != null) return opt.sequenceNumber;
  const del = batch?.deliverySequence?.find((s) => idStr(s.orderId) === oid);
  if (del?.sequenceNumber != null) return del.sequenceNumber;
  return Number.POSITIVE_INFINITY;
}

/**
 * Return a NEW array of orders sorted by effective delivery sequence.
 * Stable — ties keep input order. Orders with no sequence info land at
 * the end in input order.
 */
export function sortOrdersByDeliverySequence<T extends OrderLike>(
  orders: T[] | null | undefined,
  batch: SequenceCarrier | null | undefined,
  assignments: AssignmentLike[] | null | undefined,
): T[] {
  if (!orders?.length) return [];
  return [...orders]
    .map((o, i) => ({ o, i, seq: getEffectiveSequenceNumber(o._id, batch, assignments) }))
    .sort((a, b) => a.seq - b.seq || a.i - b.i)
    .map(({ o }) => o);
}
