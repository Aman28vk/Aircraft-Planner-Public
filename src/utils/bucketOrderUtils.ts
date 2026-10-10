import { ProjectBucket } from '../types';

/**
 * Safely extracts the numeric order from a ProjectBucket.
 * Prioritizes display_order, falls back to bucket_number.
 * Handles strings, null, undefined, and NaN safely.
 * Returns 999999 if no valid numeric order is found so un-ordered items sort to the end.
 */
export function getProjectBucketNumericOrder(bucket: Partial<ProjectBucket> | null | undefined): number {
  if (!bucket) return 999999;
  const raw = (bucket as any).display_order ?? (bucket as any).bucket_number;
  if (raw === undefined || raw === null || raw === '') return 999999;
  const num = Number(raw);
  return isNaN(num) ? 999999 : num;
}

/**
 * Strict numeric comparator for ProjectBuckets.
 * Sorts strictly by saved numeric order (1, 2, 3, 4, etc.), NOT by creation date,
 * bucket ID, database insertion order, or alphabetically.
 *
 * Guarantees Order 4 appears in the 4th position, after Order 1, 2, and 3.
 * Safely handles missing orders and duplicate orders using deterministic tie-breakers.
 */
export function compareProjectBucketsByOrder(a: ProjectBucket, b: ProjectBucket): number {
  const orderA = getProjectBucketNumericOrder(a);
  const orderB = getProjectBucketNumericOrder(b);

  if (orderA !== orderB) {
    return orderA - orderB;
  }

  // Deterministic tie-breaker for duplicates: created_at ascending, then ID
  const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
  const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
  if (dateA !== dateB) {
    return dateA - dateB;
  }

  return (a.id || '').localeCompare(b.id || '');
}
