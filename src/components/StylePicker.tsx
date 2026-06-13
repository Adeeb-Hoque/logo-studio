import type { IconStyle, Shape, Treatment } from "../lib/types";

interface Props {
  style: IconStyle;
  onChange: (style: IconStyle) => void;
}

const TREATMENTS: { key: Treatment; label: string }[] = [
  { key: "glossy", label: "Glossy" },
  { key: "flat", label: "Flat" },
  { key: "matte", label: "Matte" },
  { key: "inverted", label: "Inverted" },
];

const SHAPES: { key: Shape; label: string }[] = [
  { key: "squircle", label: "Squircle" },
  { key: "circle", label: "Circle" },
  { key: "rounded", label: "Rounded" },
];

function Row<T extends string>({
  options,
  value,
  onPick,
}: {
  options: { key: T; label: string }[];
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onPick(o.key)}
          className={`rounded-md border px-2 py-1.5 text-xs font-medium transition ${
            value === o.key
              ? "border-neutral-900 bg-neutral-900 text-white"
              : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function StylePicker({ style, onChange }: Props) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
        Icon Style
      </p>
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">Treatment</span>
        <Row options={TREATMENTS} value={style.treatment} onPick={(treatment) => onChange({ ...style, treatment })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">Shape</span>
        <Row options={SHAPES} value={style.shape} onPick={(shape) => onChange({ ...style, shape })} />
      </div>
    </section>
  );
}
