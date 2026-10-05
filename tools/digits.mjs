#!/usr/bin/env node
// A spoken-digit benchmark for the bank: the first honest number for how it
// does on a real task.
//
// Data: the Free Spoken Digit Dataset (Jakobovski et al.), 3,000 recordings
// of the digits 0-9 by six speakers at 8 kHz, not included here. Fetch it:
//   mkdir fsdd && cd fsdd && for d in 0 1 2 3 4 5 6 7 8 9; do
//     for s in george jackson lucas nicolas theo yweweler; do
//       for i in $(seq 0 49); do curl -sSO \
//         https://raw.githubusercontent.com/Jakobovski/free-spoken-digit-dataset/master/recordings/${d}_${s}_${i}.wav
//   done; done; done
// Split: the dataset's own, recordings 0-4 of each digit and speaker to test
// (300), 5-49 to train (2,700).
//
// Usage: node tools/digits.mjs path/to/fsdd
//
// The bank runs at 50 steps per second, so speech reaches it the way it would
// reach anything that slow: as loudness envelopes. Two front ends:
//   one channel  — the overall loudness drives all eleven oscillators, the
//                  way the main page's single input does;
//   eleven bands — a crude cochlea: eleven frequency bands from 100 Hz to
//                  3.8 kHz, each band's loudness driving its own oscillator.
// Every condition is read by the same kind of readout: ridge regression on
// the mean and the end-value of each feature over thirds of the utterance,
// one output per digit, highest output wins. The "no bank" rows read the
// front end's own envelopes the same way, so the difference is what the
// bank adds.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scope = {};
new Function("window", readFileSync(join(root, "lab", "kit.js"), "utf8"))(scope);
const Kit = scope.Kit;

const dir = process.argv[2];
if (!dir) { console.error("usage: node tools/digits.mjs path/to/fsdd"); process.exit(2); }

// ── wav ──
function readWav(path) {
  const b = readFileSync(path);
  let off = 12, fs = 8000, bits = 16, data = null;
  while (off + 8 <= b.length) {
    const id = b.toString("ascii", off, off + 4), size = b.readUInt32LE(off + 4);
    if (id === "fmt ") { fs = b.readUInt32LE(off + 12); bits = b.readUInt16LE(off + 22); }
    if (id === "data") { data = b.subarray(off + 8, off + 8 + size); break; }
    off += 8 + size + (size & 1);
  }
  const n = bits === 16 ? data.length >> 1 : data.length;
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = bits === 16 ? data.readInt16LE(2 * i) / 32768 : (data[i] - 128) / 128;
  return { x, fs };
}

// ── front end: 40 ms frames every 20 ms, FFT, eleven log-spaced bands ──
const NB = 11, HOP_S = Kit.DT;
function fftReal(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
function frontEnd({ x, fs }) {
  const hop = Math.round(fs * HOP_S), win = 2 * hop, nfft = 512;
  const edges = []; for (let b = 0; b <= NB; b++) edges.push(100 * Math.pow(3800 / 100, b / NB));
  const T = Math.max(1, Math.floor((x.length - win) / hop) + 1);
  const bands = []; const total = new Float64Array(T);
  for (let t = 0; t < T; t++) {
    const re = new Float64Array(nfft), im = new Float64Array(nfft);
    for (let i = 0; i < win && t * hop + i < x.length; i++) re[i] = x[t * hop + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / win));
    fftReal(re, im);
    const e = new Float64Array(NB); let all = 0;
    for (let k = 1; k < nfft / 2; k++) {
      const f = k * fs / nfft, p = re[k] * re[k] + im[k] * im[k];
      all += p;
      for (let b = 0; b < NB; b++) if (f >= edges[b] && f < edges[b + 1]) e[b] += p;
    }
    bands.push(e.map((v) => Math.log(v + 1e-8)));
    total[t] = Math.log(all + 1e-8);
  }
  return { bands, total, T };
}

// ── load everything ──
const files = readdirSync(dir).filter((f) => /^\d_[a-z]+_\d+\.wav$/.test(f)).sort();
if (files.length < 100) { console.error("found only " + files.length + " recordings in " + dir); process.exit(2); }
const items = files.map((f) => {
  const [d, spk, idx] = f.replace(".wav", "").split("_");
  return { digit: +d, spk, idx: +idx, test: +idx < 5, fe: frontEnd(readWav(join(dir, f))) };
});
const train = items.filter((it) => !it.test), test = items.filter((it) => it.test);
console.log(files.length + " recordings · " + train.length + " to train, " + test.length + " to test · chance is 10%");

