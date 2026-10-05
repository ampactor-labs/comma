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

// ══════════════════════════════════════════════════════════
//  THE BACK COUNTRY — lab/kit.js and the claims the lab pages make
// ══════════════════════════════════════════════════════════

const kitSrc = readFileSync(join(root, "lab", "kit.js"), "utf8");
const kitScope = {};
new Function("window", kitSrc)(kitScope);
const Kit = kitScope.Kit;

console.log("— the kit is the page's bank —");
const kitBank = Kit.bench(Kit.omegas(Kit.intervals(Kit.edo(12))));
let kitSame = true, kitDetail = [];
for (const [k, sc] of [[0, 1], [0.12, 1], [8, 1], [0.12, 0]]) {
  const a = experiment(k, sc), b = kitBank.experiment(k, sc);
  const same = a.total === b.total && a.reach === b.reach && a.nl === b.nl;
  kitSame = kitSame && same;
  kitDetail.push("K=" + k + (sc === 0 ? ",x0" : "") + " " + b.total.toFixed(2));
}
claim("lab/kit.js reproduces index.html bit for bit", kitSame, kitDetail.join(" · "));
const kitOm = Kit.omegas(Kit.intervals(Kit.edo(12)));
claim("the kit's interval table matches the page's",
  kitOm.every((w, i) => w === K.OMEGA[i]), "11 detunings");

// the register in the kit agrees with the page's register
{
  const ph1 = new Float64Array(K.N), dv1 = new Float64Array(K.N);
  const ph2 = new Float64Array(K.N), dv2 = new Float64Array(K.N);
  for (let i = 0; i < K.N; i++) { ph1[i] = ph2[i] = i * 0.7; }
  for (let s = 0; s < 500; s++) { K.bankStepPure(ph1, dv1, 1.3, 0.02); Kit.registerStep(kitOm, ph2, dv2, 1.3, 0.02); }
  claim("the kit's register steps exactly like the page's",
    ph1.every((v, i) => v === ph2[i]) && dv1.every((v, i) => v === dv2[i]), "500 steps at K=1.3");
}

console.log("— which tuning thinks best (lab/bakeoff.html) —");
const cap300 = (tuning, raw) => Kit.bench(Kit.omegas(Kit.intervals(tuning, raw))).experiment(0.12, 1, { window: 300 });
const contest = [
  ["equal", Kit.edo(12)], ["pythagorean", Kit.temperament("pythagorean")],
  ["meantone", Kit.temperament("meantone")], ["werckmeister", Kit.temperament("werckmeister")],
  ["kirnberger", Kit.temperament("kirnberger")], ["vallotti", Kit.temperament("vallotti")],
  ["just", Kit.justIntonation()], ["edo19", Kit.edo(19)], ["edo31", Kit.edo(31)], ["edo53", Kit.edo(53)]
].map(([id, t]) => ({ id, t, total: cap300(t).total }));
const score = Object.fromEntries(contest.map((c) => [c.id, c.total]));
const ranked = contest.slice().sort((a, b) => b.total - a.total).map((c) => c.id);
console.log("  " + ranked.map((id) => id + " " + score[id].toFixed(2)).join(" · "));
claim("equal temperament lands mid-pack, Kirnberger III on top",
  ranked[0] === "kirnberger" && ranked.indexOf("equal") >= 3 && ranked.indexOf("equal") <= 6,
  "equal is " + (ranked.indexOf("equal") + 1) + " of " + ranked.length);
claim("Kirnberger III and Vallotti beat equal; Werckmeister III does not",
  score.kirnberger > score.equal && score.vallotti > score.equal && score.werckmeister < score.equal,
  [score.kirnberger, score.vallotti, score.werckmeister, score.equal].map((v) => v.toFixed(2)).join(" / "));
claim("meantone and just intonation do worse than equal",
  score.meantone < score.equal && score.just < score.equal,
  score.meantone.toFixed(2) + ", " + score.just.toFixed(2));
const frozen = Kit.intervals(Kit.justIntonation()).filter((v) => v.beat < 0.01).length;
claim("just intonation freezes four of eleven clocks", frozen === 4, frozen + " frozen");
claim("53 equal holds a little over half what the piano's bank holds",
  score.edo53 / score.equal > 0.5 && score.edo53 / score.equal < 0.65,
  (100 * score.edo53 / score.equal).toFixed(0) + "%");

