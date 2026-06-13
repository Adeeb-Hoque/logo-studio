import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import IconRenderer from "./IconRenderer";
import {
  ICON_SIZE,
  angleDeg,
  boxSizePx,
  centerPx,
  dist,
  pxToIcon,
  toNorm,
} from "../lib/geometry";
import type { Asset, Fill, IconStyle, Placed } from "../lib/types";

interface Props {
  placed: Placed[];
  assets: Record<string, Asset>;
  fill: Fill;
  style: IconStyle;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Live position/scale/rotation update (no history entry). */
  onUpdate: (id: string, patch: Partial<Placed>) => void;
  /** Called once at the start of a drag gesture to record an undo point. */
  onGestureStart: () => void;
  onReorder: (id: string, dir: 1 | -1) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onDropAsset: (assetId: string, cx: number, cy: number) => void;
  /** Live fill update (gradient-handle drag, no history entry). */
  onFill: (fill: Fill) => void;
}

const CENTER = ICON_SIZE / 2;
const SNAP = 5; // icon-unit threshold for center snapping

type Drag =
  | { mode: "move"; id: string; startCx: number; startCy: number; sx: number; sy: number; committed: boolean }
  | { mode: "scale"; id: string; ccx: number; ccy: number; startDist: number; startScale: number; committed: boolean }
  | { mode: "rotate"; id: string; ccx: number; ccy: number; startAngle: number; startRot: number; committed: boolean }
  | { mode: "grad"; which: "start" | "end"; committed: boolean };