// squash log energies into the input range the bank expects, using train statistics
function stats(get) {
  let s = 0, ss = 0, n = 0;
  train.forEach((it) => get(it).forEach((v) => { s += v; ss += v * v; n++; }));
  const m = s / n; return { m, sd: Math.sqrt(ss / n - m * m) };
}
const stT = stats((it) => Array.from(it.fe.total));
const stB = []; for (let b = 0; b < NB; b++) stB.push(stats((it) => it.fe.bands.map((e) => e[b])));
const squash = (v, st) => 0.8 * Math.tanh((v - st.m) / (2 * st.sd));
items.forEach((it) => {
  it.u1 = Array.from(it.fe.total, (v) => squash(v, stT));
  it.u11 = it.fe.bands.map((e) => Array.from(e, (v, b) => squash(v, stB[b])));
});

// ── the bank, with one input per oscillator (index.html's equations) ──
const OMEGA = Kit.omegas(Kit.intervals(Kit.edo(12)));
const N = OMEGA.length, DECAY = Math.exp(-Kit.GAMMA * Kit.DT), DT = Kit.DT;
const DRIVE = Kit.bench(OMEGA).DRIVE;
function runBank(inputs, K, scale, perOsc) {
  const rc = OMEGA.map((w) => Math.cos(w * scale * DT)), rs = OMEGA.map((w) => Math.sin(w * scale * DT));
  const re = new Float64Array(N), im = new Float64Array(N), out = [];
  for (let t = 0; t < inputs.length; t++) {
    let mr = 0, mi = 0; for (let q = 0; q < N; q++) { mr += re[q]; mi += im[q]; } mr /= N; mi /= N;
    const nr = new Float64Array(N), ni = new Float64Array(N);
    for (let j = 0; j < N; j++) {
      const r = re[j], m = im[j], a2 = r * r + m * m;
      let xr = DECAY * (r * rc[j] - m * rs[j]), xi = DECAY * (r * rs[j] + m * rc[j]);
      xr -= DT * a2 * r; xi -= DT * a2 * m;
      xr += DT * K * (mr - r); xi += DT * K * (mi - m);
      xr += DRIVE[j] * (perOsc ? inputs[t][j] : inputs[t]) * 0.30;
      const mag = Math.hypot(xr, xi); if (mag > 6) { xr *= 6 / mag; xi *= 6 / mag; }
      nr[j] = xr; ni[j] = xi;
    }
    re.set(nr); im.set(ni);
    const f = new Float64Array(3 * N);
    for (let j = 0; j < N; j++) { f[j] = re[j]; f[N + j] = im[j]; f[2 * N + j] = re[j] * re[j] + im[j] * im[j]; }
    out.push(f);
  }
  return out;
}

// ── features: mean and end value over each third ──
function pool(series, parts) {
  const P = parts || 3, T = series.length, d = series[0].length, out = [];
  for (let s = 0; s < P; s++) {
    const a = Math.min(T - 1, Math.floor(s * T / P)), b = Math.max(a + 1, Math.floor((s + 1) * T / P));
    const mean = new Float64Array(d);
    for (let t = a; t < b; t++) for (let k = 0; k < d; k++) mean[k] += series[t][k] / (b - a);
    out.push(...mean, ...series[b - 1]);
  }
  return out;
}
const withSquares = (row) => { const r = Array.from(row); return r.concat(r.map((v) => v * v)); };

