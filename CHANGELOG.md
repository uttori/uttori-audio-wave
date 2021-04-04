# Change Log

All notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning](http://semver.org/).

## [2.1.0](https://github.com/uttori/uttori-audio-wave/compare/v2.0.0...v2.1.0) - 2021-04-04

- 🧰 Add Support for `PEAK`, `PAD`, and `STRC` (ACID Related) chunks (incomplete)
- 🧰 Add identification for `AFAn`, `AFmd`, seems to be the result of a `NSKeyedArchiver`
- 🧰 Add identification for `minf`, `elm1`, `regn`, `ovwf`, `umid`, ProTools Special chunks
- 🛠 Fix issue with infinite loop on some _rare_ broken tags
- 🛠 Fix `FACT` output with actual `numberOfSamples` output
- 🧹 Documentation & Types clean up
- 🎁 Update dev dependencies

## [2.0.0](https://github.com/uttori/uttori-audio-wave/compare/v1.6.1...v2.0.0) - 2021-01-18

- 🧰 Add ESM Support
- 🛠 Add `"sideEffects": false` to the package.json
- 🛠 Tree Shaking, added [Subpath Exports](https://nodejs.org/api/packages.html#packages_subpath_exports)
- 🛠 Fixes for browser compatibility
- 🧹 Documentation & Types clean up
- 🎁 Update dev dependencies
