# The bank on a breadboard

The oscillator bank on the main page is eleven equations in a browser. It
doesn't have to be. Every term in those equations is something an op-amp
does for a living, and the whole bank fits on two breadboards for the price
of a nice dinner. This note is the build sheet: circuit, component values
computed from the piano's actual detunings, the coupling knob, and how to
read the thing out and check it against the simulation.

Nobody has built it yet. The values below are arithmetic, not measurements.

## What gets built

The simulation works in the rotating frame: each oscillator turns at its
interval's *detuning*, 0.37 to 8.63 Hz, not at the interval's 220-odd Hz.
So the breadboard builds those slow oscillators directly. (The acoustic
version, eleven resonators at the real pitches beating against a reference,
would need a quality factor near 1,150 at 220 Hz to get the same 1.7-second
memory. Tuning forks manage that; breadboards don't. The forks are a
different and better weekend.)

Each oscillator is a damped resonator with two outputs a quarter-cycle
apart. Those two outputs are the real and imaginary parts of z, which is
exactly what the readout needs.

## One oscillator: a Tow–Thomas biquad

Three op-amps per oscillator: a lossy integrator, a plain integrator, and a
unity inverter closing the loop. With equal resistors R and capacitors C,

- the natural frequency is ω = 1/(RC),
- the decay rate is 1/(2·R_Q·C), where R_Q is the resistor across the lossy
  integrator's capacitor,
- the band-pass and low-pass outputs are in quadrature: Re z and Im z.

The page's damping is γ = 0.6 per second for every oscillator. Setting
1/(2·R_Q·C) = γ gives R_Q = 1/(2γC), which doesn't depend on frequency. With
C = 1 µF, **every oscillator gets the same 833 kΩ damping resistor** (820 kΩ
from the E24 series, about 1.6% faster decay). That's the circuit's way of
saying what the equations say: one memory time for the whole bank, and only
the speeds differ.

## Component values

C = 1 µF film capacitors throughout, two per oscillator. R = 1/(2π·|f|·C). Q = ω/(2γ) is listed only so you know what you're
asking of the parts; the low ones are lazy, the high ones are fussy.

| Interval      | Detuning (Hz) | Turns            | R (exact) | R (E24)  | Q    | DRIVE |
| ------------- | ------------: | ---------------- | --------: | -------: | ---: | ----: |
| fifth         |         0.372 | counterclockwise | 427.3 kΩ  | 430 kΩ   |  2.0 | 0.550 |
| major third   |        −2.183 | clockwise        | 72.9 kΩ   | 75 kΩ    | 11.4 | 0.865 |
| harmonic 7th  |        −6.995 | clockwise        | 22.8 kΩ   | 22 kΩ    | 36.6 | 0.685 |
| major second  |         0.558 | counterclockwise | 285.0 kΩ  | 300 kΩ   |  2.9 | 1.000 |
| 11th harmonic |        −8.627 | clockwise        | 18.4 kΩ   | 18 kΩ    | 45.2 | 0.820 |
| 13th harmonic |         8.272 | counterclockwise | 19.2 kΩ   | 20 kΩ    | 43.3 | 0.640 |
| major seventh |        −2.805 | clockwise        | 56.7 kΩ   | 56 kΩ    | 14.7 | 0.955 |
| 17th harmonic |         0.668 | counterclockwise | 238.2 kΩ  | 240 kΩ   |  3.5 | 0.775 |
| 19th harmonic |        −0.376 | clockwise        | 423.8 kΩ  | 430 kΩ   |  2.0 | 0.595 |
| 21st harmonic |        −4.915 | clockwise        | 32.4 kΩ   | 33 kΩ    | 25.7 | 0.910 |
| 23rd harmonic |         5.123 | counterclockwise | 31.1 kΩ   | 30 kΩ    | 26.8 | 0.730 |