const edoCap = {};
for (let n = 5; n <= 60; n++) edoCap[n] = cap300(Kit.edo(n)).total;
const mean = (a, b) => { let s2 = 0; for (let n = a; n <= b; n++) s2 += edoCap[n]; return s2 / (b - a + 1); };
let bestN = 5; for (let n = 5; n <= 60; n++) if (edoCap[n] > edoCap[bestN]) bestN = n;
claim("the best equal division sits between 9 and 20 notes, and it's downhill past 25",
  bestN >= 9 && bestN <= 20 && mean(26, 60) < mean(9, 20) - 2,
  "best " + bestN + " (" + edoCap[bestN].toFixed(1) + "), mean 9-20 " + mean(9, 20).toFixed(1) + ", 26-60 " + mean(26, 60).toFixed(1));

{
  const pianoRates = Kit.intervals(Kit.edo(12)).map((v) => v.fJust - v.fTemp);
  const signs = pianoRates.map(Math.sign);
  const even = Array.from({ length: 11 }, (_, i) => 0.37 + (8.63 - 0.37) * i / 10);
  const evenCap = Kit.bench(even.map((r, i) => 2 * Math.PI * r * signs[i])).experiment(0.12, 1, { window: 300, skipReach: true }).total;
  const crowd = pianoRates.filter((r) => Math.abs(r) < 0.7).length;
  claim("a ruler-straight even fan beats the piano's lopsided one",
    evenCap > score.equal * 1.1, evenCap.toFixed(2) + " vs " + score.equal.toFixed(2));
  claim("the piano crowds four clocks below 0.7 Hz", crowd === 4, crowd + " below 0.7 Hz");
}

{
  const big = [11, 47].map((n) => { const b = Kit.bench(Kit.omegas(Kit.intervals(Kit.edo(12), Kit.harmonics(n)))); const r = b.experiment(0.12, 1, { window: 300 }); return { t: r.total, share: r.total / b.NF }; });
  claim("a bigger bank holds more but uses less of its ceiling",
    big[1].t > big[0].t && big[1].share < big[0].share,
    big.map((b) => b.t.toFixed(1) + " (" + (100 * b.share).toFixed(0) + "%)").join(" -> "));
}

console.log("— every clock has a comma (lab/ladder.html) —");
{
  const cf = (x) => { const out = []; let v = x, h2 = 0, h1 = 1, k2 = 1, k1 = 0;
    for (let i = 0; i < 12; i++) { const a = Math.floor(v); const h = a * h1 + h2, k = a * k1 + k2; h2 = h1; h1 = h; k2 = k1; k1 = k; out.push([h, k]); const fr = v - a; if (fr < 1e-9) break; v = 1 / fr; } return out; };
  const fifths = cf(Math.log2(1.5));
  const r12 = fifths.find(([p, q]) => q === 12), r53 = fifths.find(([p, q]) => q === 53);
  const c12 = 1200 * Math.abs(12 * Math.log2(1.5) - 7), c53 = 1200 * Math.abs(53 * Math.log2(1.5) - 31);
  claim("rungs 7/12 and 31/53 miss by 23.46 and 3.62 cents",
    !!r12 && r12[0] === 7 && !!r53 && r53[0] === 31 && Math.abs(c12 - 23.46) < 0.005 && Math.abs(c53 - 3.615) < 0.005,
    c12.toFixed(3) + "¢, " + c53.toFixed(3) + "¢");
  const yr = cf(365.24219).map(([p, q]) => q + ":" + (p - 365 * q));
  claim("the year's rungs include Caesar's 4 and Khayyam's 33 (8 leap days)",
    yr.includes("4:1") && yr.includes("33:8"), yr.slice(1, 5).join(" "));
  const moon = cf(365.24219 / 29.530589);
  claim("the moon's rungs include the Metonic 235 months in 19 years",
    moon.some(([p, q]) => p === 235 && q === 19), moon.slice(0, 7).map(([p, q]) => p + "/" + q).join(" "));
  claim("π's rungs include 355/113", cf(Math.PI).some(([p, q]) => p === 355 && q === 113), "Zu Chongzhi");
  const fib = cf((1 + Math.sqrt(5)) / 2).map(([p, q]) => q);
  claim("the golden ratio's rungs are Fibonacci numbers",
    fib.slice(0, 10).join(",") === "1,1,2,3,5,8,13,21,34,55", fib.slice(0, 10).join(","));
  const julianDrift = 1 / (365.25 - 365.24219);
  claim("Caesar's leap year slips a day every 128 years", Math.round(julianDrift) === 128, julianDrift.toFixed(1) + " years");
}

