import { ARRIVAL, CITY, GRID } from "./layout";

/**
 * GLSL shared by every surface the street lamps light: the carriageways
 * and the sidewalks. Lamp positions follow from the grid (one lamp at the
 * middle of every block edge), so pools are computed analytically instead
 * of with hundreds of real lights.
 */
const f = (n: number) => n.toFixed(3);

export const GRID_GLSL = /* glsl */ `
const float G_PX = ${f(GRID.px)};
const float G_PZ = ${f(GRID.pz)};
const float G_Z0 = ${f(GRID.z0)};
const float G_ROAD = ${f(GRID.road)};
const float G_AVE = ${f(GRID.avenue)};
const float G_MED = ${f(GRID.median)};
float lpHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
`;

export const LAMP_POOL_GLSL = /* glsl */ `
${GRID_GLSL}
// Warm pool of light under the nearest street lamps, 0..1.
float lampPool(vec2 p) {
  float xi = floor(p.x / G_PX + 0.5);
  float hw = abs(xi) < 0.5 ? G_AVE : G_ROAD;
  // Lamps beside north-south streets, at the middle of each block.
  float zc = G_Z0 + G_PZ * (floor((p.y - G_Z0) / G_PZ) + 0.5);
  float dA = length(vec2(abs(p.x - xi * G_PX) - hw + 0.15, p.y - zc));
  // Lamps beside east-west streets.
  float k = floor((p.y - G_Z0) / G_PZ + 0.5);
  float xc = G_PX * (floor(p.x / G_PX) + 0.5);
  float dB = length(vec2(abs(p.y - G_Z0 - k * G_PZ) - G_ROAD + 0.15, p.x - xc));
  // Twin lamps on the avenue median.
  float dC = abs(xi) < 0.5 ? length(vec2(p.x, p.y - zc)) * 0.8 : 99.0;
  float d = min(min(dA, dB), dC);
  return exp(-d * d * 0.6);
}
`;

/** Asphalt, lane markings and crossings for the ground plane, in world space. */
export const ROAD_GLSL = /* glsl */ `
${LAMP_POOL_GLSL}
const vec4 R_CITY = vec4(${f(CITY.x0)}, ${f(CITY.x1)}, ${f(CITY.z0)}, ${f(CITY.z1)});
const vec4 R_ARRIVAL = vec4(${f(ARRIVAL.x0)}, ${f(ARRIVAL.x1)}, ${f(ARRIVAL.z0)}, ${f(ARRIVAL.z1)});

float inRect(vec2 p, vec4 r, float m) {
  return step(r.x - m, p.x) * step(p.x, r.y + m) * step(r.z - m, p.y) * step(p.y, r.w + m);
}

// Returns asphalt colour with markings in rgb, and 1 in a where the point is street.
vec4 street(vec2 p, float arrival) {
  float area = max(inRect(p, R_CITY, G_ROAD), inRect(p, R_ARRIVAL, G_ROAD) * arrival);
  if (area < 0.5) return vec4(0.0);
  vec2 fw = fwidth(p);
  float px = max(fw.x, fw.y);
  float fade = 1.0 - smoothstep(0.08, 0.3, px);

  float xi = floor(p.x / G_PX + 0.5);
  float dx = p.x - xi * G_PX;
  float k = floor((p.y - G_Z0) / G_PZ + 0.5);
  float dz = p.y - G_Z0 - k * G_PZ;
  bool ave = abs(xi) < 0.5;
  float hw = ave ? G_AVE : G_ROAD;
  bool ns = abs(dx) < hw;
  bool ew = abs(dz) < G_ROAD;

  float grain = lpHash(floor(p * 6.0));
  vec3 col = vec3(0.034, 0.036, 0.04) * (0.85 + 0.3 * grain);
  // Tyre tracks: slightly polished in the middle of each lane.
  if (ns && !ew) col *= 1.0 + 0.12 * smoothstep(0.5, 0.0, abs(abs(dx) - hw * 0.5));
  if (ew && !ns) col *= 1.0 + 0.12 * smoothstep(0.5, 0.0, abs(abs(dz) - G_ROAD * 0.5));

  float paint = 0.0;
  float aa = px * 0.8 + 0.004;
  float dash = 0.0;
  if (ns && !ew) {
    float runZ = fract(p.y * 0.42);
    if (ave) {
      // Lane lines either side of the median.
      dash = (1.0 - smoothstep(0.045, 0.045 + aa, abs(abs(dx) - 3.65))) * step(runZ, 0.45);
    } else {
      dash = (1.0 - smoothstep(0.04, 0.04 + aa, abs(dx))) * step(runZ, 0.5);
    }
    // Zebra crossing on the approach to every junction.
    float cz = abs(dz) - G_ROAD;
    if (cz > 0.25 && cz < 1.05) paint = max(paint, step(0.5, fract(dx * 2.1)) * step(abs(dx), hw - 0.2));
    if (cz > 1.12 && cz < 1.2) paint = 1.0;
  }
  if (ew && !ns) {
    dash = max(dash, (1.0 - smoothstep(0.04, 0.04 + aa, abs(dz))) * step(fract(p.x * 0.42), 0.5));
    float cx = abs(dx) - hw;
    if (cx > 0.25 && cx < 1.05) paint = max(paint, step(0.5, fract(dz * 2.1)) * step(abs(dz), G_ROAD - 0.2));
    if (cx > 1.12 && cx < 1.2) paint = 1.0;
  }
  paint = max(paint, dash);
  col = mix(col, vec3(0.42, 0.42, 0.4), paint * fade * 0.85);
  col += vec3(1.0, 0.78, 0.5) * lampPool(p) * 0.07;
  return vec4(col, 1.0);
}
`;
