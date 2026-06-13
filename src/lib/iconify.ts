/** Iconify public API: search + batch icon fetch. */

const API = "https://api.iconify.design";

export interface GalleryIcon {
  /** Full iconify id, e.g. "lucide:zap". */
  id: string;
  /** Display name, e.g. "zap". */
  name: string;
  /** Standalone <svg> string ready for makeAsset. */
  svg: string;
}

/** Hand-picked "best of" shown when the search box is empty (~3 pages). */
export const CURATED: string[] = [
  // page 1 — marks & energy
  "lucide:zap", "lucide:heart", "lucide:hexagon", "lucide:flame",
  "lucide:leaf", "lucide:rocket", "lucide:sparkles", "lucide:gem",
  "lucide:aperture", "lucide:atom", "lucide:command", "lucide:infinity",
  "tabler:bolt", "tabler:cube", "tabler:planet", "tabler:wave-sine",
  "heroicons:bolt-solid", "heroicons:star-solid", "heroicons:fire-solid", "heroicons:cube-transparent",
  "ph:butterfly-fill", "ph:lightning-fill", "ph:shooting-star-fill", "ph:spiral-bold",
  // page 2 — nature & shapes
  "lucide:moon", "lucide:sun", "lucide:cloud", "lucide:droplet",
  "lucide:mountain", "lucide:trees", "lucide:flower", "lucide:snowflake",
  "tabler:triangle", "tabler:circle", "tabler:square-rotated", "tabler:hexagon",
  "ph:diamond-fill", "ph:heart-fill", "ph:star-four-fill", "ph:flower-lotus-fill",
  "heroicons:sparkles-solid", "heroicons:bolt-solid", "heroicons:cloud-solid", "heroicons:moon-solid",
  "lucide:waves", "lucide:wind", "lucide:sunrise", "lucide:eclipse",
  // page 3 — tech & brands
  "lucide:cpu", "lucide:database", "lucide:globe", "lucide:layers",
  "lucide:box", "lucide:orbit", "lucide:radar", "lucide:shapes",
  "tabler:brand-react", "tabler:brand-vue", "tabler:brand-svelte", "tabler:brand-tailwind",
  "simple-icons:vercel", "simple-icons:supabase", "simple-icons:framer", "simple-icons:linear",
  "simple-icons:figma", "simple-icons:notion", "simple-icons:openai", "simple-icons:nextdotjs",
  "ph:rocket-launch-fill", "ph:planet-fill", "ph:atom-fill", "ph:infinity-bold",
];

export interface SearchResult {
  ids: string[];
  total: number;
}

export async function searchIcons(query: string, limit = 24, start = 0): Promise<SearchResult> {
  const res = await fetch(
    `${API}/search?query=${encodeURIComponent(query)}&limit=${limit}&start=${start}`,
  );
  if (!res.ok) throw new Error(`search failed (${res.status})`);
  const data = (await res.json()) as { icons?: string[]; total?: number };
  return { ids: data.icons ?? [], total: data.total ?? (data.icons?.length ?? 0) };
}

interface IconifyJson {
  icons: Record<string, { body: string; width?: number; height?: number }>;
  width?: number;
  height?: number;
}

/** Batch-fetch SVGs for full iconify ids ("prefix:name"), preserving order. */
export async function fetchIconSvgs(ids: string[]): Promise<GalleryIcon[]> {
  const byPrefix = new Map<string, string[]>();
  for (const id of ids) {
    const i = id.indexOf(":");
    if (i < 1) continue;
    const prefix = id.slice(0, i);
    const name = id.slice(i + 1);
    const list = byPrefix.get(prefix) ?? [];
    list.push(name);
    byPrefix.set(prefix, list);
  }

  const found = new Map<string, GalleryIcon>();
  await Promise.all(
    [...byPrefix.entries()].map(async ([prefix, names]) => {
      const res = await fetch(
        `${API}/${prefix}.json?icons=${encodeURIComponent(names.join(","))}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as IconifyJson;
      for (const [name, icon] of Object.entries(data.icons ?? {})) {
        const w = icon.width ?? data.width ?? 16;
        const h = icon.height ?? data.height ?? 16;
        found.set(`${prefix}:${name}`, {
          id: `${prefix}:${name}`,
          name,
          svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${icon.body}</svg>`,
        });
      }
    }),
  );

  return ids.map((id) => found.get(id)).filter((x): x is GalleryIcon => !!x);
}
