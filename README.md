# comma

A web page that lets you hear the Pythagorean comma, then turns the piano's
tuning errors into a reservoir computer and a storage register. Twelve pure
fifths overshoot seven octaves by 23.46 cents; the piano's tuning spreads that
gap and leaves every interval but the octave slightly off. Eleven oscillators
run at those errors, 0.37 to 8.63 Hz, and only a linear readout is trained,
which makes them a reservoir computer. The main page is one HTML file with no
dependencies, told in a plain-spoken first-person voice after Edward Abbey.
Behind it, `lab/` holds eight more pages that take the idea further. A Node
script reruns the simulations to check 41 claims, and a browser script drives
every page.

**Status: working.** Every page runs from its files alone. Headless Chromium
drives every page; no person has yet tested the audio or the microphone pages
on real devices.

Live: https://ampactor.dev/comma/

## Quick start

Open `index.html` in a browser with sound on, or open the live link above.
There is nothing to install or build, and the page
makes no network requests.

In the first panel, Play the true fifth holds a steady tone and Play the
piano's fifth holds one that wobbles; press a button again to stop it. The
striped band below them stands still for the first and crawls at the beat
rate for the second. In section 04, Run the experiment reports a capacity of
9.69, mixing of 1.8% and a reach of 2.8 s at the default coupling.

The Phone speaker and Headphones buttons in the first panel set the pitch.
Phone speaker, the default, plays everything two octaves above concert pitch,
because a phone's small speaker reproduces the concert-pitch tones poorly;
that also makes every beat four times as fast. Headphones plays at concert
pitch. The Sound on and Stop buttons in the bottom-right corner mute the page
or stop everything, and the Escape key also stops everything.

The back country starts at `lab/index.html`, or at the end of the main page.

## How it works

Everything is in `index.html`, which holds the page's text and one script.
The script computes a table of eleven intervals, and both machines take their
rates from it. Either coupling slider sets one shared coupling value, K.

### The intervals

A fifth is a 3:2 frequency ratio and an octave is 2:1. No power of 3 equals a
power of 2, so twelve pure fifths cannot land exactly on seven octaves: they
overshoot by 23.46 cents (a cent is a hundredth of a piano semitone). Equal
temperament, the piano's tuning, closes the gap by making each fifth 1.96
cents narrow, and every other interval inherits an error of its own. The page
takes eleven just intervals (whole-number frequency ratios, from the fifth up
to the 23rd harmonic) above A3 = 220 Hz and computes each one's detuning, its
gap in hertz to the nearest piano note: from 0.37 Hz for the fifth to 8.63 Hz
for the 11th harmonic. A pure note and its piano neighbour beat at exactly
that rate.

### The reservoir computer

