// Particle shader for the methanol→formaldehyde plume.
// Each point flows down the column; its color is sampled from a 1D species
// LUT computed by the worker, so the gradient on screen literally is the
// reaction profile.

export const particlesVertex = /* glsl */ `
precision highp float;

attribute float aSeed;
attribute float aSpeed;

uniform float uTime;
uniform float uTopY;
uniform float uBottomY;
uniform float uTSpeed;
uniform float uReducedMotion;
uniform float uPointSize;
uniform float uPixelRatio;
uniform float uColumnHalfWidth;
uniform sampler2D uLut;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec3 pos = position;

  // Axial flow: cycle each particle from top to bottom over time
  float height = uTopY - uBottomY;
  float baseY = mod(pos.y - uTime * uTSpeed * aSpeed * (1.0 - uReducedMotion * 0.85), height);
  if (baseY < 0.0) baseY += height;
  float y = uTopY - baseY;

  // Mild lateral wobble inside the column, dampened by reduced motion
  float wobble = sin(uTime * 0.6 + aSeed * 6.2831) * 0.06;
  float x = pos.x + wobble * (1.0 - uReducedMotion);
  // Snug to the column walls at the entrance and exit (hourglass-ish flow)
  float taper = 1.0 - smoothstep(0.0, 1.0, abs((y - 0.5 * (uTopY + uBottomY)) / (0.5 * height)));
  x *= mix(0.4, 1.0, taper);

  vec3 wpos = vec3(x * uColumnHalfWidth, y, pos.z);

  vec4 mv = modelViewMatrix * vec4(wpos, 1.0);
  gl_Position = projectionMatrix * mv;

  // LUT lookup: 0 = bottom (outlet), 1 = top (inlet)
  float u = clamp((y - uBottomY) / max(height, 1e-3), 0.0, 1.0);
  vColor = texture2D(uLut, vec2(u, 0.5)).rgb;

  // Fade particles near the very top + bottom so they don't pop in
  float edgeFade = smoothstep(0.0, 0.05, u) * (1.0 - smoothstep(0.95, 1.0, u));
  vAlpha = edgeFade;

  gl_PointSize = uPointSize * uPixelRatio * (300.0 / max(-mv.z, 1.0));
}
`;

export const particlesFragment = /* glsl */ `
precision highp float;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float d = length(c);
  if (d > 0.5) discard;
  float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
  // Boost luminosity at center for a hot-particle look
  vec3 col = vColor + vec3(0.4) * pow(1.0 - d * 2.0, 4.0);
  gl_FragColor = vec4(col, alpha);
}
`;
