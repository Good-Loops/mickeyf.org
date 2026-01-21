/**
 * Groups items into two arrays based on index parity.
 *
 * Useful for simple partitioning patterns in the UI (e.g. splitting into two columns or alternating
 * assignment). Parity is determined from each item's `index` field (not from the item value).
 */

/**
 * Minimal shape required for parity grouping.
 */
export type WithIndex = { index: number };

/**
 * Partitions `items` into even/odd groups using `item.index % 2`.
 *
 * Ordering guarantee: relative order is preserved within each group.
 *
 * @param items - Input items to partition.
 * @returns `{ even, odd }`, where `even` contains items with even `index` and `odd` contains items
 * with odd `index`.
 */
export function groupByParity<T extends WithIndex>(
  items: readonly T[]
): { even: T[]; odd: T[] } {
    const even: T[] = [];
    const odd: T[] = [];

	for (const item of items) {
		(item.index % 2 === 0 ? even : odd).push(item);
	}

    return { even, odd };
}
