#!/usr/bin/env node
// Re-measure every number the page's prose claims.
//
// The simulation is deterministic (seeded input), so the claims baked into
// README.md and index.html are checkable facts. This script extracts the
// [verify:*] blocks from index.html — the same code the browser runs, not a
// copy that can drift — runs the experiments, and compares.
//
// Usage: node tools/verify.mjs        (exits 1 if any claim fails)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const page = readFileSync(join(root, "index.html"), "utf8");

function block(name) {
  const re = new RegExp(
    "// \\[verify:" + name + "\\] begin([\\s\\S]*?)// \\[verify:" + name + "\\] end"
  );
  const m = page.match(re);
  if (!m) throw new Error("marker block not found: " + name);
  return m[1];
}

const src =
  block("intervals") + block("core") + block("bank") +
  `return { IV, N, OMEGA, DT, NF, WASH, TRAIN, LEN,
            makeSim, luFactor, luSolve, xtxAccumulate, xtxFinish,
            fitTarget, scoreRange, delayTarget, nlTarget, bankStepPure };`;
const K = new Function(src)();

// ── synchronous composition of exactly what runExperiment does ──
function experiment(coupling, scale) {
  const sim = K.makeSim(coupling, scale);
  sim.step(K.LEN);
  const XtX = new Float64Array(K.NF * K.NF);
  K.xtxAccumulate(sim.X, XtX, K.WASH, K.WASH + K.TRAIN);
  K.xtxFinish(XtX);
  const A = Float64Array.from(XtX);
  const piv = K.luFactor(A, K.NF);
  const teA = K.WASH + K.TRAIN;

  function delayScore(k, inSample) {
    const tgt = K.delayTarget(sim.u, k);
    const w = K.fitTarget(sim.X, A, piv, tgt);
    return inSample
      ? K.scoreRange(sim.X, w, tgt, K.WASH, teA)
      : K.scoreRange(sim.X, w, tgt, teA, K.LEN);
  }

  let total = 0;
  for (let k = 0; k <= 30; k++) total += delayScore(k);
  let reach = 30;
  for (let probe = 40; probe <= 260; probe += 10) {
    if (delayScore(probe) < 0.01) break;
    reach = probe;
  }
  const nlt = K.nlTarget(sim.u);
  const wnl = K.fitTarget(sim.X, A, piv, nlt);
  const nl = K.scoreRange(sim.X, wnl, nlt, teA, K.LEN);
  return { total, reach, reachSec: reach * K.DT, nl, delayScore };
}

// ── the register: write a message, couple, watch what dies when ──
function registerDeaths(coupling, seconds) {
  const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ .,!?'";
  const MSG = "I LOVE YOU";
  const phase = new Float64Array(K.N);
  const dev = new Float64Array(K.N);
  const stored = new Float64Array(K.N);
  for (let i = 0; i < K.N; i++) phase[i] = (i * 2 * Math.PI) / K.N;
  for (let i = 0; i < 10; i++) {
    const ch = i < MSG.length ? MSG[i] : " ";
    const phi = (ALPHA.indexOf(ch) / 32) * 2 * Math.PI;
    phase[i + 1] = (phase[i + 1] + (phi - dev[i + 1])) % (2 * Math.PI);
    dev[i + 1] = phi;
    stored[i + 1] = phi;
  }
  const dead = new Array(K.N).fill(null);
  const step = 0.02;
  for (let t = 0; t < seconds; t += step) {
    K.bankStepPure(phase, dev, coupling, step);
    for (let j = 1; j < K.N; j++) {
      if (dead[j] !== null) continue;
      let idx = Math.round((dev[j] / (2 * Math.PI)) * 32);
      idx = ((idx % 32) + 32) % 32;
      let want = Math.round((stored[j] / (2 * Math.PI)) * 32);
      want = ((want % 32) + 32) % 32;
      if (idx !== want) dead[j] = t;
    }
  }
  const times = dead.slice(1).filter((x) => x !== null);
  return {
    deaths: times.length,
    first: times.length ? Math.min(...times) : null,
    last: times.length ? Math.max(...times) : null,
  };
}

// ── the claims ──
const failures = [];
function claim(name, ok, detail) {
  console.log((ok ? "PASS  " : "FAIL  ") + name + "   [" + detail + "]");
  if (!ok) failures.push(name);
}

