import { forwardRef, useId, useMemo } from "react";
import { shapePath } from "../lib/squircle";
import { placedTransform, ICON_SIZE } from "../lib/geometry";
import { DEFAULT_STYLE, type Asset, type Fill, type IconStyle, type Placed } from "../lib/types";

const SIZE = ICON_SIZE;

interface Props {
  placed: Placed[];
  assets: Record<string, Asset>;
  fill: Fill;
  style?: IconStyle;
}

/**
 * The app-icon, composited as a single 272×272 inline SVG. The composed logo
 * is the union of all placed components, masked to a single shape.
 *
 * Treatments:
 *  - glossy   — user fill on the background; embossed white logo + gloss stack.
 *  - flat     — user fill on the background; flat white logo, no decoration.
 *  - matte    — dark background; the user fill colors the LOGO; soft shadow.
 *  - inverted — light background + hairline; the user fill colors the LOGO.
 *
 * All <defs> ids are namespaced per-instance via useId() so many icons can
 * render on one page (the gallery grid) without url(#…) collisions.
 */
const IconRenderer = forwardRef<SVGSVGElement, Props>(
  ({ placed, assets, fill, style = DEFAULT_STYLE }, ref) => {
    const raw = useId();
    const uid = raw.replace(/:/g, "");
    const ns = (s: string) => `${uid}-${s}`;
    const u = (s: string) => `url(#${ns(s)})`;
    const maskFill = `lmf-${uid}`;

    const { treatment, shape } = style;
    const glossy = treatment === "glossy";

    const bgPath = useMemo(() => shapePath(shape, SIZE), [shape]);
    const rimPath = useMemo(() => shapePath(shape, 245), [shape]);
    const sheenPath = useMemo(() => shapePath(shape, 264), [shape]);

    const rimInset = (SIZE - 245) / 2;
    const sheenInset = (SIZE - 264) / 2;

    const ordered = useMemo(() => [...placed].sort((a, b) => a.z - b.z), [placed]);
    const hasLogo = ordered.some((p) => assets[p.assetId]);

    const userFillValue = fill.kind === "solid" ? fill.color : u("userColor");
    const bgFillValue =
      treatment === "matte" ? "#16181d" : treatment === "inverted" ? "#fafafa" : userFillValue;
    const logoFillValue = glossy
      ? u("logoWhite")
      : treatment === "flat"
        ? "#ffffff"
        : userFillValue;

    // Soft drop shadow under the logo (skipped for the flat treatment).
    const shadow =
      treatment === "glossy"
        ? { color: "#0c005a", op: 0.28, dx: 6, dy: 7 }
        : treatment === "matte"
          ? { color: "#000000", op: 0.5, dx: 0, dy: 6 }
          : treatment === "inverted"
            ? { color: "#0c0c0c", op: 0.16, dx: 0, dy: 5 }
            : null;

    const composition = ordered.map((p) => {
      const a = assets[p.assetId];
      if (!a) return null;
      return (
        <g
          key={p.id}
          transform={placedTransform(p, a)}
          dangerouslySetInnerHTML={{ __html: a.inner }}
          className={maskFill}
        />
      );
    });

    return (
      <svg
        ref={ref}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {fill.kind === "linear" && (
            <linearGradient
              id={ns("userColor")}
              x1={fill.start.x}
              y1={fill.start.y}
              x2={fill.end.x}
              y2={fill.end.y}
            >
              <stop offset="0" stopColor={fill.from} />
              <stop offset="1" stopColor={fill.to} />
            </linearGradient>
          )}

          {/* Gray curvature shading, blended with OVERLAY over the color. */}
          <radialGradient id={ns("shading")} gradientUnits="userSpaceOnUse" cx={SIZE * 0.2} cy={SIZE * 0.15} r={SIZE * 0.95}>
            <stop offset="0" stopColor="#B0B0B0" />
            <stop offset="0.61" stopColor="#676767" />
            <stop offset="1" stopColor="#FFFFFF" />
          </radialGradient>

          {/* Subtle top light lift for the matte treatment. */}
          <radialGradient id={ns("matteLift")} gradientUnits="userSpaceOnUse" cx={SIZE * 0.3} cy={SIZE * 0.16} r={SIZE * 0.85}>
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.10" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          {/* White wash over the logo (brighter top-left). */}
          <radialGradient id={ns("logoWhite")} gradientUnits="userSpaceOnUse" cx={SIZE * 0.24} cy={SIZE * 0.14} r={SIZE * 1.1}>
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.72" />
          </radialGradient>

          {/* Top-left linear sheen. */}
          <linearGradient id={ns("sheen")} x1="0.12" y1="0.05" x2="0.5" y2="1">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.6" />
            <stop offset="0.32" stopColor="#FFFFFF" stopOpacity="0.1" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.01" />
          </linearGradient>

          <filter id={ns("rimBlur")} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <filter id={ns("sheenBlur")} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
          <filter id={ns("shadowBlur")} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" />
          </filter>

          {/* Logo emboss (glossy only): dark inner shadow BR + white highlight TL. */}
          <filter id={ns("logoEmboss")} x="-25%" y="-25%" width="150%" height="150%">
            <feComponentTransfer in="SourceAlpha" result="inv1">
              <feFuncA type="table" tableValues="1 0" />
            </feComponentTransfer>
            <feOffset in="inv1" dx="2.4" dy="2.4" result="inv1o" />
            <feGaussianBlur in="inv1o" stdDeviation="1.2" result="inv1b" />
            <feFlood floodColor="#21306b" floodOpacity="0.5" result="darkc" />
            <feComposite in="darkc" in2="inv1b" operator="in" result="dark1" />
            <feComposite in="dark1" in2="SourceAlpha" operator="in" result="darkInner" />
            <feComponentTransfer in="SourceAlpha" result="inv2">
              <feFuncA type="table" tableValues="1 0" />
            </feComponentTransfer>
            <feOffset in="inv2" dx="-2.2" dy="-2.2" result="inv2o" />
            <feGaussianBlur in="inv2o" stdDeviation="1.1" result="inv2b" />
            <feFlood floodColor="#ffffff" floodOpacity="1" result="whitec" />
            <feComposite in="whitec" in2="inv2b" operator="in" result="white1" />
            <feComposite in="white1" in2="SourceAlpha" operator="in" result="whiteInner" />
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="darkInner" />
              <feMergeNode in="whiteInner" />
            </feMerge>
          </filter>

          {hasLogo && (
            <mask id={ns("logoMask")} maskUnits="userSpaceOnUse" x="0" y="0" width={SIZE} height={SIZE}>
              {composition}
            </mask>
          )}

          <clipPath id={ns("iconClip")}>
            <path d={bgPath} />
          </clipPath>
        </defs>

        <style>{`
          .${maskFill}, .${maskFill} * { fill: #fff !important; stroke: #fff !important; stroke-opacity: 1 !important; fill-opacity: 1 !important; opacity: 1 !important; }
          .${maskFill} [fill="none"] { fill: none !important; }
          .${maskFill} [stroke="none"] { stroke: none !important; }
        `}</style>

        <g style={{ isolation: "isolate" }}>
          <g clipPath={u("iconClip")}>
            {/* Background. */}
            <path d={bgPath} fill={bgFillValue} />
            {treatment === "matte" && <path d={bgPath} fill={u("matteLift")} />}

            {glossy && (
              <>
                <path d={bgPath} fill={u("shading")} style={{ mixBlendMode: "overlay" }} />
                <g transform={`translate(${rimInset} ${rimInset})`}>
                  <path d={rimPath} fill="#D9D9D9" filter={u("rimBlur")} style={{ mixBlendMode: "soft-light" }} />
                </g>
              </>
            )}

            {/* Logo: optional drop shadow, then fill (embossed white / flat / user color). */}
            {hasLogo && (
              <>
                {shadow && (
                  <g transform={`translate(${shadow.dx} ${shadow.dy})`} style={{ mixBlendMode: glossy ? "multiply" : "normal" }}>
                    <rect width={SIZE} height={SIZE} fill={shadow.color} fillOpacity={shadow.op} mask={u("logoMask")} filter={u("shadowBlur")} />
                  </g>
                )}
                <g filter={glossy ? u("logoEmboss") : undefined}>
                  <rect width={SIZE} height={SIZE} fill={logoFillValue} mask={u("logoMask")} />
                </g>
              </>
            )}

            {glossy && (
              <g transform={`translate(${sheenInset} ${sheenInset})`}>
                <path d={sheenPath} fill={u("sheen")} filter={u("sheenBlur")} />
              </g>
            )}

            {/* Hairline for the inverted treatment. */}
            {treatment === "inverted" && (
              <path d={bgPath} fill="none" stroke="#e4e4e7" strokeWidth={2} />
            )}
          </g>
        </g>
      </svg>
    );
  },
);

IconRenderer.displayName = "IconRenderer";
export default IconRenderer;
