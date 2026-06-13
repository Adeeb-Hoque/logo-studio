import type { Asset, Placed } from "../lib/types";

interface Props {
  placed: Placed[];
  assets: Record<string, Asset>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (id: string, dir: 1 | -1) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

function RowBtn({
  title,
  onClick,
  children,
  disabled,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex h-6 w-6 items-center justify-center rounded text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-900 disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

export default function LayersPanel({
  placed,
  assets,
  selectedId,
  onSelect,
  onReorder,
  onDuplicate,
  onDelete,
}: Props) {
  // Top of the list = top of the stack (highest z).
  const ordered = [...placed].sort((a, b) => b.z - a.z);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
        Layers
      </p>

      {ordered.length === 0 ? (
        <p className="py-2 text-xs text-neutral-400">
          Nothing placed yet. Drag a component onto the icon.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {ordered.map((p, i) => {
            const a = assets[p.assetId];
            if (!a) return null;
            const selected = p.id === selectedId;
            return (
              <li
                key={p.id}
                onClick={() => onSelect(p.id)}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 transition ${
                  selected
                    ? "border-blue-300 bg-blue-50"
                    : "border-transparent hover:bg-neutral-50"
                }`}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded border border-neutral-200 bg-white p-1 text-neutral-800">
                  <svg
                    viewBox={`${a.viewBox.minX} ${a.viewBox.minY} ${a.viewBox.width} ${a.viewBox.height}`}
                    className="h-full w-full"
                    dangerouslySetInnerHTML={{ __html: a.inner }}
                  />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-neutral-700">
                  {a.name}
                </span>
                <RowBtn title="Bring forward" onClick={() => onReorder(p.id, 1)} disabled={i === 0}>
                  ↑
                </RowBtn>
                <RowBtn
                  title="Send backward"
                  onClick={() => onReorder(p.id, -1)}
                  disabled={i === ordered.length - 1}
                >
                  ↓
                </RowBtn>
                <RowBtn title="Duplicate" onClick={() => onDuplicate(p.id)}>
                  ⧉
                </RowBtn>
                <RowBtn title="Delete" onClick={() => onDelete(p.id)}>
                  ✕
                </RowBtn>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
