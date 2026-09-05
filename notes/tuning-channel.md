# The tuning channel

How many bits can a piano's tuning hold before an audience hears that something
is wrong? I couldn't find this number published anywhere, so here is the
arithmetic. The answer is on the order of 300 bits per tuning, and the
load-bearing inputs are two psychoacoustic thresholds, flagged below.

## The channel

A tuning assigns every string an offset from a public reference. The reference
is 12-tone equal temperament plus the standard stretch curve; both are common
knowledge, which is what makes this a channel and not a shared secret. The
message is the pattern of deliberate deviations. The reader is anyone with a
strobe tuner and a reason to look. The adversary is the audience, who must not
notice, and the noise is the instrument itself, which drifts.

The liberating fact is how much wrongness is already tolerated. Equal
temperament's major third sits 13.7 cents sharp of pure and has for three
centuries. The stretch curve pushes the piano's top octave 20 to 30 cents sharp
of nominal and the bottom similarly flat, and two respected tuners will disagree
by several cents about how. Historical well temperaments scattered individual
keys up to 10 cents from equal and were performed nightly. The acceptance
region is not "within a hair of correct"; it is "within the neighborhood of
some defensible tuning," and that neighborhood is wide.

## Three sub-channels

**Temperament.** Twelve pitch-class offsets, propagated up the instrument. Give
each a window of ±5 cents around equal temperament, conservative against the
historical record, at a resolution of 2 cents, which a strobe reads easily and
an instrument holds for weeks. That is six distinguishable levels per pitch
class: log2(6) ≈ 2.6 bits, twelve pitch classes, about **30 bits**. A well
temperament secretly carries six characters of the register's alphabet.

**Per-key deviation from the stretch.** The stretch curve is smooth, but each
of 88 keys may sit slightly off it, and tuners' own curves wobble by a few
cents. A ±2 cent wiggle per key at 2-cent resolution is three levels, log2(3) ≈
1.6 bits, times 88 keys: about **140 bits**.

**Unisons.** Some 60 notes in the tenor and treble carry three strings each.
Tuners already shade unisons deliberately; a spread of a cent or two is heard
as warmth before it is heard as error, which is the voix céleste principle at
homeopathic dose. Two adjustable strings per note, ±1.5 cents at 1-cent
resolution, is 4 levels each: 2 bits × 2 strings × 60 notes, about **240
bits** at the optimistic end. Halve it for stability and call it **120**.

Total: roughly **290 bits**, honestly uncertain by a factor of two in either
direction. The signature at the bottom of the page costs 70 bits in the
register's 5-bit alphabet. The piano holds it four times over, with room for an
error-correcting code.

## Noise, erasure, and the enemy

Humidity moves a piano by several cents across a season, mostly as correlated
drift within regions of the compass: burst noise, in coding terms, which is
what Reed-Solomon codes are for. Budget a third of the channel for redundancy
and the payload is still around 190 bits, or 38 characters.

The true adversary is not drift. It is the piano tuner, who is the coupling
constant with a face: a professional whose entire craft is relaxing deviations
back to consensus. One service call erases the message, nearly-in-tune offsets
first, exactly like the register on the page. A message in a tuning survives
precisely as long as nobody qualified listens to the instrument with the
intent to fix it.

## Why not more: the infinite spiral, resolved

The spiral of fifths never closes, so it visits infinitely many distinct pitch
classes; doesn't that mean infinite storage? No, and the reason is the whole
game. Because log2(3) is irrational, the stacked fifths land dense on the
octave circle: infinitely many points, ever closer together. Dense is exactly
the problem. Points that crowd each other cannot be told apart by any reader
with a resolution floor, and every physical reader has one. The capacity of a
continuous register is not the count of its states, which is infinite; it is
log2 of how many states fit above the noise, which never is.

The commas are this arithmetic wearing period costume. The convergents of
log2(3) are 3/2, 8/5, 19/12, 65/41, 84/53: nineteen octaves against twelve
fifths misses by 23.46 cents, which is the Pythagorean comma and the error term
of the fourth convergent; eighty-four octaves against fifty-three fifths misses
by 3.6 cents, Mercator's comma, the error of the sixth. Each temperament is a
rational approximation to an irrational number, and each comma is the
approximation's remainder. How far down that ladder you can read is set by
your noise floor: an ear that resolves 4 cents can use 12 tones; an ear that
resolved 0.5 cents could use 53. The spiral is infinite. Your resolution is
not. Capacity is the quotient.

The register on the page obeys the same law at every layer. Thirty-two levels
per slot is 5 bits because the demo's drift and the strobe-style visual read
resolve 11.25 degrees comfortably; the simulation's floats would permit
millions of levels, but the page is honest to an instrument, not to a double.
And the audible read through 2·|cos(Δ/2)| carries fewer bits than the visual
one, because the interference fringe is flattest exactly at a match: the
readout's sensitivity lives at quadrature and dies at the poles, so an
optimally coded register would space its levels by equal loudness difference,
not equal phase. Uniform levels are a courtesy to the alphabet, not the
channel's preference.

## Status

The structural claims are solid; the two empirical inputs are the audience
detection window (taken as ±5 cents on temperament, defended by the historical
record above) and the practical resolution floor (2 cents, strobe precision
degraded by short-term stability). Tighten or loosen those and the total moves
linearly. Nobody appears to have published this number; if it ever leaves this
repo, those two thresholds are what need real citations, and ideally a real
listening test.
