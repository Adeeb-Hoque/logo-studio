import { useRef, useState } from "react";
import { makeAsset } from "../lib/svg";
import type { Asset } from "../lib/types";

interface Props {
  assets: Asset[];
  onAdd: (asset: Asset) => void;
  onRemove: (id: string) => void;
  /** Place an asset onto the canvas (click-to-add convenience). */
  onPlace: (id: string) => void;
}

/** Small live preview of an uploaded SVG, drawn in its own viewBox. */
function Thumb({ asset }: { asset: Asset }) {
  const { minX, minY, width, height } = asset.viewBox;
  return (
    <svg
      viewBox={`${minX} ${minY} ${width} ${height}`}
      className="h-full w-full"
      dangerouslySetInnerHTML={{ __html: asset.inner }}
    />
  );
}

export default function AssetPalette({ assets, onAdd, onRemove, onPlace }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | File[]) {
    setError(null);
    let added = 0;
    for (const file of Array.from(files)) {
      if (!/svg/i.test(file.type) && !/\.svg$/i.test(file.name)) continue;
      const asset = makeAsset(await file.text(), file.name);
      if (asset) {
        onAdd(asset);
        added++;
      }
    }
    if (added === 0) setError("Drop one or more .svg files");
  }

  return (
    <section className="flex w-full flex-col gap-3 rounded-2xl border border-neutral-200/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
        SVG Components
      </p>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        className={`flex h-24 items-center justify-center rounded-[12px] border-2 border-dashed bg-[#F3F1F1] text-sm font-medium text-neutral-400 transition ${
          over ? "border-neutral-800 text-neutral-700" : "border-[#cfcfcf]"
        }`}
      >
        Upload .SVG from computer
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}

      {assets.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {assets.map((a) => (
            <div
              key={a.id}
              className="group relative aspect-square cursor-grab rounded-lg border border-neutral-200 bg-white p-2 text-neutral-800 transition hover:border-neutral-400 active:cursor-grabbing"
              draggable
              title={`${a.name} — drag onto the icon, or click to add`}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/asset-id", a.id);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => onPlace(a.id)}
            >
              <Thumb asset={a} />
              <button
                type="button"
                title="Remove from palette"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(a.id);
                }}
                className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-xs leading-none text-white group-hover:flex"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-neutral-400">
        Drag a component onto the icon, or click it to drop in the center.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".svg,image/svg+xml"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </section>
  );
}
