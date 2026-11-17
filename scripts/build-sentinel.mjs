// Builds public/models/sentinel.glb from the supplied ORDEVAL scan.
//
//   node scripts/build-sentinel.mjs "<path to ORDEVAL  The Gilded Lionheart.glb>" [out]
//
// The source is a static, unrigged 1.9M-triangle mesh. This script:
//   1. welds and decimates it to a web budget (meshoptimizer) and resizes its
//      textures to 2048 px JPEG (sharp);
//   2. moves it so the feet stand on the origin, centred on the body, facing +Z;
//   3. adds a humanoid skeleton (joint positions measured from the model) and
//      skins the mesh to it: every vertex is labelled with the bone it is
//      geodesically closest to along the surface (so a hand resting by a thigh
//      plate does not pick up the leg), the sword is bound rigidly to the right
//      hand, and the labels are blended across a narrow band at each border.
//
// Dev-only tooling (devDependencies); the output is committed, the source is not.
import { Document, NodeIO } from "@gltf-transform/core";
import { dedup, prune, simplify, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const [input, output = "public/models/sentinel.glb", ratioArg = "0.03"] = process.argv.slice(2);
if (!input) throw new Error("usage: node scripts/build-sentinel.mjs <source.glb> [out.glb] [ratio]");

// ---------------------------------------------------------------------------
// Skeleton, in the source model's own coordinates (metres; feet at y -0.952,
// facing +Z, the sword in the right hand on the -X side).
// [name, parent, position, seed radius]
const BONES = [
  ["Hips", null, [0.125, -0.03, 0.0], 0.2],
  ["Spine", "Hips", [0.125, 0.14, 0.0], 0.2],
  ["Chest", "Spine", [0.125, 0.32, 0.01], 0.24],
  ["neck", "Chest", [0.125, 0.52, 0.03], 0.09],
  ["Head", "neck", [0.125, 0.585, 0.05], 0.26],
  ["LeftArm", "Chest", [0.305, 0.44, -0.07], 0.13],
  ["LeftForeArm", "LeftArm", [0.385, 0.19, -0.11], 0.1],
  ["LeftHand", "LeftForeArm", [0.455, -0.04, -0.05], 0.09],
  ["RightArm", "Chest", [-0.065, 0.435, -0.07], 0.13],
  ["RightForeArm", "RightArm", [-0.145, 0.19, -0.11], 0.1],
  ["RightHand", "RightForeArm", [-0.2, -0.03, -0.05], 0.09],
  ["LeftUpLeg", "Hips", [0.24, -0.09, 0.0], 0.14],
  ["LeftLeg", "LeftUpLeg", [0.295, -0.46, -0.01], 0.13],
  ["LeftFoot", "LeftLeg", [0.335, -0.84, -0.04], 0.13],
  ["RightUpLeg", "Hips", [0.06, -0.09, 0.0], 0.14],
  ["RightLeg", "RightUpLeg", [-0.04, -0.46, -0.01], 0.13],
  ["RightFoot", "RightLeg", [-0.1, -0.84, -0.04], 0.13],
  // The sword, rigid, pivoting at the centre of its grip. Driven on its own
  // (planted point-down in front of him), the hands follow it.
  ["Sword", "Hips", [-0.186, -0.07, 0.063], 0],
];
// Where each bone's segment ends (its child joint, or a tip for end bones).
const TIPS = {
  Head: [0.125, 0.8, 0.07],
  LeftHand: [0.46, -0.17, 0.0],
  RightHand: [-0.19, -0.15, 0.0],
  LeftFoot: [0.35, -0.93, 0.12],
  RightFoot: [-0.12, -0.93, 0.12],
  Chest: [0.125, 0.52, 0.03],
};
// The sword: pommel to tip, plus the crossguard. The blade leans forward
// (+Z) as it falls: measured from the mesh, slice by slice.
const SWORD = { a: [-0.124, 0.06, 0.017], b: [-0.506, -0.935, 0.205], r: 0.06 };
const GUARD = { min: [-0.36, -0.22, -0.08], max: [-0.1, -0.12, 0.08] };
const SHIFT = [-0.125, 0.952, 0]; // source to output (feet on the origin, body centred)
const SMOOTH_PASSES = 4;

// ---------------------------------------------------------------------------
const io = new NodeIO();
const doc = await io.read(input);
await MeshoptSimplifier.ready;
await doc.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: Number(ratioArg), error: 0.002 }),
  dedup(),
  prune(),
  textureCompress({ encoder: sharp, targetFormat: "jpeg", resize: [2048, 2048], quality: 86 }),
);

