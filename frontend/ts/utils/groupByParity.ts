export type WithIndex = { index: number };

export default function groupByParity<T extends WithIndex>(
  items: readonly T[]
): { even: T[]; odd: T[] } {
    const even: T[] = [];
    const odd: T[] = [];

	for (const item of items) {
		(item.index % 2 === 0 ? even : odd).push(item);
	}

    return { even, odd };
}