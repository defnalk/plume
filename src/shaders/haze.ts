// Heat haze plume that hangs below the reactor outlet. Driven by a stack of
// fbm noise octaves and a vertical rise term so it visually "breathes" out of
// the bottom of the column. Reduced-motion freezes the noise advection.

export const hazeVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const hazeFragment = /* glsl */ `
precision highp float;

varying vec2 vUv;
uniform float uTime;
uniform float uIntensity;
uniform float uReducedMotion;
uniform vec3 uColorHot;
uniform vec3 uColorCool;

// 2D hash + value noise + fbm — small and fast, good enough for shimmer
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  // uv (0,0) bottom — left, (1,1) top — right. We want intensity to peak just
  // below the outlet and dissipate downward and outward.
  vec2 p = vUv;
  float t = uTime * (1.0 - uReducedMotion * 0.95);

  // Vertical rise + slight horizontal sway
  vec2 q = vec2(p.x * 3.0, (1.0 - p.y) * 5.0 - t * 0.45);
  float n = fbm(q + vec2(fbm(q * 1.7) * 0.5, t * 0.2));

  // Fade horizontally (column-shaped) and vertically (peaks at top, dies at bottom)
  float horiz = smoothstep(0.5, 0.0, abs(p.x - 0.5));
  float vert = smoothstep(0.0, 0.4, p.y) * (1.0 - smoothstep(0.7, 1.0, p.y));
  float mask = horiz * vert;

  // Distort the mask with noise to break up the column shape
  float warped = n * mask;
  float core = pow(warped, 2.2) * uIntensity;

  vec3 col = mix(uColorCool, uColorHot, smoothstep(0.0, 0.6, n));
  float alpha = clamp(core * 1.4, 0.0, 0.85);

  gl_FragColor = vec4(col, alpha);
}
`;
