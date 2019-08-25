# Changelog
All notable changes to this project will be documented in this file.

## [1.0.1] - 2019-08-21

### Changed

- Added door handle state support, contributed by [@matthub](https://github.com/matthub)

## [1.0.0] - 2018-12-13

### Changed

- Fix missing break statement (See [#8](https://github.com/nikkow/node-red-contrib-tahoma/pull/8), thanks to [@taucher4000](https://github.com/taucher4000))
- Fix login strategy, preventing "Too Many Requests" error returned by Somfy (See [#9](https://github.com/nikkow/node-red-contrib-tahoma/issues/9))

## [0.2.0] - 2018-10-21

### Added

- New node `tahoma-read` (See [#6](https://github.com/nikkow/node-red-contrib-tahoma/issues/6))
- New `stop` action to immediatly stop the current action on the devices (See [#5](https://github.com/nikkow/node-red-contrib-tahoma/pull/5), thanks to [@Genosse274](https://github.com/Genosse274))
- New CHANGELOG.md file to keep track of all updates.

### Changed

- Fix path in getSetup() (See [#7](https://github.com/nikkow/node-red-contrib-tahoma/pull/7), thanks to [@hobbyquaker](https://github.com/hobbyquaker))
