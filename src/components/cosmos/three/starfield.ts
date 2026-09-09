import * as THREE from "three";
import { CY, VI, GOLD, GOLD_BRIGHT } from "./palette";

/**
 * Deep-space backdrop: a layered star field with subtle parallax plus optional
 * soft nebula clouds. Built as one Points object (never one mesh per star) so
 * thousands of stars cost a single draw call. Colors lean toward the cosmos
 * palette — cool cyan/violet dust warmed by occasional gold embers.
 */

export interface Starfield {
  group: THREE.Group;
  update: (t: number) => void;
  dispose: () => void;
}

const STAR_VERT = /* glsl */ `
  attribute float size;
  attribute float twinkle;
  attribute vec3 tint;
  varying vec3 vTint;
  varying float vTwinkle;
  uniform float uTime;
  uniform float uPixelRatio;
  void main() {
    vTint = tint;
    // each star breathes on its own phase
    vTwinkle = 0.55 + 0.45 * sin(uTime * 1.3 + twinkle * 6.2831);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * uPixelRatio * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const STAR_FRAG = /* glsl */ `
  varying vec3 vTint;
  varying float vTwinkle;
  void main() {
    // soft round sprite with a bright core
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float alpha = smoothstep(0.5, 0.0, d);
    float core = smoothstep(0.22, 0.0, d);
    vec3 col = vTint + core * 0.6;
    gl_FragColor = vec4(col, alpha * vTwinkle);
  }
`;

export function createStarfield(count: number, radius = 220, withNebula = true): Starfield {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  // ── stars ────────────────────────────────────────────────────────────
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const twinkles = new Float32Array(count);
  const tints = new Float32Array(count * 3);

  const cCy = new THREE.Color(CY);
  const cVi = new THREE.Color(VI);
  const cGold = new THREE.Color(GOLD_BRIGHT);
  const cWhite = new THREE.Color("#dfe7f0");
  const tmp = new THREE.Color();

  for (let i = 0; i < count; i++) {
    // distribute in a spherical shell with depth variance
    const r = radius * (0.35 + Math.random() * 0.65);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.7; // flatten vertically a touch
    positions[i * 3 + 2] = r * Math.cos(phi);

    sizes[i] = 0.6 + Math.random() * 2.6;
    twinkles[i] = Math.random();

    // mostly cool white, seasoned with cyan/violet dust and rare gold embers
    const roll = Math.random();
    if (roll > 0.93) tmp.copy(cGold);
    else if (roll > 0.72) tmp.copy(cVi);
    else if (roll > 0.5) tmp.copy(cCy);
    else tmp.copy(cWhite);
    tmp.multiplyScalar(0.5 + Math.random() * 0.5);
    tints[i * 3] = tmp.r;
    tints[i * 3 + 1] = tmp.g;
    tints[i * 3 + 2] = tmp.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute("twinkle", new THREE.BufferAttribute(twinkles, 1));
  geo.setAttribute("tint", new THREE.BufferAttribute(tints, 3));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    },
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  group.add(points);
  disposables.push(geo, mat);

  // ── nebula clouds (soft additive sprites) ──────────────────────────────
  const nebulaSprites: THREE.Sprite[] = [];
  if (withNebula) {
    const tex = makeNebulaTexture();
    disposables.push(tex);
    const hues = [CY, VI, GOLD];
    for (let i = 0; i < 5; i++) {
      const m = new THREE.SpriteMaterial({
        map: tex,
        color: new THREE.Color(hues[i % hues.length]),
        transparent: true,
        opacity: 0.06 + Math.random() * 0.05,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const s = new THREE.Sprite(m);
      const rr = radius * 0.7;
      s.position.set(
        (Math.random() - 0.5) * rr,
        (Math.random() - 0.5) * rr * 0.6,
        -radius * (0.4 + Math.random() * 0.4),
      );
      const scale = 90 + Math.random() * 120;
      s.scale.set(scale, scale, 1);
      group.add(s);
      nebulaSprites.push(s);
      disposables.push(m);
    }
  }

  return {
    group,
    update: (t: number) => {
      mat.uniforms.uTime.value = t;
      group.rotation.y = t * 0.006; // very slow drift
      for (let i = 0; i < nebulaSprites.length; i++) {
        nebulaSprites[i].material.rotation = t * 0.02 * (i % 2 ? 1 : -1);
      }
    },
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}

/** Radial-gradient blob used for soft nebula sprites. */
function makeNebulaTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.4, "rgba(255,255,255,0.25)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export { GOLD_BRIGHT };
