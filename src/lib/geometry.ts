import type { Asset, Placed } from "./types";

/** Icon coordinate space — matches IconRenderer's SIZE. */
export const ICON_SIZE = 272;
/** Longest side a freshly dropped component fits to, in icon units. */
export const DROP_FIT = 96;

export function assetCenter(a: Asset): { x: number; y: number } {
  return {
    x: a.viewBox.minX + a.viewBox.width / 2,
    y: a.viewBox.minY + a.viewBox.height / 2,
  };
}

/** Absolute scale so the asset's longest side ≈ DROP_FIT icon units. */
export function fitScale(a: Asset): number {
  return DROP_FIT / Math.max(a.viewBox.width, a.viewBox.height);
}

/** SVG transform placing a component at cx,cy with rotation + scale. */
export function placedTransform(p: Placed, a: Asset): string {
  const c = assetCenter(a);
  return `translate(${p.cx} ${p.cy}) rotate(${p.rot}) scale(${p.scale}) translate(${-c.x} ${-c.y})`;
}

/** Component's on-screen box (unrotated) in pixels, given rendered side S. */
export function boxSizePx(p: Placed, a: Asset, S: number): { w: number; h: number } {
  const k = (p.scale / ICON_SIZE) * S;
  return { w: a.viewBox.width * k, h: a.viewBox.height * k };
}

/** Component center mapped to screen pixels. */
export function centerPx(p: Placed, S: number): { x: number; y: number } {
  return { x: (p.cx / ICON_SIZE) * S, y: (p.cy / ICON_SIZE) * S };
}

/** Map a screen-pixel delta back into icon units. */
export function pxToIcon(d: number, S: number): number {
  return (d / S) * ICON_SIZE;
}

/** Map a screen point (px, relative to canvas) to normalized 0..1. */
export function toNorm(px: number, S: number): number {
  return clamp01(px / S);
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

export function angleDeg(cx: number, cy: number, px: number, py: number): number {
  return (Math.atan2(py - cy, px - cx) * 180) / Math.PI;
}
