# comma

A web page that lets you hear the Pythagorean comma, then turns the piano's
tuning errors into a reservoir computer and a storage register. Twelve pure
fifths overshoot seven octaves by 23.46 cents; the piano's tuning spreads that
gap and leaves every interval but the octave slightly off. Eleven oscillators
run at those errors, 0.37 to 8.63 Hz, and only a linear readout is trained,
which makes them a reservoir computer. It is one HTML file with no
dependencies; a Node script reruns its simulation to check 14 claims.

**Status: working.** It runs from the file alone, but no test drives it in a browser, and the live link returns 404 until the portfolio site next deploys.

Live: https://ampactor.dev/comma/

## Quick start

Open `index.html` in a browser with sound on, or the live link above once the
portfolio site deploys. There is nothing to install or build, and the page
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
from a script that is not in the repository.

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

## Testing

```sh
node tools/verify.mjs
```

The script needs only Node (tested with 22.22.2). It cuts the three marked
blocks (`[verify:intervals]`, `[verify:core]` and `[verify:bank]`) out of
`index.html` and runs them, so it tests the code the browser runs. It prints
PASS or FAIL for each of 14 claims and exits with status 1 if any fails. The
claims cover the detunings, the coupling sweep, the delay-160 scores, the
zero-detuning budget and the register's timing. No CI runs it.

Nothing drives the page in a browser, so its buttons, audio, charts and job
queue are unchecked, and no listening test backs its claims about sound. The
script steps the register in fixed 0.02-second steps where the page steps once
per animation frame, so the page's timings can differ a little. It does not
check the page's arithmetic (such as the 23.46 cents), which slot slips first,
or the order in which the register empties.

## Limitations

The oscillator bank is a demonstration and a weak computer: even at the
strongest coupling its readout scores 0.115 out of 1 on a simple nonlinear
task, and it uses under 60% of the memory its 34 readout numbers allow. Only
the simulation is checked. A Node script reruns the page's simulation code,
but nothing tests the page itself in a browser, and no listening test backs
what the page says you will hear.

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
