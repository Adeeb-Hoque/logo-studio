import { PRESETS, linear, type Fill } from "../lib/types";

interface Props {
  fill: Fill;
  /** Live update during a color-swatch edit (no history entry). */
  onChange: (fill: Fill) => void;
  /** Record an undo point at the start of a swatch edit. */
  onEditStart: () => void;
  /** Discrete change (mode toggle, preset) — one history entry. */
  onCommit: (fill: Fill) => void;
}

function Swatch({
  label,
  value,
  onChange,
  onEditStart,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onEditStart: () => void;
}) {
  return (
    <label
      className="flex items-center gap-2 rounded-md border border-neutral-200 px-2 py-1.5"
      onPointerDown={onEditStart}
    >
      <span className="w-8 text-[10px] uppercase tracking-wide text-neutral-400">
        {label}
      </span>
      <span
        className="h-6 w-6 rounded border border-black/10"
        style={{ background: value }}
      />
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
      />
      <span className="font-mono text-xs uppercase text-neutral-500">{value}</span>
    </label>
  );
}

export default function GradientControl({ fill, onChange, onEditStart, onCommit }: Props) {
  function setMode(kind: Fill["kind"]) {
    if (kind === fill.kind) return;
    if (kind === "solid") {
      onCommit({ kind: "solid", color: fill.kind === "linear" ? fill.from : "#0EA5E9" });
    } else {
      onCommit(linear(fill.kind === "solid" ? fill.color : "#37E518", "#1C1FD4"));
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
        Background Color
      </p>

      <div className="flex rounded-lg bg-neutral-100 p-1 text-sm">
        {(["solid", "linear"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md py-1.5 capitalize transition ${
              fill.kind === m
                ? "bg-white font-semibold text-neutral-900 shadow-sm"
                : "text-neutral-500"
            }`}
          >
            {m === "linear" ? "Gradient" : "Solid"}
          </button>
        ))}
      </div>

      {fill.kind === "solid" ? (
        <Swatch
          label="Color"
          value={fill.color}
          onEditStart={onEditStart}
          onChange={(color) => onChange({ kind: "solid", color })}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <Swatch
            label="Start"
            value={fill.from}
            onEditStart={onEditStart}
            onChange={(from) => onChange({ ...fill, from })}
          />
          <Swatch
            label="End"
            value={fill.to}
            onEditStart={onEditStart}
            onChange={(to) => onChange({ ...fill, to })}
          />
          <p className="text-xs text-neutral-400">
            Drag the two dots on the icon to aim the gradient.
          </p>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-[10px] uppercase tracking-wide text-neutral-400">Presets</p>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              title={p.name}
              onClick={() => onCommit(p.fill)}
              className="h-10 rounded-lg border border-black/10 transition hover:scale-105"
              style={{
                background:
                  p.fill.kind === "solid"
                    ? p.fill.color
                    : `linear-gradient(135deg, ${p.fill.from}, ${p.fill.to})`,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