const root = doc.getRoot();
const meshNode = root.listNodes().find((n) => n.getMesh());
const prim = meshNode.getMesh().listPrimitives()[0];
const posAcc = prim.getAttribute("POSITION");
const pos = posAcc.getArray().slice();
const n = posAcc.getCount();
const idx = prim.getIndices().getArray();

// Merge vertices that share a position (UV seams) so the surface is one graph.
const key = (i) => `${Math.round(pos[i * 3] * 1e5)},${Math.round(pos[i * 3 + 1] * 1e5)},${Math.round(pos[i * 3 + 2] * 1e5)}`;
const rep = new Int32Array(n);
{
  const seen = new Map();
  for (let i = 0; i < n; i++) {
    const k = key(i);
    const r = seen.get(k);
    if (r === undefined) { seen.set(k, i); rep[i] = i; } else rep[i] = r;
  }
}
const adj = Array.from({ length: n }, () => []);
const link = (a, b) => {
  a = rep[a]; b = rep[b];
  if (a === b) return;
  const d = Math.hypot(pos[a * 3] - pos[b * 3], pos[a * 3 + 1] - pos[b * 3 + 1], pos[a * 3 + 2] - pos[b * 3 + 2]);
  adj[a].push(b, d); adj[b].push(a, d);
};
for (let t = 0; t < idx.length; t += 3) { link(idx[t], idx[t + 1]); link(idx[t + 1], idx[t + 2]); link(idx[t + 2], idx[t]); }

// Bone segments.
const byName = Object.fromEntries(BONES.map((b, i) => [b[0], i]));
// Each bone's segment runs to its main child (the limb continues; side branches do not).
const segs = BONES.map(([name, , p]) => {
  const child = BONES.find((b) => b[1] === name && !/(Arm|UpLeg)$/.test(b[0]) && b[0] !== "neck") ?? null;
  return [p, TIPS[name] ?? (child ? child[2] : p)];
});
function segDist(p, [a, b]) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const L = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1;
  const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / L));
  return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t);
}
const B = BONES.length;
const P = (i) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
const inSword = (p) =>
  segDist(p, [SWORD.a, SWORD.b]) < SWORD.r ||
  (p[0] > GUARD.min[0] && p[0] < GUARD.max[0] && p[1] > GUARD.min[1] && p[1] < GUARD.max[1] && p[2] > GUARD.min[2] && p[2] < GUARD.max[2]);
const SW = byName.Sword;

// Multi-source Dijkstra: seeds are vertices close to (and nearest to) a bone.
const dist = new Float64Array(n).fill(Infinity);
const label = new Int32Array(n).fill(-1);
const locked = new Uint8Array(n);
const heap = []; // binary heap of [d, v, bone]
const push = (e) => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= e[0]) break; heap[i] = heap[p]; i = p; } heap[i] = e; };
const pop = () => {
  const top = heap[0]; const last = heap.pop();
  if (heap.length) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= heap.length) break; if (c + 1 < heap.length && heap[c + 1][0] < heap[c][0]) c++; if (heap[c][0] >= last[0]) break; heap[i] = heap[c]; i = c; } heap[i] = last; }
  return top;
};
for (let i = 0; i < n; i++) {
  if (rep[i] !== i) continue;
  const p = P(i);
  if (inSword(p)) { label[i] = SW; dist[i] = 0; locked[i] = 1; continue; }
  let best = -1, bd = Infinity;
  for (let b = 0; b < B; b++) { if (b === SW) continue; const d = segDist(p, segs[b]); if (d < bd) { bd = d; best = b; } }
  if (bd < BONES[best][3]) push([bd, i, best]);
}
while (heap.length) {
  const [d, v, b] = pop();
  if (d >= dist[v]) continue;
  dist[v] = d; label[v] = b;
  for (let k = 0; k < adj[v].length; k += 2) {
    const u = adj[v][k];
    if (locked[u]) continue;
    const nd = d + adj[v][k + 1];
    if (nd < dist[u]) push([nd, u, b]);
  }
}
let orphans = 0;
for (let i = 0; i < n; i++) {
  if (rep[i] !== i || label[i] >= 0) continue;
  orphans++;
  const p = P(i);
  let best = 0, bd = Infinity;
  for (let b = 0; b < B; b++) { if (b === SW) continue; const d = segDist(p, segs[b]); if (d < bd) { bd = d; best = b; } }
  label[i] = best;
}
{
  // Report the torso's horizontal centre (for SHIFT).
  const xs = [];
  for (let i = 0; i < n; i++) if (rep[i] === i && (label[i] === byName.Chest || label[i] === byName.Spine)) xs.push(pos[i * 3]);
  xs.sort((a, b) => a - b);
  console.log("torso x: min", xs[0].toFixed(3), "median", xs[xs.length >> 1].toFixed(3), "max", xs[xs.length - 1].toFixed(3));
}

