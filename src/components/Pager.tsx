interface Props {
  page: number; // 0-based
  pageCount: number;
  onChange: (page: number) => void;
}

/** Windowed page numbers around the current page, with ellipses. */
function pageWindow(page: number, count: number): (number | "…")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i);
  const out: (number | "…")[] = [0];
  const lo = Math.max(1, page - 1);
  const hi = Math.min(count - 2, page + 1);
  if (lo > 1) out.push("…");
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < count - 2) out.push("…");
  out.push(count - 1);
  return out;
}

export default function Pager({ page, pageCount, onChange }: Props) {
  if (pageCount <= 1) return null;
  const items = pageWindow(page, pageCount);

  return (
    <nav className="flex items-center justify-center gap-1 pt-2 text-sm">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-30"
        title="Previous"
      >
        ‹
      </button>
      {items.map((it, i) =>
        it === "…" ? (
          <span key={`e${i}`} className="px-1 text-neutral-400">
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            onClick={() => onChange(it)}
            className={`flex h-8 min-w-8 items-center justify-center rounded-md border px-2 transition ${
              it === page
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {it + 1}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount - 1}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-30"
        title="Next"
      >
        ›
      </button>
    </nav>
  );
}
