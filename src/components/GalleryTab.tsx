import { useEffect, useState } from "react";
import IconRenderer from "./IconRenderer";
import Pager from "./Pager";
import { CURATED, fetchIconSvgs, searchIcons } from "../lib/iconify";
import { makeAsset } from "../lib/svg";
import { fitScale, ICON_SIZE } from "../lib/geometry";
import type { Asset, Fill, IconStyle, Placed } from "../lib/types";

interface Props {
  /** Live fill from the editor, so previews show the user's current colors. */
  fill: Fill;
  /** Live style from the editor, so previews show the chosen treatment/shape. */
  style: IconStyle;
  /** Add the chosen glyph to the editor and jump back to Compose. */
  onPick: (asset: Asset) => void;
}

const CENTER = ICON_SIZE / 2;
const PAGE_SIZE = 24;

function previewPlaced(asset: Asset): { placed: Placed[]; assets: Record<string, Asset> } {
  return {
    placed: [{ id: `prev-${asset.id}`, assetId: asset.id, cx: CENTER, cy: CENTER, scale: fitScale(asset), rot: 0, z: 1 }],
    assets: { [asset.id]: asset },
  };
}

export default function GalleryTab({ fill, style, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [debQuery, setDebQuery] = useState("");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<{ asset: Asset; label: string }[]>([]);
  const [total, setTotal] = useState(CURATED.length);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce the query and reset to page 0 whenever it changes.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebQuery(query.trim());
      setPage(0);
    }, query.trim() ? 300 : 0);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch the current page (search or curated).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        let ids: string[];
        let tot: number;
        if (debQuery) {
          const r = await searchIcons(debQuery, PAGE_SIZE, page * PAGE_SIZE);
          ids = r.ids;
          tot = r.total;
        } else {
          ids = CURATED.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
          tot = CURATED.length;
        }
        const icons = await fetchIconSvgs(ids);
        if (cancelled) return;
        const built = icons
          .map((ic) => {
            const asset = makeAsset(ic.svg, ic.name);
            return asset ? { asset, label: ic.id } : null;
          })
          .filter((x): x is { asset: Asset; label: string } => !!x);
        setItems(built);
        setTotal(tot);
        if (built.length === 0) setError(debQuery ? "No icons match that search." : "Couldn't load icons.");
      } catch {
        if (!cancelled) setError("Couldn't reach the icon library. Check your connection.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [debQuery, page]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-5">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search 200k+ icons — Lucide, Tabler, Heroicons, brands…"
          className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white"
        />
        <p className="text-xs text-neutral-400">
          Click any icon to drop it into your composition with the current style.
        </p>
      </div>

      {error && !loading && items.length === 0 && (
        <p className="text-center text-sm text-neutral-400">{error}</p>
      )}

      <div
        className={`grid grid-cols-3 gap-4 transition-opacity sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 ${
          loading ? "opacity-40" : "opacity-100"
        }`}
      >
        {items.map(({ asset, label }) => {
          const { placed, assets } = previewPlaced(asset);
          return (
            <button
              key={asset.id}
              type="button"
              title={`${label} — click to add`}
              onClick={() => onPick(asset)}
              className="group flex flex-col items-center gap-1.5 rounded-2xl p-1.5 transition hover:bg-neutral-50"
            >
              <span className="block w-full [&>svg]:h-full [&>svg]:w-full">
                <IconRenderer placed={placed} assets={assets} fill={fill} style={style} />
              </span>
              <span className="max-w-full truncate text-[10px] text-neutral-400 group-hover:text-neutral-600">
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <Pager page={page} pageCount={pageCount} onChange={setPage} />
    </div>
  );
}