The detunings and DRIVE weights come straight from `lab/kit.js`, which
reproduces `index.html`. E24 rounding and 5% capacitors will move each
frequency by a few percent. That's harmless: the bank's behaviour depends on
the fan having many different speeds, not on any one speed being exact. Use
1% resistors and don't lose sleep.

**Direction of turning.** A physical resonator doesn't care which way its
phasor turns; that's a matter of which output you call the imaginary part.
For the clockwise oscillators, call the inverted low-pass output Im z. The
sign only matters in one place, the coupling, below.

## The coupling knob

The page's coupling term is K·(z̄ − z_j): each oscillator pulled toward the
bank's average with strength K.

1. **The average.** Two summing amplifiers, one for the eleven Re outputs
   and one for the eleven Im outputs (using the sign convention above), each
   with eleven equal input resistors and a feedback resistor one-eleventh
   their value. Their outputs are Re z̄ and Im z̄.
2. **The pull.** Feed Re z̄ back into each oscillator's lossy integrator
   through a resistor R_K, and Im z̄ into the other integrator the same way.
   An inverting integrator's input is a virtual ground, so the injected
   current adds K·z̄ to that oscillator's rate of change, with K = 1/(R_K·C).
3. **The minus sign.** The −K·z_j half is just extra damping: a second R_K
   from the oscillator's own output to its own summing node, which sits in
   parallel with R_Q.

With C = 1 µF, the page's default K = 0.12 is R_K = 8.3 MΩ, and its maximum
K = 8 is 125 kΩ. One master knob is a 22-gang pot, which you will not find,
so use a voltage-controlled gain (an OTA such as the LM13700, or a
multiplying DAC) after each summing amplifier and drive all of them from one
control voltage.

## The nonlinearity

The equations carry a saturating term, −|z|²·z, that keeps the oscillators
bounded. The breadboard gets something like it for free from the op-amp
rails, and a softer version from a pair of back-to-back diodes across each
lossy integrator's capacitor. Neither is the same cubic, so expect the
numbers at strong drive to differ from the page. At the page's input level
the oscillators stay small and the term barely matters. The readout's power
features, |z|², are computed after sampling, not in hardware.

## Input and readout

- **Input.** One DAC (an MCP4725 is fine) plays the seeded input sequence at
  50 samples per second. Eleven resistors from the DAC to the oscillators set
  the DRIVE weights: R_drive = R_in / DRIVE for some base R_in. Use the same
  mulberry32 seed, 12345, so the hardware hears the exact sequence the page
  does.
- **Readout.** Twenty-two analog channels at 50 samples per second. Three
  MCP3208 eight-channel ADCs on one SPI bus, or any microcontroller with
  enough inputs. Log Re and Im for every oscillator to a file, compute |z|²
  afterwards, and fit the ridge readout offline.
- **Checking it.** `lab/kit.js` will fit and score any recorded state:
  `Kit.bench(OMEGA).makeSim(K, 1, input)` builds the state matrix layout the
  fitter expects, so a short script that fills that matrix from the log
  instead of from the simulation gets capacity, reach, and mixing for the
  real circuit, scored on held-out data the same way.

## Parts

Eleven oscillators × three op-amps = 33, plus two for the averages: nine
TL074 quads. Twenty-two 1 µF film capacitors, about seventy resistors, eleven
OTAs or a multiplying DAC, one DAC, three ADCs, a microcontroller, ±12 V.
Two full-size breadboards. Call it fifty to eighty dollars, most of it in
film capacitors.

## What would be worth finding out

- Whether the capacity the page measures survives component spread,
  thermal drift, and op-amp noise. The simulation has none of those.
- Whether the coupling trade (reach falls, mixing rises as K goes up) shows
  up with a real, imperfect average instead of an exact one.
- How long the phase register actually holds a letter in hardware, where
  every oscillator also drifts on its own. That drift is a second, uninvited
  coupling, and it might be the more interesting one.