// Blend across borders: a few passes of neighbour averaging on one-hot weights.
let w = new Float32Array(n * B);
for (let i = 0; i < n; i++) if (rep[i] === i) w[i * B + label[i]] = 1;
for (let pass = 0; pass < SMOOTH_PASSES; pass++) {
  const next = w.slice();
  for (let i = 0; i < n; i++) {
    if (rep[i] !== i || locked[i] || adj[i].length === 0) continue;
    const acc = new Float32Array(B);
    for (let b = 0; b < B; b++) acc[b] = w[i * B + b];
    const deg = adj[i].length / 2;
    for (let k = 0; k < adj[i].length; k += 2) { const u = adj[i][k]; for (let b = 0; b < B; b++) acc[b] += w[u * B + b]; }
    for (let b = 0; b < B; b++) next[i * B + b] = acc[b] / (deg + 1);
  }
  w = next;
}

// Top four influences per vertex, normalised; seam duplicates copy their representative.
const joints = new Uint16Array(n * 4);
const weights = new Float32Array(n * 4);
const counts = new Array(B).fill(0);
for (let i = 0; i < n; i++) {
  const r = rep[i];
  const order = [...Array(B).keys()].sort((a, b) => w[r * B + b] - w[r * B + a]).slice(0, 4);
  let sum = 0;
  for (const b of order) sum += w[r * B + b];
  order.forEach((b, k) => { joints[i * 4 + k] = b; weights[i * 4 + k] = sum > 0 ? w[r * B + b] / sum : k === 0 ? 1 : 0; });
  counts[order[0]]++;
}

// Recentre the mesh.
for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) pos[i * 3 + k] += SHIFT[k];
posAcc.setArray(pos);

// Skeleton nodes (rest rotation identity: joint frames are the model's axes).
const scene = root.listScenes()[0];
const buffer = root.listBuffers()[0];
const nodes = [];
for (const [name, parent, p] of BONES) {
  const world = [p[0] + SHIFT[0], p[1] + SHIFT[1], p[2] + SHIFT[2]];
  const par = parent ? BONES[byName[parent]][2] : null;
  const local = par ? [p[0] - par[0], p[1] - par[1], p[2] - par[2]] : world;
  const node = doc.createNode(name).setTranslation(local);
  nodes.push(node);
  if (parent) nodes[byName[parent]].addChild(node); else scene.addChild(node);
}
const ibm = new Float32Array(B * 16);
BONES.forEach(([, , p], b) => {
  const m = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -(p[0] + SHIFT[0]), -(p[1] + SHIFT[1]), -(p[2] + SHIFT[2]), 1];
  ibm.set(m, b * 16);
});
const skin = doc.createSkin("sentinel").setSkeleton(nodes[0])
  .setInverseBindMatrices(doc.createAccessor("ibm").setType("MAT4").setArray(ibm).setBuffer(buffer));
for (const node of nodes) skin.addJoint(node);
prim.setAttribute("JOINTS_0", doc.createAccessor("joints").setType("VEC4").setArray(joints).setBuffer(buffer));
prim.setAttribute("WEIGHTS_0", doc.createAccessor("weights").setType("VEC4").setArray(weights).setBuffer(buffer));
meshNode.setSkin(skin).setName("ORDEVAL");
meshNode.getMesh().setName("ORDEVAL");
prim.getMaterial()?.setName("ORDEVAL");

doc.getRoot().getAsset().generator = "NEXUS build-sentinel (from meshy-scene source)";
await io.write(output, doc);
console.log(`verts ${n} tris ${idx.length / 3} orphans ${orphans}`);
console.log(BONES.map(([name], b) => `${name}:${counts[b]}`).join(" "));
