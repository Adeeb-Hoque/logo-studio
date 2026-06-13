import { useState } from "react";
import { copyPng, exportIconSetZip, exportSvgFile, exportSvgToPng } from "../lib/export";

interface Props {
  getSvg: () => SVGSVGElement | null;
  baseName: string;
}

const PNG_SIZES = [1024, 512, 256];

export default function ExportBar({ getSvg, baseName }: Props) {
  const [status, setStatus] = useState<string | null>(null);

  const flash = (msg: string) => {
    setStatus(msg);
    window.setTimeout(() => setStatus((s) => (s === msg ? null : s)), 1600);
  };

  async function run(label: string, fn: (svg: SVGSVGElement) => void | Promise<void>) {
    const svg = getSvg();
    if (!svg) return;
    try {
      await fn(svg);
      flash(label);
    } catch {
      flash("Failed");
    }
  }

  const label = "w-9 shrink-0 text-xs font-medium uppercase tracking-wide text-neutral-400";
  const btn =
    "flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50";

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex h-4 items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Export</p>
        <p className="text-xs text-neutral-500">{status}</p>
      </div>

      <div className="flex items-center gap-2">
        <span className={label}>PNG</span>
        <div className="flex flex-1 gap-2">
          {PNG_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => run(`Saved ${s}px`, (svg) => exportSvgToPng(svg, s, `${baseName}-${s}.png`))}
              className="flex-1 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
            >
              {s}px
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={label}>File</span>
        <div className="flex flex-1 gap-2">
          <button type="button" className={btn} onClick={() => run("SVG saved", (svg) => exportSvgFile(svg, `${baseName}.svg`))}>
            SVG
          </button>
          <button type="button" className={btn} onClick={() => run("Copied ✓", (svg) => copyPng(svg))}>
            Copy PNG
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => {
              setStatus("Zipping…");
              run("Icon set saved", (svg) => exportIconSetZip(svg, baseName));
            }}
          >
            Icon Set (.zip)
          </button>
        </div>
      </div>
    </div>
  );
}
