# Test fixture

`probe-keanu-2014.jpg` is "Keanu Reeves 2014.jpg" from Wikimedia Commons.

It is deliberately a DIFFERENT photo from the one used to build the gallery entry
for Keanu Reeves ("Keanu Reeves – Dogstar – Tons of Rock 2026-3.jpg"), so
/debug-match is a genuine held-out test rather than a self-match. The two photos
are twelve years apart, which is the point.

`probe-b.jpg` is "Keanu Reeves 2019.jpg", used by the doppelgänger comparison
check. Measured against `probe-keanu-2014.jpg` it gives 0.371 — five years
apart, same person.
