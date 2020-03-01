# Changelog
All notable changes to this project will be documented in this file.

## [2.0.0] - 2020-03-01

****
🚨 **This release is a major version and contains some breaking changes. Please read the list below.**
****

### Changed

- Implementation of Somfy Open API, replacing unofficial TahomaLink API
- Migration of the network layer from deprecated [request](https://www.npmjs.com/package/request) to [axios](https://www.npmjs.com/package/axios)
- `tahoma-read` node now returns the raw response from the [Somfy Open API](https://developer.somfy.com/somfy-open-api/apis/get/site/%7BsiteId%7D/device}) (a remapping of your flows might be needed)

### Added

- New code quality control using TSLint 

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
