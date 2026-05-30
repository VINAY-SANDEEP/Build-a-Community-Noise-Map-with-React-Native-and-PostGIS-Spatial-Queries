Explain dBFS vs SPL

dBFS (Decibels relative to Full Scale) is a unit of measurement for amplitude levels in digital systems, such as PCM audio, which have a defined maximum peak level. The level of 0 dBFS represents the maximum possible digital level.

SPL (Sound Pressure Level) is a logarithmic measure of the effective pressure of a sound relative to a reference value. It is measured in decibels (dB) above the standard reference level of 20 μPa and reflects acoustic energy in the physical world.

Conversion

Translating dBFS measurements from a device microphone to real-world SPL is challenging because it depends on the microphone sensitivity, amplifier/gain settings, and the acoustic coupling between the microphone and the environment. For practical, crowdsourced applications where per-device calibration is not feasible, we use a simple linear offset approximation:

SPL ≈ dBFS + CalibrationOffset

Calibration Offset

For this application we use a fixed calibration offset of 95. This value is intentionally heuristic — it produces SPL-like numbers that are useful for visualizing relative noise patterns across a city, but it is not a substitute for a calibrated measurement system.

Why this is an approximation

- Device hardware varies: different phone models and microphone designs will report different dBFS values for the same acoustic pressure.
- Software differences: OS-level audio processing, AGC (automatic gain control), and pre-amplification affect measured levels.
- Measurement conditions: microphone placement (in-hand, pocket), wind, or reflections change readings.

Because of these factors, SPL ≈ dBFS + CalibrationOffset should be treated as a pragmatic approximation for mapping and pattern detection rather than an absolute measurement. If higher accuracy is required, implement device-specific calibration procedures or use an external, calibrated microphone.