// ── ridge readout, one output per digit, lambda by 5-fold CV on train ──
function solve(A, B, n, m) { // A n×n (destroyed), B n×m → X
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r * n + c]) > Math.abs(A[p * n + c])) p = r;
    if (p !== c) { for (let k = 0; k < n; k++) [A[c * n + k], A[p * n + k]] = [A[p * n + k], A[c * n + k]]; for (let k = 0; k < m; k++) [B[c * m + k], B[p * m + k]] = [B[p * m + k], B[c * m + k]]; }
    const d = A[c * n + c] || 1e-12;
    for (let r = c + 1; r < n; r++) { const f = A[r * n + c] / d; if (!f) continue; for (let k = c; k < n; k++) A[r * n + k] -= f * A[c * n + k]; for (let k = 0; k < m; k++) B[r * m + k] -= f * B[c * m + k]; }
  }
  const X = new Float64Array(n * m);
  for (let r = n - 1; r >= 0; r--) for (let k = 0; k < m; k++) { let s = B[r * m + k]; for (let c = r + 1; c < n; c++) s -= A[r * n + c] * X[c * m + k]; X[r * m + k] = s / (A[r * n + r] || 1e-12); }
  return X;
}
function fit(rows, labels, lam) {
  const p = rows[0].length + 1, XtX = new Float64Array(p * p), XtY = new Float64Array(p * 10);
  rows.forEach((r, i) => { const x = [...r, 1]; for (let a = 0; a < p; a++) { for (let b = a; b < p; b++) XtX[a * p + b] += x[a] * x[b]; XtY[a * 10 + labels[i]] += x[a]; } });
  for (let a = 0; a < p; a++) for (let b = 0; b < a; b++) XtX[a * p + b] = XtX[b * p + a];
  for (let a = 0; a < p - 1; a++) XtX[a * p + a] += lam * rows.length;
  return solve(XtX, XtY, p, 10);
}
function predict(W, r) { const x = [...r, 1], p = x.length; let best = 0, bv = -Infinity; for (let k = 0; k < 10; k++) { let s = 0; for (let a = 0; a < p; a++) s += W[a * 10 + k] * x[a]; if (s > bv) { bv = s; best = k; } } return best; }
function standardize(trainRows, testRows) {
  const d = trainRows[0].length, m = new Float64Array(d), sd = new Float64Array(d);
  trainRows.forEach((r) => r.forEach((v, k) => { m[k] += v / trainRows.length; }));
  trainRows.forEach((r) => r.forEach((v, k) => { sd[k] += (v - m[k]) ** 2 / trainRows.length; }));
  const z = (r) => r.map((v, k) => (v - m[k]) / (Math.sqrt(sd[k]) || 1));
  return [trainRows.map(z), testRows.map(z)];
}
function evaluate(featOf) {
  const trR = train.map(featOf), teR = test.map(featOf);
  const [tr, te] = standardize(trR, teR);
  const ytr = train.map((it) => it.digit), yte = test.map((it) => it.digit);
  let bestLam = 1e-3, bestAcc = -1;
  for (const lam of [1e-4, 1e-3, 1e-2, 1e-1, 1]) {
    let ok = 0;
    for (let f = 0; f < 5; f++) {
      const tI = [], vI = []; tr.forEach((_, i) => ((i * 7919) % 5 === f ? vI : tI).push(i));
      const W = fit(tI.map((i) => tr[i]), tI.map((i) => ytr[i]), lam);
      vI.forEach((i) => { if (predict(W, tr[i]) === ytr[i]) ok++; });
    }
    if (ok > bestAcc) { bestAcc = ok; bestLam = lam; }
  }
  const W = fit(tr, ytr, bestLam);
  let ok = 0; te.forEach((r, i) => { if (predict(W, r) === yte[i]) ok++; });
  return { acc: ok / te.length, feats: tr[0].length, lam: bestLam };
}

const rows = [
  ["one channel, no bank (loudness read directly)", (it) => pool(it.u1.map((v) => [v, v * v]))],
  ["one channel, no bank, loudness in 24 slices", (it) => pool(it.u1.map((v) => [v, v * v]), 24)],
  ["one channel, no bank, loudness in 48 slices (about as many numbers as the bank)", (it) => pool(it.u1.map((v) => [v, v * v]), 48)],
  ["one channel, the piano's bank, K = 0.12", (it) => pool(it.bank1 ||= runBank(it.u1, 0.12, 1, false))],
  ["one channel, the bank with no errors (×0)", (it) => pool(runBank(it.u1, 0.12, 0, false))],
  ["one channel, the piano's bank, K = 2", (it) => pool(runBank(it.u1, 2, 1, false))],
  ["eleven bands, no bank (band loudness read directly)", (it) => pool(it.u11.map(withSquares))],
  ["eleven bands, the piano's bank, K = 0.12", (it) => pool(it.bank11 ||= runBank(it.u11, 0.12, 1, true))],
  ["eleven bands, the bank with no errors (×0)", (it) => pool(runBank(it.u11, 0.12, 0, true))],
  ["eleven bands, the piano's bank, K = 2", (it) => pool(runBank(it.u11, 2, 1, true))]
];
console.log("");
const results = [];
for (const [name, featOf] of rows) {
  const t0 = Date.now();
  const r = evaluate(featOf);
  results.push({ name, ...r });
  console.log((100 * r.acc).toFixed(1).padStart(5) + "%   " + name + "   [" + r.feats + " features, ridge " + r.lam + ", " + ((Date.now() - t0) / 1000).toFixed(1) + " s]");
}
