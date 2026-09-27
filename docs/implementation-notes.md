# Implementation notes

These notes cover the numerical choices in the reservoir simulation, the
`[verify:core]` block of `index.html`. Three of them keep the simulation
meaningful, and each one fails without any error if you drop it. The fourth
note is about the input generator.

## Exact integration of the linear part

Each step rotates every oscillator by ω·DT and scales it by exp(−γ·DT), which
solves the linear part of its equation exactly. Explicit Euler, the simplest
step, is unstable at these frequencies. The fastest oscillator turns 1.08
radians per step (8.63 Hz at 50 steps per second), and Euler multiplies its
size by √(1 + 1.08²) ≈ 1.47 per step. The code clamps each oscillator's
magnitude at 6, so under Euler the fast oscillators would sit pinned at the
clamp, and nothing would visibly blow up.

## Positive damping

The damping γ is 0.6, a memory time of 1/γ ≈ 1.7 seconds. With γ below zero,
each oscillator settles into a self-sustaining cycle of its own, and the bank
ends up holding that cycle more than the input.

## Power in the readout

The readout sees each oscillator's power |z|² as well as its two coordinates.
A bank of linear filters read linearly is still a linear filter, so the power
terms carry nearly all of the nonlinear capacity that the mixing task
measures. Power is also closer to what an ear hears: the cochlea is a bank of
filters followed by detectors, and a beat is a slow swing in the power of two
nearby tones.

## The input generator

The input comes from mulberry32, a small seeded generator whose 32-bit state
runs through all 2^32 values before repeating. The one-line linear
congruential generator it replaced, `s = (s * 1103515245 + 12345) & 0x7fffffff`,
multiplied past 2^53, where JavaScript numbers lose integer precision, so it
dropped low bits. Rerun from its seed of 12345 in the first commit, its
sequence falls into a cycle 10,466 draws long and starts repeating after
16,403 draws. One experiment draws 7,500, so a run a little over twice as long
would have fed the bank a repeating input, which a readout can mistake for
memory.