A reservoir computer drives a fixed system with an input signal and trains
only a linear readout of the system's state. Here the system is eleven damped
oscillators, each turning at one interval's detuning, coupled through the
mean field: each is pulled toward the bank's average state with strength K
(0 to 8 on the slider, default 0.12). A seeded random input drives the bank
for 7,500 steps at 50 steps per second: 500 to settle, 3,500 to fit the
readout and 3,500 to score it. The readout sees 34 numbers per step (each
oscillator's two coordinates and its power, plus a constant) and is fit by
ridge regression, which is least squares with a small penalty. A held-out
score is the squared correlation between prediction and target on the 3,500
steps the fit never saw. From those scores the page reports capacity (the
scores for recalling the input 0 to 30 steps back, summed), reach (the longest
delay, probed from 40 to 260 steps in tens, that still scores 0.01 or more)
and mixing (the score for the product of the inputs one and three steps back,
a nonlinear task). It runs the fits in frame-sized slices so the page stays
responsive.

### The storage register

The register is a phase-only model of the same eleven rates (a Kuramoto
model): each phase advances at its own rate and is pulled toward the bank's
average phase with strength K. The fifth's oscillator holds nothing, and each
of the other ten holds one character as a phase offset from where it would be
if uncoupled, at 32 levels, 50 bits in all. The page steps it once per
animation frame. Reading it back out loud plays two tones per slot, one at the
current phase and one at the written phase. Two equal tones a phase Δ apart
sum to 2|cos(Δ/2)| times the amplitude of one, so a matched slot rings and a
drifted one cancels toward silence.

### Implementation notes

Three choices keep the simulation meaningful, and dropping any of them breaks
the results without raising an error: exact integration of the linear part,
positive damping, and each oscillator's power in the readout.
[docs/implementation-notes.md](docs/implementation-notes.md) explains them,
and why the input generator is mulberry32.

### Sound

The audio is Web Audio oscillators, with a compressor on the output to keep
stacked tones from clipping. The reservoir's rates stay at concert pitch
whatever the playback pitch. After a run, Hear it think plays eight seconds
of the reservoir's measured amplitudes as the loudness of eleven tones.

### Notes

[notes/tuning-channel.md](notes/tuning-channel.md) estimates that a piano's
tuning could hide about 300 bits before an audience noticed, and names the two
psychoacoustic thresholds that estimate rests on.
[notes/plant-comodulogram.md](notes/plant-comodulogram.md) is a protocol for
measuring phase-amplitude coupling (whether the loudness of a fast rhythm
follows the phase of a slow one) in plants, with a null result on this bank
from a script that is not in the repository. `lab/comodulogram.html` now runs
that analysis in the open: over 600 seconds at K = 8 the page's additive bank
shows no significant cell, and the multiplicative variant lights eight.

### The back country

The `lab/` pages share `lab/kit.js`, which carries the main page's bank with
the detunings passed in instead of fixed, plus tunings, a frame-sliced
experiment runner, the register step and the sound and canvas plumbing. Fed
the piano's detunings it reproduces the main page bit for bit, which the
verify script checks. `lab/lab.css` carries the main page's look.

| Page                 | What it does                                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| `ladder.html`        | The comma in fifths, leap years, the moon, Jupiter and Saturn, the golden ratio and π, drawn as a spiral whose spokes are the continued fraction's rungs. |
| `bakeoff.html`       | Builds the bank from ten historical and equal tunings, from every equal division of 5 to 60 notes, from a blind search over eleven rates, and with up to 47 clocks. |
| `metronomes.html`    | Metronomes on a plank on rollers (Pantaleone's model) with a letter written on each, erased as they fall into step. |
| `fireflies.html`     | Pulse-coupled fireflies (Mirollo–Strogatz), and a mode in which two phones sync by chirping through the air.    |
| `channel.html`       | Writes a message into a piano's tuning with a Reed–Solomon code over GF(32), then lets a humid summer and a tuner at it. |
| `listen.html`        | Staircase tests that measure the two hearing thresholds the tuning-channel estimate rests on, and a microphone beat meter for a real piano. |
| `instrument.html`    | The live bank driven by pointer, keys, MIDI or microphone, with readouts that replay your input and a drift clock. |
| `comodulogram.html`  | A phase-amplitude coupling analysis with surrogates and a file reader, run on the bank with additive and multiplicative coupling. |

[notes/breadboard.md](notes/breadboard.md) is a build sheet for the bank as
op-amp resonators, with every component value computed from the detunings.
Nobody has built it.

## Benchmarks

These are simulation results from a seeded input, so every run gives the same
numbers. `node tools/verify.mjs` prints them in about a second under Node
22.22.2 on Linux, and the page's buttons show the same values in headless
Chromium. Every score is held out. The 0-to-300 column is the same script with
the `30` in its capacity loop changed to `300`.

| Coupling K     | Capacity, delays 0 to 30 | Capacity, delays 0 to 300 | Mixing | Reach |
| -------------- | -----------------------: | ------------------------: | -----: | ----: |
| 0              |                     9.47 |                     19.34 |   1.5% | 2.8 s |
| 0.12 (default) |                     9.69 |                     19.35 |   1.8% | 2.8 s |
| 0.45           |                    10.22 |                     19.29 |   2.3% | 2.4 s |
| 1              |                    10.95 |                     19.30 |   3.2% | 2.2 s |
| 2              |                    11.97 |                     19.17 |   4.8% | 1.8 s |
| 4              |                    13.37 |                     18.65 |   7.3% | 1.4 s |
| 6              |                    14.34 |                     18.12 |   8.9% | 1.0 s |
| 8              |                    15.05 |                     17.45 |  11.5% | 1.0 s |

Coupling trades reach for mixing. Uncoupled, reach is 2.8 seconds; at K = 8
it is 1.0 second, while mixing rises 7.87-fold. Capacity over the first 31
delays hides the trade by rising, because those delays span only 0.6 seconds
of a memory nearly three seconds long; summed out to delay 300, it falls.

Scoring on held-out data changes the answer. With 34 features and 3,500 fit
samples, fitting pure noise would give in-sample scores of about 34/3,500 ≈
0.01 per task, the cutoff the reach probe uses. At K = 0.12 and a delay of
160 steps, the in-sample score is 0.0157, which would count as memory, and
the held-out score is 0.0081, which does not.

At K = 0.12, scaling every detuning to zero drops capacity to 1.08, about one
oscillator's worth; the piano's detunings give 9.69, nine times as much.

The bank stays well below the page's ceiling of 34, one per readout number.
Over the first 31 delays capacity peaks at 15.05, under half, which the
script checks. Summed to delay 300 it peaks at 19.35, 57%, so the half-ceiling
line holds only inside the short window. The rates all sit within 0.37 to
8.63 Hz, so the oscillators carry much of the same information.

The register decays under the same coupling value. At K = 0.12 all ten slots
hold for 240 seconds, and the first slip, at 270.5 seconds, is on one of the
best-tuned intervals. At K = 2 every slot leaves its written level between 0.7
and 14.9 seconds. In the script's model the best-tuned slots tend to go first,
though not strictly in order of their error.

### Which tuning thinks best

Capacity summed over delays 0 to 300 at K = 0.12, from `lab/bakeoff.html`;
the verify script checks the orderings.

| Tuning                 | Capacity, delays 0 to 300 |
| ---------------------- | ------------------------: |
| Kirnberger III         |                     21.16 |
| Vallotti               |                     20.60 |
| 19 equal               |                     20.60 |
| Pythagorean            |                     19.65 |
| Equal temperament      |                     19.35 |
| Werckmeister III       |                     19.21 |
| Quarter-comma meantone |                     17.61 |
| Five-limit just        |                     15.43 |
| 31 equal               |                     14.48 |
| 53 equal               |                     11.09 |

Finer tunings make a weaker bank. Across equal divisions of 5 to 60 notes the
best is 13 notes at 21.9, and the mean falls from 20.5 over 9 to 20 notes to
15.2 over 26 to 60. Eleven evenly spaced rates in the piano's band hold 22.11,
and a 160-step random search found 22.22, so the piano's fan reaches 87% of
the best found. Banks of 11 to 47 clocks grow from 19.3 to 59.9 while the
share of their ceiling they use falls from 57% to 42%.

### Spoken digits

`node tools/digits.mjs path/to/fsdd` runs the bank on the Free Spoken Digit
Dataset (3,000 recordings of 0 to 9 by six speakers, not included; the
script's header says how to fetch it), trained on recordings 5 to 49 and
tested on 0 to 4. Speech reaches a 50-step-per-second bank as loudness
envelopes. Every row uses the same ridge readout over thirds of the
utterance; chance is 10%.

| Front end and reservoir                         | Test accuracy |
| ----------------------------------------------- | ------------: |
| Loudness only, no bank                          |         25.7% |
| Loudness only, no bank, 192 features            |         31.7% |
| Loudness only, the piano's bank, K = 0.12       |         49.7% |
| Loudness only, the bank with no errors          |         25.7% |
| Loudness only, the piano's bank, K = 2          |         50.0% |
| Eleven bands, no bank                           |         91.3% |
| Eleven bands, the piano's bank, K = 0.12        |         90.0% |
| Eleven bands, the bank with no errors           |         90.0% |

Fed only loudness, the detunings double the readout's accuracy, and removing
them takes it back to no bank at all. Fed eleven frequency bands, the readout
does well alone and the bank adds nothing.

## Testing

```sh
node tools/verify.mjs     # the arithmetic: 41 claims, about fifteen seconds
node tools/browser.mjs    # the pages: every page in headless Chromium
```

`verify.mjs` needs only Node (tested with 22.22.2). It cuts the three marked
blocks (`[verify:intervals]`, `[verify:core]` and `[verify:bank]`) out of
`index.html` and runs them, so it tests the code the browser runs. It then
loads `lab/kit.js` and checks it against those blocks, re-measures every
ordering and number the lab pages' prose states, and runs the marked analysis
blocks inside the lab pages (the beat meter in `listen.html`, the Reed–Solomon code in `channel.html` and the phase-amplitude analysis in `comodulogram.html`). It prints PASS or FAIL
for each claim and exits with status 1 if any fails.

`browser.mjs` needs Playwright with Chromium. It opens every page at 1280 and
390 pixels wide in dark and light, presses the main buttons on the pages that
have measurable results, and fails on any script error or sideways scroll.
`.github/workflows/check.yml` runs both on every push.

Neither script listens to anything, so no test backs the page's claims about
sound. The register is stepped in fixed 0.02-second steps where the page steps
once per animation frame, so the page's timings can differ a little.

## Limitations

The oscillator bank is a demonstration and a weak computer: even at the
strongest coupling its readout scores 0.115 out of 1 on a simple nonlinear
task, and it uses under 60% of the memory its 34 readout numbers allow. The
simulations are checked by a Node script and the pages by a headless browser,
but no person has yet taken the listening test, and the microphone and
two-phone modes have been tested only with simulated input.

- The page presents the reservoir and the register as one bank read at two
  speeds. In the code they are two simulations that share the eleven rates and
  the coupling value. The reservoir runs as a 7,500-step batch per
  measurement, and the register runs continuously.
- The register's read-back shows each slot's current level. Under strong
  coupling a phase keeps turning, so a letter can drift off and come back
  after the time the script reports for it.
- The live register advances only while the tab is visible, by at most 0.05
  seconds per frame, so it runs slow below 20 frames per second.
- The script runs in Node's V8 engine. Firefox and Safari have their own
  implementations of functions such as `Math.sin`, so their live numbers are
  unchecked and may differ slightly.

## License

No license chosen yet.
