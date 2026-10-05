/* lab/kit.js: the shared bench for the back-country pages.

   A classic script, so it loads from file:// as well as from a server.
   It defines window.Kit. tools/verify.mjs loads this same file in Node
   and checks that its bank, fed the piano's eleven detunings, gives the
   numbers index.html gives, to the last digit.

   Nothing here touches the network. */
(function (root) {
  "use strict";

  // ══════════════════════════════════════════════════════════
  //  INTERVALS AND TUNINGS
  // ══════════════════════════════════════════════════════════

  var REF = 220; // A3, the root every bank on these pages is built on
  var PYTH_COMMA = 1200 * Math.log2(Math.pow(1.5, 12) / Math.pow(2, 7)); // 23.46
  var SYNT_COMMA = 1200 * Math.log2(81 / 80);                             // 21.51
  var PURE_FIFTH = 1200 * Math.log2(1.5);                                 // 701.955

  function cents(ratio) { return 1200 * Math.log2(ratio); }

  // the same eleven just intervals index.html uses, in the same order
  var RAW = [
    { n: 3,  ratio: 3 / 2,   name: "fifth"         },
    { n: 5,  ratio: 5 / 4,   name: "major third"   },
    { n: 7,  ratio: 7 / 4,   name: "harmonic 7th"  },
    { n: 9,  ratio: 9 / 8,   name: "major second"  },
    { n: 11, ratio: 11 / 8,  name: "11th harmonic" },
    { n: 13, ratio: 13 / 8,  name: "13th harmonic" },
    { n: 15, ratio: 15 / 8,  name: "major seventh" },
    { n: 17, ratio: 17 / 16, name: "17th harmonic" },
    { n: 19, ratio: 19 / 16, name: "19th harmonic" },
    { n: 21, ratio: 21 / 16, name: "21st harmonic" },
    { n: 23, ratio: 23 / 16, name: "23rd harmonic" }
  ];

  // Odd harmonics n/2^k folded into one octave, for banks larger than eleven.
  function harmonics(count) {
    var out = [];
    for (var n = 3; out.length < count; n += 2) {
      var d = 1; while (n / d >= 2) d *= 2;
      out.push({ n: n, ratio: n / d, name: n + "th harmonic" });
    }
    return out;
  }

  // A tuning is a function from a just interval, in cents above the root,
  // to the cents of the nearest note the instrument actually has.
  function edo(n) {
    var s = 1200 / n;
    var f = function (c) { return Math.round(c / s) * s; };
    f.label = n + "-EDO"; f.steps = n;
    return f;
  }

  // From twelve pitch classes given in cents above the root (index 0 is
  // the root itself), repeated in every octave.
  function fromPitchClasses(pcCents, label) {
    var f = function (c) {
      var best = 0, bd = Infinity, o = Math.floor(c / 1200);
      for (var oc = o - 1; oc <= o + 1; oc++) {
        for (var p = 0; p < pcCents.length; p++) {
          var v = oc * 1200 + pcCents[p];
          var d = Math.abs(v - c);
          if (d < bd) { bd = d; best = v; }
        }
      }
      return best;
    };
    f.label = label || "custom"; f.pcs = pcCents.slice();
    return f;
  }

  // A circulating temperament described the way tuners describe one: how
  // much each of the twelve fifths around the circle is narrowed, starting
  // C–G, G–D, D–A, ... F–C. A null entry takes whatever is left over so
  // the circle closes (the wolf). Returns pitch classes relative to C.
  var FIFTH_NAMES = ["C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "F"];
  function circleFromFifths(narrowings) {
    var known = 0, wolf = -1;
    narrowings.forEach(function (x, i) { if (x === null) wolf = i; else known += x; });
    var nar = narrowings.slice();
    if (wolf >= 0) nar[wolf] = PYTH_COMMA - known;
    var pcsFromC = new Array(12);
    var acc = 0;
    for (var i = 0; i < 12; i++) {
      var semis = (i * 7) % 12;
      pcsFromC[semis] = ((acc % 1200) + 1200) % 1200;
      acc += PURE_FIFTH - nar[i];
    }
    return pcsFromC;
  }

  // Re-root pitch classes given relative to C onto another root (A = 9).
  function reroot(pcsFromC, rootPc) {
    var out = new Array(12);
    for (var p = 0; p < 12; p++) {
      var src = (p + rootPc) % 12;
      out[p] = ((pcsFromC[src] - pcsFromC[rootPc]) % 1200 + 1200) % 1200;
    }
    return out;
  }

  var q = PYTH_COMMA / 4, s6 = PYTH_COMMA / 6, sc4 = SYNT_COMMA / 4;
  var SCHISMA = PYTH_COMMA - SYNT_COMMA;
  var TEMPERAMENTS = {
    "equal":        { label: "Equal temperament", year: 1917, note: "Every fifth narrowed by a twelfth of the comma. The piano you know.",
                      fifths: [1,1,1,1,1,1,1,1,1,1,1,1].map(function () { return PYTH_COMMA / 12; }) },
    "pythagorean":  { label: "Pythagorean", year: -500, note: "Eleven pure fifths. The twelfth, G♯ to E♭, eats the whole comma and howls.",
                      fifths: [0,0,0,0,0,0,0,0,null,0,0,0] },
    "meantone":     { label: "Quarter-comma meantone", year: 1523, note: "Pure major thirds, bought with narrow fifths and a wolf.",
                      fifths: [sc4,sc4,sc4,sc4,sc4,sc4,sc4,sc4,null,sc4,sc4,sc4] },
    "werckmeister": { label: "Werckmeister III", year: 1691, note: "Four fifths take a quarter comma each; the rest are pure.",
                      fifths: [q,q,q,0,0,q,0,0,0,0,0,0] },
    "kirnberger":   { label: "Kirnberger III", year: 1779, note: "Four meantone fifths, one schisma, seven pure.",
                      fifths: [sc4,sc4,sc4,sc4,0,0,SCHISMA,0,0,0,0,0] },
    "vallotti":     { label: "Vallotti", year: 1754, note: "Six fifths narrowed by a sixth of the comma, six pure.",
                      fifths: [s6,s6,s6,s6,s6,0,0,0,0,0,0,s6] }
  };

  function temperament(key, rootPc) {
    var t = TEMPERAMENTS[key];
    var pcs = reroot(circleFromFifths(t.fifths), rootPc === undefined ? 9 : rootPc);
    var f = fromPitchClasses(pcs, t.label);
    f.note = t.note; f.year = t.year; f.key = key;
    return f;
  }

  // Five-limit just intonation on the root: the intervals it contains are
  // exact, so their oscillators have nothing to spend.
  function justIntonation() {
    var r = [1, 16/15, 9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3, 9/5, 15/8];
    var f = fromPitchClasses(r.map(cents), "Five-limit just");
    f.note = "Every ratio on the page that it contains, it plays exactly. Watch what that does to the bank.";
    return f;
  }

  // The interval table, same fields and same arithmetic as index.html.
  function intervals(tuning, raw, ref) {
    var tn = tuning || edo(12);
    var rw = raw || RAW, rf = ref || REF;
    return rw.map(function (r) {
      var c = cents(r.ratio);
      var tc = tn(c);
      var fJust = rf * r.ratio;
      var fTemp = rf * Math.pow(2, tc / 1200);
      return {
        n: r.n, name: r.name, ratio: r.ratio,
        cents: c, edo: tc, err: c - tc,
        fJust: fJust, fTemp: fTemp,
        beat: Math.abs(fJust - fTemp)
      };
    });
  }

  function omegas(IV) {
    return IV.map(function (v) { return 2 * Math.PI * (v.fJust - v.fTemp); });
  }

  // ══════════════════════════════════════════════════════════
  //  THE BANK: index.html's [verify:core], with the detunings
  //  passed in instead of fixed. Same constants, same order of
  //  operations, so the piano's fan reproduces it exactly.
  // ══════════════════════════════════════════════════════════

  var DT = 0.02, GAMMA = 0.6, IN_GAIN = 0.30, SEED = 12345;
  var WASH = 500, TRAIN = 3500, TESTN = 3500, LEN = WASH + TRAIN + TESTN;

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function makeInput(T, seed) {
    var u = new Float64Array(T);
    var rng = mulberry32(seed === undefined ? SEED : seed);
    for (var t = 0; t < T; t++) u[t] = (rng() * 2 - 1) * 0.8;
    return u;
  }

  // mode "additive" is the page's bank: each oscillator pulled toward the
  // mean field. mode "multiplicative" lets the mean field's real part set
  // each oscillator's gain instead, which is what phase-amplitude coupling
  // needs and the additive bank lacks.
  function bench(OMEGA, opts) {
    opts = opts || {};
    var N = OMEGA.length, NF = 3 * N + 1;
    var mode = opts.mode || "additive";
    var DRIVE = [];
    for (var d = 0; d < N; d++) DRIVE.push(0.55 + 0.45 * ((d * 7) % 11) / 10);
    var DECAY = Math.exp(-GAMMA * DT);

    function makeSim(K, scale, input) {
      var s = (scale === undefined ? 1 : scale);
      var len = input ? input.length : LEN;
      var rotC = [], rotS = [];
      for (var j0 = 0; j0 < N; j0++) {
        var w0 = OMEGA[j0] * s;
        rotC.push(Math.cos(w0 * DT));
        rotS.push(Math.sin(w0 * DT));
      }
      var re = new Float64Array(N), im = new Float64Array(N);
      var nre = new Float64Array(N), nim = new Float64Array(N);
      var X = new Float64Array(len * NF);
      var u = input || makeInput(len);
      var t = 0;
      var mult = mode === "multiplicative";
      function step(n) {
        var end = Math.min(len, t + n);
        for (; t < end; t++) {
          var mr = 0, mi = 0;
          for (var q2 = 0; q2 < N; q2++) { mr += re[q2]; mi += im[q2]; }
          mr /= N; mi /= N;
          for (var j = 0; j < N; j++) {
            var r = re[j], m = im[j];
            var amp2 = r * r + m * m;
            var xr = DECAY * (r * rotC[j] - m * rotS[j]);
            var xi = DECAY * (r * rotS[j] + m * rotC[j]);
            xr -= DT * amp2 * r;          xi -= DT * amp2 * m;
            if (mult) { xr += DT * K * mr * r; xi += DT * K * mr * m; }
            else      { xr += DT * K * (mr - r); xi += DT * K * (mi - m); }
            xr += DRIVE[j] * u[t] * IN_GAIN;
            var mag = Math.sqrt(xr * xr + xi * xi);
            if (mag > 6) { xr *= 6 / mag; xi *= 6 / mag; }
            nre[j] = xr; nim[j] = xi;
          }
          for (var k2 = 0; k2 < N; k2++) { re[k2] = nre[k2]; im[k2] = nim[k2]; }
          var base = t * NF;
          for (var f2 = 0; f2 < N; f2++) {
            X[base + f2] = re[f2];
            X[base + N + f2] = im[f2];
            X[base + 2 * N + f2] = re[f2] * re[f2] + im[f2] * im[f2];
          }
          X[base + 3 * N] = 1;
        }
        return t >= len;
      }
      return { X: X, u: u, step: step, len: len };
    }

    // A bank you drive one sample at a time, for live input.
    function makeLive(K, scale) {
      var self = { K: K, scale: scale === undefined ? 1 : scale };
      var re = new Float64Array(N), im = new Float64Array(N);
      var nre = new Float64Array(N), nim = new Float64Array(N);
      var rotC = new Float64Array(N), rotS = new Float64Array(N);
      function setScale(sc) {
        self.scale = sc;
        for (var j = 0; j < N; j++) { rotC[j] = Math.cos(OMEGA[j] * sc * DT); rotS[j] = Math.sin(OMEGA[j] * sc * DT); }
      }
      setScale(self.scale);
      self.re = re; self.im = im; self.setScale = setScale;
      self.setK = function (k) { self.K = k; };
      self.step = function (uIn) {
        var K2 = self.K, mr = 0, mi = 0;
        for (var q2 = 0; q2 < N; q2++) { mr += re[q2]; mi += im[q2]; }
        mr /= N; mi /= N;
        for (var j = 0; j < N; j++) {
          var r = re[j], m = im[j], amp2 = r * r + m * m;
          var xr = DECAY * (r * rotC[j] - m * rotS[j]);
          var xi = DECAY * (r * rotS[j] + m * rotC[j]);
          xr -= DT * amp2 * r; xi -= DT * amp2 * m;
          if (mode === "multiplicative") { xr += DT * K2 * mr * r; xi += DT * K2 * mr * m; }
          else { xr += DT * K2 * (mr - r); xi += DT * K2 * (mi - m); }
          xr += DRIVE[j] * uIn * IN_GAIN;
          var mag = Math.sqrt(xr * xr + xi * xi);
          if (mag > 6) { xr *= 6 / mag; xi *= 6 / mag; }
          nre[j] = xr; nim[j] = xi;
        }
        for (var k2 = 0; k2 < N; k2++) { re[k2] = nre[k2]; im[k2] = nim[k2]; }
      };
      self.features = function (out) {
        var v = out || new Float64Array(NF);
        for (var f2 = 0; f2 < N; f2++) {
          v[f2] = re[f2]; v[N + f2] = im[f2]; v[2 * N + f2] = re[f2] * re[f2] + im[f2] * im[f2];
        }
        v[3 * N] = 1;
        return v;
      };
      self.predict = function (w) {
        var p = w[3 * N];
        for (var f2 = 0; f2 < N; f2++) {
          p += w[f2] * re[f2] + w[N + f2] * im[f2] + w[2 * N + f2] * (re[f2] * re[f2] + im[f2] * im[f2]);
        }
        return p;
      };
      return self;
    }

    function xtxAccumulate(X, XtX, t0, t1) {
      for (var t = t0; t < t1; t++) {
        var b = t * NF;
        for (var a = 0; a < NF; a++) {
          var xa = X[b + a];
          for (var c = a; c < NF; c++) XtX[a * NF + c] += xa * X[b + c];
        }
      }
    }
    function xtxFinish(XtX) {
      for (var a = 0; a < NF; a++)
        for (var c = 0; c < a; c++) XtX[a * NF + c] = XtX[c * NF + a];
      for (var d2 = 0; d2 < NF; d2++) XtX[d2 * NF + d2] += 1e-6 * TRAIN;
    }

    function fitTarget(X, A, piv, target) {
      var Xty = new Float64Array(NF);
      for (var t = WASH; t < WASH + TRAIN; t++) {
        var b = t * NF, yv = target[t];
        for (var a = 0; a < NF; a++) Xty[a] += X[b + a] * yv;
      }
      return luSolve(A, piv, Xty, NF);
    }

    function scoreRange(X, w, target, lo, hi) {
      var sy = 0, syy = 0, sp = 0, spp = 0, syp = 0, n = 0;
      for (var t = lo; t < hi; t++) {
        var b = t * NF, p = 0;
        for (var a = 0; a < NF; a++) p += w[a] * X[b + a];
        var yy = target[t];
        sy += yy; syy += yy * yy; sp += p; spp += p * p; syp += yy * p; n++;
      }
      var cov = syp / n - (sy / n) * (sp / n);
      var vy = syy / n - (sy / n) * (sy / n);
      var vp = spp / n - (sp / n) * (sp / n);
      if (vy < 1e-12 || vp < 1e-12) return 0;
      var r = cov / Math.sqrt(vy * vp);
      return Math.max(0, Math.min(1, r * r));
    }

    // The experiment index.html runs, as a generator that yields between
    // slices so a page can spread it over frames. opts.window sets the
    // last delay counted in capacity (30 on the main page).
    function* experimentGen(K, scale, o) {
      o = o || {};
      var win = o.window === undefined ? 30 : o.window;
      var sim = makeSim(K, scale);
      while (!sim.step(1500)) yield 0.05;
      var XtX = new Float64Array(NF * NF);
      for (var i = 0; i < 4; i++) {
        xtxAccumulate(sim.X, XtX, WASH + Math.floor(i * TRAIN / 4), WASH + Math.floor((i + 1) * TRAIN / 4));
        yield 0.3 + 0.05 * i;
      }
      xtxFinish(XtX);
      var A = Float64Array.from(XtX);
      var piv = luFactor(A, NF);
      var teA = WASH + TRAIN;
      var res = { K: K, scale: scale === undefined ? 1 : scale, mc: [], W: [], probes: [],
                  total: 0, reach: 30, reachSec: 30 * DT, nl: 0, ceiling: NF, sim: sim };
      for (var k = 0; k <= win; k++) {
        var tgt = delayTarget(sim.u, k, sim.len);
        var w = fitTarget(sim.X, A, piv, tgt);
        var sc = scoreRange(sim.X, w, tgt, teA, sim.len);
        res.mc.push(sc); res.total += sc;
        if (o.keepWeights) res.W.push(w);
        if (k % 3 === 2) yield 0.5 + 0.35 * k / win;
      }
      if (!o.skipReach) {
        for (var probe = 40; probe <= 260; probe += 10) {
          var t2 = delayTarget(sim.u, probe, sim.len);
          var w2 = fitTarget(sim.X, A, piv, t2);
          var s2 = scoreRange(sim.X, w2, t2, teA, sim.len);
          res.probes.push({ k: probe, sc: s2 });
          if (s2 < 0.01) break;
          res.reach = probe; res.reachSec = probe * DT;
          if (probe % 30 === 0) yield 0.9;
        }
      }
      var nt = nlTarget(sim.u, sim.len);
      var wn = fitTarget(sim.X, A, piv, nt);
      res.nl = scoreRange(sim.X, wn, nt, teA, sim.len);
      res.A = A; res.piv = piv;
      if (!o.keepSim) delete res.sim;
      return res;
    }

    function experiment(K, scale, o) {
      var g = experimentGen(K, scale, o), r;
      while (!(r = g.next()).done) {}
      return r.value;
    }

    // Fit one readout on the seeded random input, for pages that then
    // apply it to live input. Returns the weights and their held-out score.
    function trainDelay(K, k, scale) {
      var r = experiment(K, scale === undefined ? 1 : scale, { window: 0, skipReach: true, keepSim: true });
      var tgt = delayTarget(r.sim.u, k, r.sim.len);
      var w = fitTarget(r.sim.X, r.A, r.piv, tgt);
      return { w: w, score: scoreRange(r.sim.X, w, tgt, WASH + TRAIN, r.sim.len) };
    }

    return {
      N: N, NF: NF, OMEGA: OMEGA, mode: mode, DRIVE: DRIVE,
      makeSim: makeSim, makeLive: makeLive,
      xtxAccumulate: xtxAccumulate, xtxFinish: xtxFinish,
      fitTarget: fitTarget, scoreRange: scoreRange,
      experimentGen: experimentGen, experiment: experiment, trainDelay: trainDelay
    };
  }

  function luFactor(A, n) {
    var piv = new Int32Array(n);
    for (var i = 0; i < n; i++) piv[i] = i;
    for (var c = 0; c < n; c++) {
      var best = c, bv = Math.abs(A[c * n + c]);
      for (var r = c + 1; r < n; r++) {
        var v = Math.abs(A[r * n + c]);
        if (v > bv) { bv = v; best = r; }
      }
      if (best !== c) {
        for (var q2 = 0; q2 < n; q2++) {
          var tmp = A[c * n + q2]; A[c * n + q2] = A[best * n + q2]; A[best * n + q2] = tmp;
        }
        var tp = piv[c]; piv[c] = piv[best]; piv[best] = tp;
      }
      var dd = A[c * n + c];
      if (Math.abs(dd) < 1e-12) dd = 1e-12;
      for (var rr = c + 1; rr < n; rr++) {
        var f = A[rr * n + c] / dd;
        A[rr * n + c] = f;
        for (var cc = c + 1; cc < n; cc++) A[rr * n + cc] -= f * A[c * n + cc];
      }
    }
    return piv;
  }
  function luSolve(A, piv, b, n) {
    var y = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      var s = b[piv[i]];
      for (var j = 0; j < i; j++) s -= A[i * n + j] * y[j];
      y[i] = s;
    }
    var x = new Float64Array(n);
    for (var k = n - 1; k >= 0; k--) {
      var t = y[k];
      for (var m = k + 1; m < n; m++) t -= A[k * n + m] * x[m];
      var dd = A[k * n + k];
      x[k] = t / (Math.abs(dd) < 1e-12 ? 1e-12 : dd);
    }
    return x;
  }
  function delayTarget(u, k, len) {
    var L = len || u.length;
    var tgt = new Float64Array(L);
    for (var t = k; t < L; t++) tgt[t] = u[t - k];
    return tgt;
  }
  function nlTarget(u, len) {
    var L = len || u.length;
    var tgt = new Float64Array(L);
    for (var t = 4; t < L; t++) tgt[t] = u[t - 1] * u[t - 3];
    return tgt;
  }

  // The phase-only register (index.html's [verify:bank]) for any fan.
  function registerStep(OMEGA, phase, dev, K, dtReal) {
    var h = 0.002;
    var n = Math.max(1, Math.min(40, Math.round(dtReal / h)));
    var hh = dtReal / n, TWO_PI = 2 * Math.PI;
    for (var s = 0; s < n; s++) {
      var mr = 0, mi = 0;
      for (var i = 0; i < phase.length; i++) { mr += Math.cos(phase[i]); mi += Math.sin(phase[i]); }
      mr /= phase.length; mi /= phase.length;
      var R = Math.sqrt(mr * mr + mi * mi);
      var psiM = Math.atan2(mi, mr);
      for (var j = 0; j < phase.length; j++) {
        var pull = K * R * Math.sin(psiM - phase[j]) * hh;
        phase[j] = (phase[j] + OMEGA[j] * hh + pull) % TWO_PI;
        dev[j] += pull;
      }
    }
  }

  // Run a generator over animation frames, about budgetMs of work per
  // frame. onYield gets whatever the generator yields (a progress number).
  // Returns a function that cancels the run.
  function drive(gen, onDone, onYield, budgetMs) {
    var budget = budgetMs || 10, dead = false;
    var raf = root.requestAnimationFrame || function (f) { return setTimeout(function () { f(Date.now()); }, 16); };
    function frame() {
      if (dead) return;
      var stop = now() + budget, r;
      do {
        r = gen.next();
        if (r.done) { if (onDone) onDone(r.value); return; }
        if (onYield) onYield(r.value);
      } while (now() < stop);
      raf(frame);
    }
    raf(frame);
    return function () { dead = true; };
  }
  function now() { return (root.performance && root.performance.now) ? root.performance.now() : Date.now(); }

  // A FIFO of generators, run one after another through drive().
  function queue() {
    var items = [], running = false, cancel = null;
    function next() {
      if (!items.length) { running = false; return; }
      running = true;
      var it = items.shift();
      cancel = drive(it.gen, function (v) { if (it.done) it.done(v); next(); }, it.progress);
    }
    return {
      push: function (gen, done, progress) { items.push({ gen: gen, done: done, progress: progress }); if (!running) next(); },
      clear: function () { items = []; if (cancel) cancel(); running = false; },
      busy: function () { return running || items.length > 0; }
    };
  }

  // ══════════════════════════════════════════════════════════
  //  BROWSER PLUMBING: canvases, colors, sound, the nav
  // ══════════════════════════════════════════════════════════

  var isBrowser = typeof document !== "undefined";

  function fit(cv) {
    var dpr = root.devicePixelRatio || 1;
    var w = cv.clientWidth;
    // read the CSS height once; cv.height below rewrites the attribute
    if (!cv.dataset.cssHeight) cv.dataset.cssHeight = cv.getAttribute("height");
    var h = parseInt(cv.dataset.cssHeight, 10);
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    cv.style.height = h + "px";
    var g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { g: g, w: w, h: h, dpr: dpr };
  }

  var cssCache = {}, cssStamp = 0;
  function css(name) {
    if (!isBrowser) return "#888";
    if (cssCache.__stamp !== cssStamp) cssCache = { __stamp: cssStamp };
    if (!(name in cssCache)) cssCache[name] = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return cssCache[name];
  }

  // rgba() from a hex token and an alpha, for glows and trails
  function alpha(hex, a) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(h, 16);
    return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
  }

  var themeHandlers = [];
  function onTheme(fn) {
    themeHandlers.push(fn);
  }
  if (isBrowser) {
    var fire = function () { cssStamp++; themeHandlers.forEach(function (f) { f(); }); };
    var mq = root.matchMedia ? root.matchMedia("(prefers-color-scheme: dark)") : null;
    if (mq && mq.addEventListener) mq.addEventListener("change", fire);
    if (root.MutationObserver) new MutationObserver(fire).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    root.addEventListener("resize", function () { themeHandlers.forEach(function (f) { f(); }); });
  }

  var reduced = isBrowser && root.matchMedia ? root.matchMedia("(prefers-reduced-motion: reduce)").matches : false;

  // ── sound: one context, one master with a limiter, one registry so the
  //    corner bar and Escape can stop everything ──
  var sound = (function () {
    var ac = null, MASTER = null, muted = false;
    var ACTIVE = {}, TIMERS = [], listeners = [];
    function audio() {
      if (!ac) {
        ac = new (root.AudioContext || root.webkitAudioContext)();
        MASTER = ac.createGain();
        MASTER.gain.value = muted ? 0 : 1;
        var comp = ac.createDynamicsCompressor();
        comp.threshold.value = -12; comp.knee.value = 24; comp.ratio.value = 6;
        comp.attack.value = 0.004; comp.release.value = 0.18;
        MASTER.connect(comp); comp.connect(ac.destination);
      }
      if (ac.state === "suspended") ac.resume();
      return ac;
    }
    function bus() { audio(); return MASTER; }
    function later(fn, ms) {
      var h = setTimeout(function () { var i = TIMERS.indexOf(h); if (i >= 0) TIMERS.splice(i, 1); fn(); }, ms);
      TIMERS.push(h); return h;
    }
    function changed() { listeners.forEach(function (f) { f(); }); }
    // stopper: optional function called on stop, for sounds that are not
    // plain oscillators (live loops, mic streams)
    function register(id, gainNode, nodes, stopper) {
      if (ACTIVE[id]) stop(id);
      ACTIVE[id] = { gain: gainNode, nodes: nodes || [], stopper: stopper };
      changed();
    }
    function stop(id) {
      var v = ACTIVE[id];
      if (!v) return;
      delete ACTIVE[id];
      var t = ac ? ac.currentTime : 0;
      if (v.gain && ac) {
        try {
          v.gain.gain.cancelScheduledValues(t);
          v.gain.gain.setValueAtTime(v.gain.gain.value, t);
          v.gain.gain.linearRampToValueAtTime(0, t + 0.08);
        } catch (e) {}
      }
      if (ac) v.nodes.forEach(function (o) { try { o.stop(t + 0.12); } catch (e) {} });
      if (v.stopper) { try { v.stopper(); } catch (e) {} }
      changed();
    }
    function stopAll() {
      TIMERS.forEach(clearTimeout); TIMERS = [];
      Object.keys(ACTIVE).forEach(stop);
      changed();
    }
    function playing(id) { return !!ACTIVE[id]; }
    function any() { return Object.keys(ACTIVE).length > 0; }
    function setMuted(v) {
      muted = v;
      if (muted) stopAll();
      if (MASTER) MASTER.gain.value = muted ? 0 : 1;
      changed();
    }
    // additive voice with a few harmonics so coincident partials beat
    function voice(freq, t0, dur, gain, partials, out) {
      var c = audio();
      var o2 = c.createGain();
      o2.gain.value = 0;
      o2.connect(out || bus());
      var np = partials || 4, nodes = [];
      for (var h = 1; h <= np; h++) {
        var o = c.createOscillator();
        o.type = "sine"; o.frequency.value = freq * h;
        var g = c.createGain(); g.gain.value = (gain || 0.16) / (h * 1.5);
        o.connect(g); g.connect(o2);
        o.start(t0); o.stop(t0 + dur + 0.1);
        nodes.push(o);
      }
      o2.gain.setValueAtTime(0, t0);
      o2.gain.linearRampToValueAtTime(1, t0 + 0.02);
      o2.gain.setValueAtTime(1, Math.max(t0 + 0.02, t0 + dur - 0.12));
      o2.gain.linearRampToValueAtTime(0, t0 + dur);
      return { out: o2, nodes: nodes };
    }
    // a struck-string tone: harmonics with a fast attack and a long decay
    function pluck(freq, t0, dur, gain, out) {
      var c = audio();
      var o2 = c.createGain();
      o2.connect(out || bus());
      o2.gain.setValueAtTime(0, t0);
      o2.gain.linearRampToValueAtTime(gain || 0.2, t0 + 0.006);
      o2.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
      var nodes = [];
      for (var h = 1; h <= 6; h++) {
        var o = c.createOscillator();
        o.type = "sine"; o.frequency.value = freq * h * (1 + 0.0004 * h * h);
        var g = c.createGain(); g.gain.value = 1 / (h * h * 0.7 + 0.3);
        o.connect(g); g.connect(o2);
        o.start(t0); o.stop(t0 + dur + 0.05);
        nodes.push(o);
      }
      return { out: o2, nodes: nodes };
    }
    // a short woody click, the sound of a metronome or a firefly's chirp
    var noiseBuf = null;
    function click(t0, freq, gain, out, len) {
      var c = audio();
      if (!noiseBuf) {
        noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.08), c.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6);
      }
      var src = c.createBufferSource(); src.buffer = noiseBuf;
      var bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = freq || 2400; bp.Q.value = 6;
      var g = c.createGain(); g.gain.value = gain || 0.5;
      src.connect(bp); bp.connect(g); g.connect(out || bus());
      src.start(t0); src.stop(t0 + (len || 0.08));
      return src;
    }
    return {
      audio: audio, bus: bus, later: later, register: register, stop: stop, stopAll: stopAll,
      playing: playing, any: any, setMuted: setMuted, isMuted: function () { return muted; },
      voice: voice, pluck: pluck, click: click,
      onChange: function (f) { listeners.push(f); }
    };
  })();

  // The corner bar every page carries: mute, stop, and a live dot.
  function soundBar() {
    if (!isBrowser) return;
    var bar = document.createElement("div");
    bar.className = "sound-bar"; bar.id = "sound-bar";
    bar.setAttribute("role", "group"); bar.setAttribute("aria-label", "Sound controls");
    bar.innerHTML = '<span class="sound-dot" aria-hidden="true"></span>' +
      '<button id="s-mute" aria-pressed="false" title="Mute the whole page">Sound on</button>' +
      '<button id="s-stop" disabled>Stop</button>';
    document.body.appendChild(bar);
    var bm = bar.querySelector("#s-mute"), bs = bar.querySelector("#s-stop");
    function sync() {
      bar.classList.toggle("live", sound.any());
      bs.disabled = !sound.any();
      var m = sound.isMuted();
      bm.setAttribute("aria-pressed", m ? "true" : "false");
      bm.textContent = m ? "Sound off" : "Sound on";
      // mute disables sound buttons; unmute re-enables only the ones mute disabled
      document.querySelectorAll("[data-needs-sound]").forEach(function (el) {
        if (m) { if (!el.disabled) { el.disabled = true; el.dataset.mutedOff = "1"; } }
        else if (el.dataset.mutedOff) { el.disabled = false; delete el.dataset.mutedOff; }
      });
    }
    sound.onChange(sync);
    bm.addEventListener("click", function () { sound.setMuted(!sound.isMuted()); });
    bs.addEventListener("click", function () { sound.stopAll(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") sound.stopAll(); });
    sync();
  }

  var PAGES = [
    { href: "ladder.html",       title: "Every clock has a comma" },
    { href: "bakeoff.html",      title: "Which tuning thinks best" },
    { href: "metronomes.html",   title: "Metronomes on a plank" },
    { href: "fireflies.html",    title: "Fireflies" },
    { href: "channel.html",      title: "A letter in a piano" },
    { href: "listen.html",       title: "The listening test" },
    { href: "instrument.html",   title: "Play the bank" },
    { href: "comodulogram.html", title: "A comodulogram for a sunflower" }
  ];

  // A thin trail-marker nav at the top of each lab page.
  function nav(current) {
    if (!isBrowser) return;
    var el = document.createElement("nav");
    el.className = "lab-nav";
    el.setAttribute("aria-label", "The back country");
    var html = '<a href="../index.html" class="home">&larr; The comma</a><span class="sep">/</span>' +
      '<a href="index.html"' + (current === "index.html" ? ' aria-current="page"' : "") + '>Back country</a>';
    html += '<span class="trail">';
    PAGES.forEach(function (p, i) {
      html += '<a href="' + p.href + '" title="' + p.title + '"' +
        (p.href === current ? ' aria-current="page"' : "") + '>' + String(i + 1).padStart(2, "0") + '</a>';
    });
    html += '</span>';
    el.innerHTML = html;
    document.body.insertBefore(el, document.body.firstChild);
  }

  root.Kit = {
    REF: REF, PYTH_COMMA: PYTH_COMMA, SYNT_COMMA: SYNT_COMMA, PURE_FIFTH: PURE_FIFTH,
    RAW: RAW, harmonics: harmonics, cents: cents,
    edo: edo, fromPitchClasses: fromPitchClasses, circleFromFifths: circleFromFifths,
    reroot: reroot, TEMPERAMENTS: TEMPERAMENTS, temperament: temperament,
    justIntonation: justIntonation, FIFTH_NAMES: FIFTH_NAMES,
    intervals: intervals, omegas: omegas,
    DT: DT, GAMMA: GAMMA, WASH: WASH, TRAIN: TRAIN, TESTN: TESTN, LEN: LEN, SEED: SEED,
    mulberry32: mulberry32, makeInput: makeInput,
    bench: bench, luFactor: luFactor, luSolve: luSolve,
    delayTarget: delayTarget, nlTarget: nlTarget, registerStep: registerStep,
    drive: drive, queue: queue,
    fit: fit, css: css, alpha: alpha, onTheme: onTheme, reduced: reduced,
    sound: sound, soundBar: soundBar, nav: nav, PAGES: PAGES
  };
})(typeof window !== "undefined" ? window : globalThis);
