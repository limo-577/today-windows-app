# Local security fork of sprintf-js

This package is based on upstream `sprintf-js` 1.1.3. It is used through the
root npm override because no upstream release containing this bounds check has
been confirmed. The upstream disclosure is disputed; this patch is defense in
depth for the advisory still reported by the npm audit database.

The project patch bounds numeric precision before calling JavaScript's
`toFixed`, `toExponential`, or `toPrecision`:

- `%e` and `%f` precision is capped at 100 and floored at 0.
- `%g` precision is capped at 100 and floored at 1.

This prevents attacker-controlled precision from propagating an out-of-range
`RangeError` out of the formatter. Review this fork whenever the upstream
dependency changes, and remove it after adopting an upstream version with an
equivalent fix.

The install uses `vendor/sprintf-js-1.1.4-security.0.tgz` so Windows installs do
not need directory symlink privileges. If this source changes, regenerate that
archive from the repository root with `npm pack ./vendor/sprintf-js
--pack-destination ./vendor --ignore-scripts` and commit both the source and
archive.

The upstream BSD-3-Clause license is included in `LICENSE`.