const beats = K.IV.map((v) => v.beat);
const bmin = Math.min(...beats), bmax = Math.max(...beats);
claim("beat fan runs 0.37 to 8.63 Hz",
  Math.abs(bmin - 0.37) < 0.01 && Math.abs(bmax - 8.63) < 0.01,
  bmin.toFixed(3) + " .. " + bmax.toFixed(3));
claim("beat spread is roughly twenty-three-fold",
  Math.round(bmax / bmin) === 23, "x" + (bmax / bmin).toFixed(1));

console.log("— sweep —");
const sweep = [0, 0.12, 0.45, 1.0, 2.0, 4.0, 6.0, 8.0].map((k) => {
  const r = experiment(k);
  console.log(
    "  K=" + k.toFixed(2) + "  cap31 " + r.total.toFixed(2) +
    "  nl " + (100 * r.nl).toFixed(1) + "%  reach " + r.reach +
    " (" + r.reachSec.toFixed(1) + "s)"
  );
  return { K: k, ...r };
});
const lo = sweep[0], hi = sweep[sweep.length - 1];

claim("uncoupled reach is 2.8 s (“almost three seconds”)",
  lo.reach === 140, lo.reach + " steps");
claim("top-of-sweep reach is 1.0 s", hi.reach === 50, hi.reach + " steps");
claim("mixing climbs close to eightfold",
  hi.nl / lo.nl > 7 && hi.nl / lo.nl < 9, "x" + (hi.nl / lo.nl).toFixed(2));
claim("mixing runs 1.5% to 11.5%",
  Math.abs(lo.nl - 0.015) < 0.002 && Math.abs(hi.nl - 0.115) < 0.003,
  (100 * lo.nl).toFixed(1) + "% .. " + (100 * hi.nl).toFixed(1) + "%");
claim("capacity never exceeds half its ceiling of 34",
  Math.max(...sweep.map((r) => r.total)) <= 17,
  "max " + Math.max(...sweep.map((r) => r.total)).toFixed(2));
claim("windowed capacity rises with coupling",
  hi.total > lo.total, lo.total.toFixed(2) + " -> " + hi.total.toFixed(2));

console.log("— held-out receipt —");
const d160 = experiment(0.12);
const ins = d160.delayScore(160, true), outs = d160.delayScore(160, false);
claim("delay-160 at K=0.12: in-sample ~0.016, held-out ~0.008",
  Math.abs(ins - 0.0157) < 0.002 && Math.abs(outs - 0.0081) < 0.002,
  ins.toFixed(4) + " / " + outs.toFixed(4));

console.log("— the budget —");
const s0 = experiment(0.12, 0), s1 = experiment(0.12, 1);
claim("no errors: capacity collapses to about one oscillator's worth",
  s0.total > 0.9 && s0.total < 1.3, s0.total.toFixed(2));
claim("the piano's errors buy roughly nine times that",
  s1.total / s0.total > 8 && s1.total / s0.total < 10,
  "x" + (s1.total / s0.total).toFixed(1));

console.log("— the register —");
const rHold = registerDeaths(0.12, 240);
claim("at the default whisper, all ten slots survive four minutes",
  rHold.deaths === 0, rHold.deaths + " deaths in 240 s");
const rHold2 = registerDeaths(0.12, 300);
claim("the first slip lands around four and a half minutes",
  rHold2.deaths === 1 && rHold2.first > 250 && rHold2.first < 290,
  rHold2.deaths + " death(s), first at " +
  (rHold2.first === null ? ">300" : rHold2.first.toFixed(1)) + " s");
const rDecay = registerDeaths(2.0, 240);
claim("at K=2 the register empties, first death under 2 s, last past 8 s",
  rDecay.deaths === 10 && rDecay.first < 2 && rDecay.last > 8,
  rDecay.deaths + " deaths, " + (rDecay.first === null ? "-" : rDecay.first.toFixed(1)) +
  "s .. " + (rDecay.last === null ? "-" : rDecay.last.toFixed(1)) + "s");

console.log(failures.length
  ? "\n" + failures.length + " claim(s) FAILED"
  : "\nevery claim on the page reproduces");
process.exit(failures.length ? 1 : 0);
