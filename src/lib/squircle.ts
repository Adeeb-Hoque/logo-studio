import { getSvgPath } from "figma-squircle";
import type { Shape } from "./types";

// Figma "App Icon Template" uses cornerSmoothing = 1 (full iOS squircle).
// Radius ratio comes straight from the template: 77.71 / 272 ≈ 0.2857.
export const SQUIRCLE_RADIUS_RATIO = 77.71428680419922 / 272;
export const SQUIRCLE_SMOOTHING = 1;

/**
 * SVG path string for a Figma-style squircle of the given side length.
 * The path starts at the origin; position it by wrapping the consuming
 * element in a `<g transform="translate(x y)">`.
 */
export function squirclePath(side: number): string {
  return getSvgPath({
    width: side,
    height: side,
    cornerRadius: side * SQUIRCLE_RADIUS_RATIO,
    cornerSmoothing: SQUIRCLE_SMOOTHING,
  });
}

/** A circle inscribed in the [0,side] square, as an SVG path from the origin. */
export function circlePath(side: number): string {
  const r = side / 2;
  return `M 0,${r} a ${r},${r} 0 1,0 ${side},0 a ${r},${r} 0 1,0 ${-side},0 Z`;
}

/** A rounded square of `side`, corner radius `r`, path from the origin. */
export function roundedRectPath(side: number, r: number): string {
  return `M ${r},0 H ${side - r} A ${r},${r} 0 0 1 ${side},${r} V ${side - r} A ${r},${r} 0 0 1 ${side - r},${side} H ${r} A ${r},${r} 0 0 1 0,${side - r} V ${r} A ${r},${r} 0 0 1 ${r},0 Z`;
}

/** Outer silhouette path for the chosen shape at the given side length. */
export function shapePath(shape: Shape, side: number): string {
  if (shape === "circle") return circlePath(side);
  if (shape === "rounded") return roundedRectPath(side, side * 0.18);
  return squirclePath(side);
}
