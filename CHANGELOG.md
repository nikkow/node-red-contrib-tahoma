# Changelog

All notable changes to this project will be documented in this file.

## [3.0.0] -

---

🚨 **This release is a major version and contains some breaking changes. Please read the list below.**

---

### Changed

- Connected the module to the new Local API released by Somfy
- Upgraded the dependencies to their latest versions
- Replaced TSLint with ESLint

### Removed

- Removed deprecated properties on the Tahoma node

## [2.0.3] - 2020-08-20

### Added

- Added error message when automatic session refresh is impossible (see [this article](https://github.com/nikkow/node-red-contrib-tahoma#i-received-a-session-expired-error-what-happned) for more information)
- Added support for blinds rotation for motors that support it ([#33](https://github.com/nikkow/node-red-contrib-tahoma/pull/33), thanks to [@marekhalmo](https://github.com/marekhalmo))
- Added a buffer when setting a custom position to consider close-enough values as valid ([#34](https://github.com/nikkow/node-red-contrib-tahoma/issues/34))

### Changed

- Fixed an issue that prevented tokens from being correctly refreshed
- Fixed an unhandled Promise rejection ([#31](https://github.com/nikkow/node-red-contrib-tahoma/issues/31))

### Refactoring

- Refactored the network layer to retrieve credentials from memory, instead of global context.

## [2.0.1] - 2020-03-01

### Changed

- Fix publication to NPM registry issue ([#20](https://github.com/nikkow/node-red-contrib-tahoma/issues/20))

## [2.0.0] - 2020-03-01

---

🚨 **This release is a major version and contains some breaking changes. Please read the list below.**

---

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

- Fix missing break statement ([#8](https://github.com/nikkow/node-red-contrib-tahoma/pull/8), thanks to [@taucher4000](https://github.com/taucher4000))
- Fix login strategy, preventing "Too Many Requests" error returned by Somfy (See [#9](https://github.com/nikkow/node-red-contrib-tahoma/issues/9))

## [0.2.0] - 2018-10-21

### Added

- New node `tahoma-read` ([#6](https://github.com/nikkow/node-red-contrib-tahoma/issues/6))
- New `stop` action to immediatly stop the current action on the devices ([#5](https://github.com/nikkow/node-red-contrib-tahoma/pull/5), thanks to [@Genosse274](https://github.com/Genosse274))
- New CHANGELOG.md file to keep track of all updates.

### Changed

- Fix path in getSetup() ([#7](https://github.com/nikkow/node-red-contrib-tahoma/pull/7), thanks to [@hobbyquaker](https://github.com/hobbyquaker))
