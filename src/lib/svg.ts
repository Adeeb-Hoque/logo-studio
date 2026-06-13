import type { Asset } from "./types";

export interface ParsedLogo {
  /** Inner markup of the uploaded <svg>, sanitized + id-namespaced. */
  inner: string;
  /** The logo's coordinate space. */
  viewBox: { minX: number; minY: number; width: number; height: number };
}

const EVENT_ATTR = /^on/i;

let assetSeq = 0;
/** Monotonic unique id, safe for SVG id prefixes and React keys. */
export function uid(prefix = "a"): string {
  assetSeq += 1;
  return `${prefix}${assetSeq.toString(36)}`;
}

/**
 * Parse an uploaded SVG string into sanitized, id-namespaced inner markup + its
 * viewBox. Strips <script>/<foreignObject>/<style> and any on* handlers so
 * untrusted SVGs are safe to inline, and rewrites every internal id (plus the
 * url(#…)/href references to it) under `prefix` so the same SVG can be instanced
 * multiple times without id collisions — including against the renderer's own
 * gradient/filter ids. Returns null if the string isn't a valid <svg>.
 */
export function parseLogoSvg(raw: string, prefix = uid("svg")): ParsedLogo | null {
  const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
  if (doc.querySelector("parsererror")) return null;
  const svg = doc.querySelector("svg");
  if (!svg) return null;

  // Sanitize: drop dangerous / colliding nodes and event handlers.
  svg.querySelectorAll("script, foreignObject, style").forEach((n) => n.remove());
  svg.querySelectorAll("*").forEach((el) => {
    [...el.attributes].forEach((a) => {
      if (EVENT_ATTR.test(a.name)) el.removeAttribute(a.name);
    });
  });

  namespaceIds(svg, prefix);

  const viewBox = readViewBox(svg);
  const inner = [...svg.childNodes]
    .map((n) => new XMLSerializer().serializeToString(n))
    .join("");

  return { inner, viewBox };
}

/** Build an Asset from raw SVG text, or null if it doesn't parse. */
export function makeAsset(raw: string, name: string): Asset | null {
  const id = uid("svg");
  const parsed = parseLogoSvg(raw, id);
  if (!parsed) return null;
  return { id, name, inner: parsed.inner, viewBox: parsed.viewBox };
}

/** Rewrite every element id and the references to it under `prefix-`. */
function namespaceIds(svg: SVGSVGElement, prefix: string): void {
  const map = new Map<string, string>();
  svg.querySelectorAll("[id]").forEach((el) => {
    const old = el.getAttribute("id")!;
    const next = `${prefix}-${old}`;
    map.set(old, next);
    el.setAttribute("id", next);
  });
  if (map.size === 0) return;

  const sub = (v: string) =>
    v.replace(/url\(\s*#([^)\s]+)\s*\)/g, (m, id) =>
      map.has(id) ? `url(#${map.get(id)})` : m,
    );

  svg.querySelectorAll("*").forEach((el) => {
    [...el.attributes].forEach((a) => {
      if (a.value.includes("url(#")) {
        el.setAttribute(a.name, sub(a.value));
      } else if (
        (a.name === "href" || a.name === "xlink:href") &&
        a.value.startsWith("#")
      ) {
        const id = a.value.slice(1);
        if (map.has(id)) el.setAttribute(a.name, `#${map.get(id)}`);
      }
    });
  });
}

function readViewBox(svg: SVGSVGElement): ParsedLogo["viewBox"] {
  const vb = svg.getAttribute("viewBox");
  if (vb) {
    const p = vb.split(/[\s,]+/).map(Number);
    if (p.length === 4 && p.every((n) => Number.isFinite(n)) && p[2] > 0 && p[3] > 0) {
      return { minX: p[0], minY: p[1], width: p[2], height: p[3] };
    }
  }
  const w = parseFloat(svg.getAttribute("width") || "");
  const h = parseFloat(svg.getAttribute("height") || "");
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
    return { minX: 0, minY: 0, width: w, height: h };
  }
  return { minX: 0, minY: 0, width: 100, height: 100 };
}
