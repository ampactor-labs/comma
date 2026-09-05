# A comodulogram for a plant

Phase-amplitude coupling is neuroscience's standard test for information
multiplexed across timescales: bin the phase of a slow rhythm, ask whether the
envelope of a fast one rides it, draw the grid of couplings as a comodulogram.
The tool is thirty years mature. The plant electrophysiology literature,
meanwhile, reports fast oscillations at 5 to 25 Hz, slow wound and osmotic
waves on minute scales, circadian envelopes over everything, and analyzes all
of it with power spectra, Lempel-Ziv complexity, and criticality statistics.
As far as I can find, nobody has ever computed a comodulogram on a plant. The
tool has never met the organism. This note is the protocol for introducing
them, plus one measurement we could take immediately and did.

## The result in hand: the bank refuses to fake it

Before proposing plant recordings, we ran the analysis on the one oscillator
bank already wired up: the eleven-oscillator reservoir in `index.html`, whose
slow detunings (0.37 to 0.67 Hz) can supply phase and whose fast ones (4.9 to
8.6 Hz) can supply amplitude. Collective signal, five phase bands, three
amplitude bands, Tort modulation index, 200 circular-shift surrogates.

Nothing. Maximum z-score 2.9 across every coupling from K=0 to K=8; not one
cell significant. Meanwhile the ridge readout measures 11.5% cross-time mixing
on the very same trajectory at K=8. Both numbers are correct, and their
disagreement is the most useful thing this note contains: the bank's coupling
is additive, PAC requires multiplication, and the mixing that the quadratic
|z|² features hand to the readout never surfaces in the raw field. A system
can multiplex information and still show a flat comodulogram if your electrode
sees only a linear projection of it.

Two lessons transfer directly to any plant attempt. A null comodulogram does
not mean no cross-timescale structure; try nonlinear observables of the same
recording before concluding. And power is unforgiving: our 140 seconds gave
barely fifty cycles of the slowest phase band, which is marginal; a plant
phase band at 0.01 Hz needs several hours of stable recording to say anything.

## Protocol

**Subject.** Any species from the electrome literature works (soybean and
wheat seedlings have precedent). The thematically obligatory choice is a
sunflower.

**Electrodes.** Surface recording is standard and non-invasive; printed
adhesive gel electrodes hold on leaves for long sessions, and Ag/AgCl with
conductive gel is the budget path. Two recording sites (leaf and stem) plus a
soil reference give a bipolar pair and a sanity channel.

**Front end.** Input impedance of 10^12 ohms or better, DC-coupled or
high-passed no higher than 0.001 Hz, into a 24-bit ADC at 250 Hz. Everything
lives in a Faraday enclosure with temperature and humidity logged, because
drift is the confound that eats slow-band phase.

**Duration and conditions.** At least six hours per condition: undisturbed
baseline, a light step, a watering event, and a single mechanical wound (the
canonical slow-wave inducer). Event windows and steady-state windows are
analyzed separately, never pooled.

**Analysis.** Comodulogram with phase bands log-spaced over 0.003 to 0.3 Hz
and amplitude bands over 2 to 25 Hz; Tort modulation index; at least 200
circular-shift surrogates per cell; false-discovery correction across the
grid. The scratchpad script that produced the bank measurement generalizes
directly.

**Controls, which are the actual experiment.**
A dead or cut plant and an agar dummy under identical electrodes, because
electrode chemistry oscillates too. A mains notch, and note the irony
carefully: the 50/60 Hz grid hum that serves as a forensic timestamp
elsewhere is pure contaminant here. Waveform-shape artifacts most of all:
plant action potentials and slow waves are spiky, spiky waveforms carry
harmonics that are phase-locked to themselves, and self-locked harmonics
masquerade as PAC. Re-run every significant cell on a spike-removed version
of the series, inspect the band-filtered waveforms by eye, and treat coupling
that appears only around stimulus events as artifact until it survives all of
that.

## Outcomes

A comodulogram that lights up and survives the controls would be, as far as I
can tell, the first evidence of cross-frequency multiplexing in the plant
electrome: coordination across timescales in an organism with no neurons. A
flat one is still a publishable constraint, with the bank's caveat attached:
try the nonlinear observables before declaring the organism unmixed. Coupling
that appears only at events is a waveform artifact wearing a costume, and the
controls section exists to take the costume off.

None of this measures experience, intent, or awareness. PAC is a statistical
dependency between two filtered projections of one voltage. What it would
show is organization; what it cannot show is anyone home.

## Status

Commodity gear end to end; the analysis code exists in this repo and needs
only a file reader in front of it. The two genuine unknowns are electrode
stability across six-hour sessions and the actual shape of the chosen plant's
spectrum, which decides the bands. Both are answered by the first afternoon
of recording, which is the correct way to answer them.
