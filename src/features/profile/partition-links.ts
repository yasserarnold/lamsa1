export type ProfileLinkLike = {
  id: string;
  type: string;
  label: string;
  value: string;
  position: number;
};

/** Types shown as top circle shortcuts on the public profile. */
export const QUICK_LINK_TYPES = ["phone", "email", "website"] as const;
export type QuickLinkType = (typeof QUICK_LINK_TYPES)[number];

const QUICK_SET = new Set<string>(QUICK_LINK_TYPES);

/**
 * Split profile links into the quick-action circles (phone/email/website)
 * and the rest that render as tiles in the grid below. A quick-action link
 * with an empty value is dropped from `quick` and NOT moved to `rest`, so a
 * type never appears in both places.
 */
export function partitionProfileLinks<T extends ProfileLinkLike>(links: T[]): {
  quick: T[];
  rest: T[];
} {
  const seen = new Set<string>();
  const quick: T[] = [];
  const rest: T[] = [];
  for (const link of links) {
    if (QUICK_SET.has(link.type)) {
      // Skip empty values AND duplicates of the same quick type — each of
      // phone/email/website renders as at most one circle.
      if (!link.value || link.value.trim().length === 0) continue;
      if (seen.has(link.type)) continue;
      seen.add(link.type);
      quick.push(link);
      continue;
    }
    rest.push(link);
  }
  quick.sort(
    (a, b) =>
      QUICK_LINK_TYPES.indexOf(a.type as QuickLinkType) -
      QUICK_LINK_TYPES.indexOf(b.type as QuickLinkType),
  );
  return { quick, rest };
}
