import { useEffect, useMemo, useRef, useState } from "react";
import LogoCanvas from "./components/LogoCanvas";
import AssetPalette from "./components/AssetPalette";
import GradientControl from "./components/GradientControl";
import LayersPanel from "./components/LayersPanel";
import StylePicker from "./components/StylePicker";
import ExportBar from "./components/ExportBar";
import GalleryTab from "./components/GalleryTab";
import { useHistory } from "./lib/history";
import { makeAsset, uid } from "./lib/svg";
import { fitScale, ICON_SIZE } from "./lib/geometry";
import { DEFAULT_STYLE, linear, type Asset, type Doc, type Fill, type IconStyle, type Placed } from "./lib/types";

const CENTER = ICON_SIZE / 2;
type Tab = "compose" | "gallery";

const clampIcon = (v: number) => (v < 0 ? 0 : v > ICON_SIZE ? ICON_SIZE : v);

export default function App() {
  const [tab, setTab] = useState<Tab>("compose");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const hist = useHistory<Doc>({ placed: [], fill: linear("#37E518", "#1C1FD4"), style: DEFAULT_STYLE });
  const { placed, fill, style } = hist.state;
  const svgRef = useRef<SVGSVGElement>(null);

  const assetMap = useMemo(
    () => Object.fromEntries(assets.map((a) => [a.id, a])),
    [assets],
  );

  // Doc mutators
  const setPlacedLive = (fn: (list: Placed[]) => Placed[]) =>
    hist.set((d) => ({ ...d, placed: fn(d.placed) }));
  const commitPlaced = (fn: (list: Placed[]) => Placed[]) =>
    hist.commit((d) => ({ ...d, placed: fn(d.placed) }));

  // Seed the bundled sample once (no history entry, so undo can't erase it).
  useEffect(() => {
    let cancelled = false;
    fetch("/sample-logo.svg")
      .then((r) => r.text())
      .then((t) => {
        if (cancelled) return;
        const a = makeAsset(t, "sample-logo.svg");
        if (!a) return;
        setAssets([a]);
        hist.set((d) => ({
          ...d,
          placed: [{ id: uid("p"), assetId: a.id, cx: CENTER, cy: CENTER, scale: fitScale(a), rot: 0, z: 1 }],
        }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function addAsset(a: Asset) {
    setAssets((prev) => (prev.some((x) => x.id === a.id) ? prev : [...prev, a]));
  }

  function removeAsset(id: string) {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    commitPlaced((list) => list.filter((p) => p.assetId !== id));
  }

  function placeAssetObj(a: Asset, cx: number, cy: number) {
    const id = uid("p");
    commitPlaced((list) => {
      const maxZ = list.reduce((m, p) => Math.max(m, p.z), 0);
      return [...list, { id, assetId: a.id, cx, cy, scale: fitScale(a), rot: 0, z: maxZ + 1 }];
    });
    setSelectedId(id);
  }

  function placeAsset(assetId: string, cx: number, cy: number) {
    const a = assetMap[assetId];
    if (a) placeAssetObj(a, cx, cy);
  }

  function handlePick(a: Asset) {
    addAsset(a);
    placeAssetObj(a, CENTER, CENTER);
    setTab("compose");
  }

  function updatePlaced(id: string, patch: Partial<Placed>) {
    setPlacedLive((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function reorder(id: string, dir: 1 | -1) {
    commitPlaced((list) => {
      const sorted = [...list].sort((a, b) => a.z - b.z);
      const i = sorted.findIndex((p) => p.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= sorted.length) return list;
      const zi = sorted[i].z;
      const zj = sorted[j].z;
      return list.map((p) =>
        p.id === sorted[i].id ? { ...p, z: zj } : p.id === sorted[j].id ? { ...p, z: zi } : p,
      );
    });
  }

  function duplicate(id: string) {
    const src = placed.find((p) => p.id === id);
    if (!src) return;
    const nid = uid("p");
    commitPlaced((list) => {
      const maxZ = list.reduce((m, p) => Math.max(m, p.z), 0);
      return [
        ...list,
        { ...src, id: nid, cx: clampIcon(src.cx + 8), cy: clampIcon(src.cy + 8), z: maxZ + 1 },
      ];
    });
    setSelectedId(nid);
  }

  function deletePlaced(id: string) {
    commitPlaced((list) => list.filter((p) => p.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }

  function nudge(dx: number, dy: number) {
    if (!selectedId) return;
    commitPlaced((list) =>
      list.map((p) =>
        p.id === selectedId ? { ...p, cx: clampIcon(p.cx + dx), cy: clampIcon(p.cy + dy) } : p,
      ),
    );
  }

  // Keyboard shortcuts (skip while typing in inputs).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;

      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) hist.redo();
        else hist.undo();
        return;
      }
      if (meta && e.key.toLowerCase() === "y") {
        e.preventDefault();
        hist.redo();
        return;
      }
      if (tab !== "compose" || !selectedId) return;
      if (meta && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicate(selectedId);
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowLeft") { e.preventDefault(); nudge(-step, 0); }
      else if (e.key === "ArrowRight") { e.preventDefault(); nudge(step, 0); }
      else if (e.key === "ArrowUp") { e.preventDefault(); nudge(0, -step); }
      else if (e.key === "ArrowDown") { e.preventDefault(); nudge(0, step); }
      else if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); deletePlaced(selectedId); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hist, tab, selectedId, placed]);

  const exportBase = assets[0]?.name.replace(/\.svg$/i, "") || "app-icon";

  return (
    <div className="min-h-full bg-white text-neutral-900">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="flex flex-col items-center text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-neutral-400">
            Logo Creator
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Design your app icon
          </h1>
          <p className="mt-2 max-w-md text-sm text-neutral-500">
            Compose SVG components into a glossy icon, aim the gradient, and export.
          </p>
        </header>

        {/* Tabs */}
        <div className="mb-8 mt-7 flex justify-center">
          <div className="flex rounded-lg bg-neutral-100 p-1 text-sm">
            {([
              ["compose", "Compose"],
              ["gallery", "Inspiration"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-md px-5 py-1.5 font-medium transition ${
                  tab === key
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === "compose" ? (
          <div key="compose" className="animate-fade grid items-start gap-6 md:grid-cols-2 lg:grid-cols-[300px_minmax(0,1fr)_300px]">
            {/* Stage card: canvas + export, with undo/redo in the header. */}
            <section className="flex flex-col rounded-2xl border border-neutral-200/70 bg-white md:col-span-2 lg:order-2 lg:col-span-1 lg:sticky lg:top-8">
              <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                  Canvas
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    title="Undo (⌘Z)"
                    onClick={hist.undo}
                    disabled={!hist.canUndo}
                    className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-30"
                  >
                    ↺ Undo
                  </button>
                  <button
                    type="button"
                    title="Redo (⇧⌘Z)"
                    onClick={hist.redo}
                    disabled={!hist.canRedo}
                    className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-30"
                  >
                    ↻ Redo
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center px-6 py-8">
                <LogoCanvas
                  ref={svgRef}
                  placed={placed}
                  assets={assetMap}
                  fill={fill}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onUpdate={updatePlaced}
                  onGestureStart={hist.snapshot}
                  onReorder={reorder}
                  onDuplicate={duplicate}
                  onDelete={deletePlaced}
                  onDropAsset={placeAsset}
                  onFill={(f) => hist.set((d) => ({ ...d, fill: f }))}
                  style={style}
                />
                <p className="mt-4 text-xs text-neutral-400">
                  Drag to move · corner dot scales · green dot rotates · A/B dots aim the gradient
                </p>
              </div>

              <div className="border-t border-neutral-100 px-5 py-4">
                <ExportBar getSvg={() => svgRef.current} baseName={exportBase} />
              </div>
            </section>

            {/* Components + layers. */}
            <div className="flex flex-col gap-4 lg:order-1">
              <AssetPalette
                assets={assets}
                onAdd={addAsset}
                onRemove={removeAsset}
                onPlace={(id) => placeAsset(id, CENTER, CENTER)}
              />
              <LayersPanel
                placed={placed}
                assets={assetMap}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onReorder={reorder}
                onDuplicate={duplicate}
                onDelete={deletePlaced}
              />
            </div>

            {/* Style + color. */}
            <div className="flex flex-col gap-4 lg:order-3">
              <StylePicker
                style={style}
                onChange={(s: IconStyle) => hist.commit((d) => ({ ...d, style: s }))}
              />
              <GradientControl
                fill={fill}
                onChange={(f: Fill) => hist.set((d) => ({ ...d, fill: f }))}
                onEditStart={hist.snapshot}
                onCommit={(f: Fill) => hist.commit((d) => ({ ...d, fill: f }))}
              />
            </div>
          </div>
        ) : (
          <div key="gallery" className="animate-fade">
            <GalleryTab fill={fill} style={style} onPick={handlePick} />
          </div>
        )}
      </div>
    </div>
  );
}
