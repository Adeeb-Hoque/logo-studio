import { zipSync } from "fflate";

/** Standard iOS/Android app-icon sizes for the icon-set export. */
export const ICON_SET_SIZES = [
  1024, 512, 256, 192, 180, 167, 152, 120, 87, 80, 76, 60, 58, 40, 29,
];

function serialize(svg: SVGSVGElement, size?: number): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (size != null) {
    clone.setAttribute("width", String(size));
    clone.setAttribute("height", String(size));
  }
  return new XMLSerializer().serializeToString(clone);
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Rasterize a live <svg> node to a PNG Blob at `size`×`size`. Serializing the
 * SVG captures inline filters / gradients / blend modes; drawing onto a canvas
 * flattens it.
 */
export async function rasterize(svg: SVGSVGElement, size: number): Promise<Blob> {
  const data = serialize(svg, size);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data)}`;

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to rasterize SVG"));
    img.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, 0, 0, size, size);

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}

/** Rasterize and download a single PNG. */
export async function exportSvgToPng(svg: SVGSVGElement, size: number, filename: string): Promise<void> {
  download(await rasterize(svg, size), filename);
}

/** Download the live icon as a vector .svg (gradients/filters preserved). */
export function exportSvgFile(svg: SVGSVGElement, filename: string): void {
  const data = serialize(svg);
  download(new Blob([data], { type: "image/svg+xml" }), filename);
}

/** Copy a rasterized PNG of the icon to the clipboard. */
export async function copyPng(svg: SVGSVGElement, size = 1024): Promise<void> {
  const blob = await rasterize(svg, size);
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

/** Rasterize every standard size and download them as a single .zip. */
export async function exportIconSetZip(svg: SVGSVGElement, baseName: string): Promise<void> {
  const files: Record<string, Uint8Array> = {};
  for (const s of ICON_SET_SIZES) {
    const blob = await rasterize(svg, s);
    files[`${baseName}-${s}.png`] = new Uint8Array(await blob.arrayBuffer());
  }
  // PNGs are already compressed — store without re-deflating.
  const zipped = zipSync(files, { level: 0 });
  download(new Blob([zipped], { type: "application/zip" }), `${baseName}-icons.zip`);
}
