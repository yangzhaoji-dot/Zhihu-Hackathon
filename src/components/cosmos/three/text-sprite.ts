import * as THREE from "three";

/**
 * Camera-facing text labels drawn onto a canvas texture. Used for opinion
 * titles and question names in the 3D space. The serif face echoes the
 * "archive" visual direction from cosmos.css.
 */

export interface LabelOptions {
  color?: string;
  font?: string; // full CSS font shorthand size portion, e.g. "600 44px"
  family?: string;
  maxWidth?: number; // wrap width in canvas px
  glow?: string; // optional shadow color
  align?: "center" | "left";
  background?: string;
  border?: string;
}

const SERIF = '"Songti SC", Georgia, "Times New Roman", "Noto Serif SC", serif';
const SANS =
  'system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  // CJK-aware greedy wrap: break between any characters, not just spaces.
  const lines: string[] = [];
  let line = "";
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3); // cap at 3 lines; ellipsize the rest
}

/**
 * Build a sprite showing `text`. The sprite's world height is normalized to 1
 * unit; callers scale it to taste. Returns the sprite plus its disposables.
 */
export function makeLabel(text: string, opts: LabelOptions = {}): THREE.Sprite {
  const {
    color = "#f2ede1",
    font = "600 46px",
    family = SERIF,
    maxWidth = 520,
    glow = "rgba(5,7,15,0.9)",
    align = "center",
    background,
    border,
  } = opts;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const fontStr = `${font} ${family}`;
  ctx.font = fontStr;

  const rawLines = wrapLines(ctx, text, maxWidth);
  const fontSize = parseInt(font.match(/(\d+)px/)?.[1] ?? "46", 10);
  const lineHeight = Math.round(fontSize * 1.28);
  const pad = Math.round(fontSize * 0.5);

  const textW = Math.min(
    maxWidth,
    Math.max(...rawLines.map((l) => ctx.measureText(l).width)),
  );
  const w = Math.ceil(textW + pad * 2);
  const h = rawLines.length * lineHeight + pad * 2;
  canvas.width = w;
  canvas.height = h;

  // redraw after resize (context resets)
  ctx.font = fontStr;
  ctx.textBaseline = "middle";
  ctx.textAlign = align;
  if (background) {
    ctx.fillStyle = background;
    ctx.beginPath();
    ctx.roundRect(1, 1, w - 2, h - 2, Math.max(8, Math.round(fontSize * 0.35)));
    ctx.fill();
  }
  if (border) {
    ctx.strokeStyle = border;
    ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.05));
    ctx.beginPath();
    ctx.roundRect(2, 2, w - 4, h - 4, Math.max(8, Math.round(fontSize * 0.35)));
    ctx.stroke();
  }
  ctx.shadowColor = glow;
  ctx.shadowBlur = Math.round(fontSize * 0.5);
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = color;

  const x = align === "center" ? w / 2 : pad;
  rawLines.forEach((l, i) => {
    ctx.fillText(l, x, pad + lineHeight * (i + 0.5), maxWidth);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });
  const sprite = new THREE.Sprite(material);
  // scale sprite so 1 world-unit == fontSize; keep the canvas aspect ratio
  const scale = 1 / fontSize;
  sprite.scale.set(w * scale, h * scale, 1);
  sprite.userData.dispose = () => {
    texture.dispose();
    material.dispose();
  };
  return sprite;
}

export { SERIF, SANS };