console.log("— the breadboard (notes/breadboard.md) —");
{
  const RQ = 1 / (2 * 0.6 * 1e-6);
  const Rmin = 1 / (2 * Math.PI * 8.627 * 1e-6), Rmax = 1 / (2 * Math.PI * 0.372 * 1e-6);
  claim("one damping resistor, 833 kΩ, for every oscillator; R runs 18.4 kΩ to 427 kΩ",
    Math.abs(RQ - 833333) < 1 && Math.abs(Rmin - 18450) < 100 && Math.abs(Rmax - 427800) < 600,
    (RQ / 1e3).toFixed(0) + " kΩ, " + (Rmin / 1e3).toFixed(1) + " .. " + (Rmax / 1e3).toFixed(1) + " kΩ");
}

// blocks marked // [verify:name] begin ... end inside a lab page
function labBlock(file, name, exportsList) {
  const txt = readFileSync(join(root, "lab", file), "utf8");
  const re = new RegExp("// \\[verify:" + name + "\\] begin([\\s\\S]*?)// \\[verify:" + name + "\\] end");
  const m = txt.match(re);
  if (!m) throw new Error("marker block not found: " + file + " " + name);
  return new Function(m[1] + "\nreturn {" + exportsList.join(",") + "};")();
}

console.log("— the listening test's beat meter (lab/listen.html) —");
{
  const B = labBlock("listen.html", "beat", ["estimateBeat", "synthDyad"]);
  const c4 = 261.6256, g4 = c4 * Math.pow(2, 7 / 12);
  const truth = Math.abs(3 * c4 - 2 * g4);
  const est = B.estimateBeat(B.synthDyad(c4, g4, 8000, 16, 8), 8000, 0.2, 20);
  claim("the beat meter hears an equal-tempered fifth at C4 beat 0.886 times a second",
    Math.abs(est.hz - truth) / truth < 0.01, est.hz.toFixed(4) + " Hz vs " + truth.toFixed(4));
  const f1 = 220, f2 = (3 * f1 + 4.4) / 2;
  const est2 = B.estimateBeat(B.synthDyad(f1, f2, 8000, 12, 8), 8000, 0.2, 20);
  claim("and a fifth mistuned to beat 4.4 Hz", Math.abs(est2.hz - 4.4) / 4.4 < 0.01, est2.hz.toFixed(3) + " Hz");
}

console.log("— a letter in a piano: Reed–Solomon over GF(32) (lab/channel.html) —");
{
  const RS = labBlock("channel.html", "rs", ["gfTables", "rsEncode", "rsDecode"]);
  const rng = Kit.mulberry32(2024);
  const ri = (n) => Math.floor(rng() * n);
  let exact = 0, trials = 0, loud = 0, over = 0;
  for (let e = 0; e <= 4; e++) for (let t = 0; t < 400; t++) {
    const data = Array.from({ length: 15 }, () => ri(32));
    const cw = RS.rsEncode(data, 8).slice();
    const pos = new Set(); while (pos.size < e) pos.add(ri(23));
    pos.forEach((q) => { cw[q] = (cw[q] ^ (1 + ri(31))) & 31; });
    const r = RS.rsDecode(cw, 8);
    trials++; if (r.ok && r.data.length === 15 && r.data.every((v, i) => v === data[i])) exact++;
  }
  for (let t = 0; t < 400; t++) {
    const data = Array.from({ length: 15 }, () => ri(32));
    const cw = RS.rsEncode(data, 8).slice();
    const pos = new Set(); while (pos.size < 6) pos.add(ri(23));
    pos.forEach((q) => { cw[q] = (cw[q] ^ (1 + ri(31))) & 31; });
    const r = RS.rsDecode(cw, 8); over++;
    if (!r.ok) loud++;
  }
  claim("RS(23,15) fixes every pattern of up to four wrong letters",
    exact === trials, exact + " of " + trials + " decoded exactly");
  claim("and with six wrong it nearly always says so instead of guessing",
    loud / over > 0.97, (100 * loud / over).toFixed(1) + "% refused");
}

console.log(failures.length
  ? "\n" + failures.length + " claim(s) FAILED"
  : "\nevery claim on the page and in the back country reproduces");
process.exit(failures.length ? 1 : 0);