const LogoCanvas = forwardRef<SVGSVGElement, Props>(function LogoCanvas(
  {
    placed,
    assets,
    fill,
    style,
    selectedId,
    onSelect,
    onUpdate,
    onGestureStart,
    onReorder,
    onDuplicate,
    onDelete,
    onDropAsset,
    onFill,
  },
  svgRef,
) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [S, setS] = useState(440);
  const [snap, setSnap] = useState({ x: false, y: false });
  const drag = useRef<Drag | null>(null);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setS(el.clientWidth));
    ro.observe(el);
    setS(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  function rect() {
    return boxRef.current!.getBoundingClientRect();
  }

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = drag.current;
      if (!d) return;
      // Record one undo point the moment a gesture actually moves.
      if (!d.committed) {
        d.committed = true;
        onGestureStart();
      }
      const r = rect();
      if (d.mode === "move") {
        let cx = clampIcon(d.startCx + pxToIcon(e.clientX - d.sx, S));
        let cy = clampIcon(d.startCy + pxToIcon(e.clientY - d.sy, S));
        const sx = Math.abs(cx - CENTER) <= SNAP;
        const sy = Math.abs(cy - CENTER) <= SNAP;
        if (sx) cx = CENTER;
        if (sy) cy = CENTER;
        setSnap({ x: sx, y: sy });
        onUpdate(d.id, { cx, cy });
      } else if (d.mode === "scale") {
        const cur = dist(e.clientX, e.clientY, d.ccx, d.ccy);
        const next = Math.max(0.01, (d.startScale * cur) / Math.max(d.startDist, 1));
        onUpdate(d.id, { scale: next });
      } else if (d.mode === "rotate") {
        const cur = angleDeg(d.ccx, d.ccy, e.clientX, e.clientY);
        onUpdate(d.id, { rot: d.startRot + (cur - d.startAngle) });
      } else if (d.mode === "grad" && fill.kind === "linear") {
        const x = toNorm(e.clientX - r.left, S);
        const y = toNorm(e.clientY - r.top, S);
        onFill({ ...fill, [d.which]: { x, y } });
      }
    }
    function onUp() {
      drag.current = null;
      setSnap({ x: false, y: false });
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [S, fill, onUpdate, onFill, onGestureStart]);

  function startMove(e: React.PointerEvent, p: Placed) {
    e.stopPropagation();
    onSelect(p.id);
    drag.current = { mode: "move", id: p.id, startCx: p.cx, startCy: p.cy, sx: e.clientX, sy: e.clientY, committed: false };
  }

  function componentCenterClient(p: Placed) {
    const r = rect();
    const c = centerPx(p, S);
    return { x: r.left + c.x, y: r.top + c.y };
  }

  function startScale(e: React.PointerEvent, p: Placed) {
    e.stopPropagation();
    const c = componentCenterClient(p);
    drag.current = {
      mode: "scale",
      id: p.id,
      ccx: c.x,
      ccy: c.y,
      startDist: dist(e.clientX, e.clientY, c.x, c.y),
      startScale: p.scale,
      committed: false,
    };
  }

  function startRotate(e: React.PointerEvent, p: Placed) {
    e.stopPropagation();
    const c = componentCenterClient(p);
    drag.current = {
      mode: "rotate",
      id: p.id,
      ccx: c.x,
      ccy: c.y,
      startAngle: angleDeg(c.x, c.y, e.clientX, e.clientY),
      startRot: p.rot,
      committed: false,
    };
  }

  const gradLinear = fill.kind === "linear" ? fill : null;

  return (
    <div className="flex aspect-square w-full max-w-[500px] items-center justify-center rounded-3xl bg-[radial-gradient(circle_at_50%_40%,#fbfbfd,#f1f1f4)] p-10 ring-1 ring-inset ring-black/[0.04]">
      <div
        ref={boxRef}
        className="relative w-[78%] [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
        style={{
          filter:
            "drop-shadow(3px 5px 6px rgba(69,65,98,0.22)) drop-shadow(12px 19px 13px rgba(69,65,98,0.16)) drop-shadow(27px 43px 20px rgba(69,65,98,0.10))",
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const id = e.dataTransfer.getData("text/asset-id");
          if (!id) return;
          const r = rect();
          const cx = clampIcon(pxToIcon(e.clientX - r.left, S));
          const cy = clampIcon(pxToIcon(e.clientY - r.top, S));
          onDropAsset(id, cx, cy);
        }}
      >
        <IconRenderer ref={svgRef} placed={placed} assets={assets} fill={fill} style={style} />

        {/* Interaction overlay (no drop-shadow, sits flush over the icon). */}
        <div className="absolute inset-0" style={{ filter: "none" }}>
          {/* Empty-space click deselects. */}
          <div className="absolute inset-0" onPointerDown={() => onSelect(null)} />

          {/* Center snap guides. */}
          {snap.x && <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-cyan-400" />}
          {snap.y && <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-cyan-400" />}

          {placed.map((p) => {
            const a = assets[p.assetId];
            if (!a) return null;
            const c = centerPx(p, S);
            const { w, h } = boxSizePx(p, a, S);
            const selected = p.id === selectedId;
            return (
              <div
                key={p.id}
                className={selected ? "absolute" : "absolute cursor-grab"}
                style={{
                  left: c.x,
                  top: c.y,
                  width: Math.max(w, 12),
                  height: Math.max(h, 12),
                  transform: `translate(-50%, -50%) rotate(${p.rot}deg)`,
                  border: selected ? "1.5px solid #2563eb" : "1.5px solid transparent",
                  touchAction: "none",
                }}
                onPointerDown={(e) => startMove(e, p)}
              >
                {selected && (
                  <>
                    {/* Scale — bottom-right corner. */}
                    <span
                      onPointerDown={(e) => startScale(e, p)}
                      className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-full border border-white bg-blue-600"
                      style={{ touchAction: "none" }}
                    />
                    {/* Rotate — above top-center. */}
                    <span
                      onPointerDown={(e) => startRotate(e, p)}
                      className="absolute left-1/2 h-3 w-3 -translate-x-1/2 cursor-grab rounded-full border border-white bg-emerald-500"
                      style={{ top: -22, touchAction: "none" }}
                    />
                    <span
                      className="absolute left-1/2 -translate-x-1/2 bg-blue-600"
                      style={{ top: -19, width: 1.5, height: 19 }}
                    />
                  </>
                )}
              </div>
            );
          })}

          {/* Gradient direction guide line. */}
          {gradLinear && (
            <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${S} ${S}`}>
              {/* Soft dark halo — same dash pattern so gaps stay clean. */}
              <line
                x1={gradLinear.start.x * S}
                y1={gradLinear.start.y * S}
                x2={gradLinear.end.x * S}
                y2={gradLinear.end.y * S}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth={4}
                strokeLinecap="round"
                strokeDasharray="6 6"
              />
              {/* Crisp white core. */}
              <line
                x1={gradLinear.start.x * S}
                y1={gradLinear.start.y * S}
                x2={gradLinear.end.x * S}
                y2={gradLinear.end.y * S}
                stroke="#ffffff"
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray="6 6"
              />
            </svg>
          )}
          {gradLinear &&
            (["start", "end"] as const).map((which) => {
              const pt = gradLinear[which];
              return (
                <span
                  key={which}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    drag.current = { mode: "grad", which, committed: false };
                  }}
                  title={`Gradient ${which}`}
                  className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white bg-black/70 shadow"
                  style={{ left: pt.x * S, top: pt.y * S, touchAction: "none" }}
                >
                  <span className="absolute inset-0 grid place-items-center text-[8px] font-bold text-white">
                    {which === "start" ? "A" : "B"}
                  </span>
                </span>
              );
            })}

          {/* Selected-component toolbar (top-center, rotation-independent). */}
          {selectedId && (
            <div
              className="absolute left-1/2 top-1 flex -translate-x-1/2 gap-1 rounded-lg bg-neutral-900/90 px-1 py-1 text-white shadow"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <ToolBtn title="Bring forward" onClick={() => onReorder(selectedId, 1)}>↑</ToolBtn>
              <ToolBtn title="Send backward" onClick={() => onReorder(selectedId, -1)}>↓</ToolBtn>
              <ToolBtn title="Duplicate" onClick={() => onDuplicate(selectedId)}>⧉</ToolBtn>
              <ToolBtn title="Delete" onClick={() => onDelete(selectedId)}>✕</ToolBtn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

function ToolBtn({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded-md text-sm hover:bg-white/20"
    >
      {children}
    </button>
  );
}

function clampIcon(v: number): number {
  return v < 0 ? 0 : v > ICON_SIZE ? ICON_SIZE : v;
}

export default LogoCanvas;
