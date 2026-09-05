# comma

Twelve perfect fifths don't land on seven octaves. They overshoot by 23.46 cents,
about a quarter of a semitone, and no tuning system has ever closed that gap.
Equal temperament shaves a little off every fifth so the error spreads evenly and
nothing is ever quite in tune. The leftover is the Pythagorean comma.

This is one page that lets you hear it, then builds two machines out of it.

Open `index.html` in a browser. You need sound.

## What it is

Eleven oscillators, each tuned to a just interval and detuned from the piano's
version of that interval by exactly the amount the piano gets it wrong. That's
0.37 to 8.63 Hz out of 220, depending on the interval; the piano's error is not a
flat tax, it's a fan of different clocks spread across more than an order of
magnitude.

Read that bank fast and it's a reservoir computer. Read it slow and it's a
storage register: write a message into the phase drift, turn the coupling up,
and hear the letters die as the oscillators talk each other into agreement. Same
eleven oscillators both times, running at once, on different clocks.

## What's measured

Everything numeric on the page is fit live in the browser.

Capacity is scored on 3,500 samples the readout never saw, fit on a different
3,500. This is load-bearing: with thirty-four features,
in-sample scores carry a floor near `nf/T` ≈ 0.01 per task from fitting noise
alone, which is enough to invent a long memory tail that isn't there. At the
default coupling and delay 160, the in-sample score reads 0.0157, over the 0.01
threshold that would count it as memory; the held-out score reads 0.0081 and
correctly refuses it.

Coupling trades reach for mixing. Uncoupled, the bank can still be read 2.8
seconds back; at the top of the sweep it reaches one second and mixing has gone
up close to eightfold, 1.5% to 11.5% on the product task. That exchange is
invisible if you sum capacity over the first thirty delays, because thirty
delays is six tenths of a second and the memory is nearly three seconds long.
Reach has to be scanned past the edge of the chart or it just reports the width
of the window you chose.

Capacity never exceeds half its own ceiling. Eleven oscillators separated by less
than 9 Hz are close to being one oscillator, and that redundancy is the comma's
smallness showing up again, this time as memory the bank doesn't have. The
budget panel runs the counterfactual: scale every detuning to zero and capacity
collapses to 1.08, one oscillator's worth; at the piano's actual errors it reads
9.69. The errors are the difference.

The storage register decays under the same mean-field coupling, integrated
live; nothing schedules which letter dies. At the default whisper the first
slot slips after four and a half minutes, and the slot that slips is held by
one of the most in-tune intervals. At K = 2 the first letter dies in under a
second and the worst interval holds past fourteen.

`node tools/verify.mjs` re-measures every number this file and the page claim,
running the same marked code the browser runs, and fails if prose and physics
disagree.

## Implementation notes

Three constraints hold the simulation together, and each one fails quietly if you
drop it.

Integrate the linear part exactly, rotating by ω·DT and scaling by exp(−γ·DT).
Explicit Euler is unstable at these frequencies: the fastest detuning is ω·DT ≈
1.08 rad/step, which Euler amplifies by about 1.47 per step. A magnitude clamp
turns that into oscillators pinned at the clamp instead of a visible blowup.

Keep γ positive. A self-sustaining limit cycle at amplitude ~1 against an input
contribution ~0.016 is a signal-to-noise ratio of 3e-4, and the bank ends up
holding its own oscillation instead of the signal.

Read power as well as amplitude. A bank of linear filters read linearly is still
a linear filter, so `|z|²` is what carries any nonlinear capacity at all. It's
also the observable an ear has; the cochlea is a filter bank followed by a
detector, and the beat you hear in section 03 is that square.

One more, learned the hard way: the input generator is mulberry32. The obvious
one-line LCG multiplies past 2^53, loses its low bits to float rounding, and
cycles after 10,466 draws; one experiment draws 7,500, so it was one parameter
bump away from feeding the bank a repeating tape and calling the echo memory.

## Sound

Anything that holds a note holds it until you press the same button again. The
control in the corner mutes the page or stops everything at once, and escape
stops everything. There's an octave switch in the header because phone speakers
reproduce almost nothing below 500 Hz, and the whole point is audible beating.
