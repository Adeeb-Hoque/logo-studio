export type Fill =
  | { kind: "solid"; color: string }
  | {
      kind: "linear";
      from: string;
      to: string;
      /** Gradient start, normalized 0..1 within the icon's bounding box. */
      start: { x: number; y: number };
      /** Gradient end, normalized 0..1. */
      end: { x: number; y: number };
    };

/** A diagonal top-left → bottom-right default direction. */
export const DEFAULT_DIRECTION = {
  start: { x: 0.12, y: 0.1 },
  end: { x: 0.88, y: 0.92 },
};

export function linear(from: string, to: string): Fill {
  return { kind: "linear", from, to, ...DEFAULT_DIRECTION };
}

export const PRESETS: { name: string; fill: Fill }[] = [
  { name: "Velox", fill: linear("#37E518", "#1C1FD4") },
  { name: "Indigo", fill: linear("#A78BFA", "#4F46E5") },
  { name: "Ember", fill: linear("#FB7185", "#B91C1C") },
  { name: "Sunset", fill: linear("#FBBF24", "#EA580C") },
  { name: "Bloom", fill: linear("#FBCFE8", "#EC4899") },
  { name: "Lime", fill: linear("#A3E635", "#15803D") },
  { name: "Slate", fill: { kind: "solid", color: "#1E293B" } },
  { name: "Sky", fill: { kind: "solid", color: "#0EA5E9" } },
];

/** An uploaded SVG available in the palette. */
export interface Asset {
  id: string;
  name: string;
  /** Sanitized, id-namespaced inner markup of the uploaded <svg>. */
  inner: string;
  viewBox: { minX: number; minY: number; width: number; height: number };
}

/** Background/finish treatment of the app-icon. */
export type Treatment = "glossy" | "flat" | "matte" | "inverted";
/** Outer silhouette of the app-icon. */
export type Shape = "squircle" | "circle" | "rounded";

export interface IconStyle {
  treatment: Treatment;
  shape: Shape;
}

export const DEFAULT_STYLE: IconStyle = { treatment: "glossy", shape: "squircle" };

/** The full editable document — one unit of undo/redo history. */
export interface Doc {
  placed: Placed[];
  fill: Fill;
  style: IconStyle;
}

/** A placed instance of an asset on the icon canvas (icon-space units). */
export interface Placed {
  id: string;
  assetId: string;
  /** Center position in 272-unit icon space. */
  cx: number;
  cy: number;
  /** Absolute scale: icon units per asset unit. */
  scale: number;
  /** Rotation in degrees. */
  rot: number;
  /** Stacking order; higher draws on top. */
  z: number;
}
