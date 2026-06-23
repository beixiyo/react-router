# Changelog

All notable changes to `@jl-org/react-router` will be documented in this file.

[中文 README](./README.md) | [English README](./README.en.md)

## [0.1.1] - 2026-06-23

### Added

- Added `router.subscribe(listener)` so consumers can observe global location changes directly from the Router instance.
- Added `useLocation(options)` with an explicit `scope` option:
  - `useLocation()` and `useLocation({ scope: 'current' })` read the global current route.
  - `useLocation({ scope: 'cache' })` reads the current keep-alive cache entry location.
- Added English documentation in `README.en.md`.
- Added this changelog.

### Changed

- `useLocation()` now follows the real current route by default, even when called from a keep-alive cached route tree.
- Updated README documentation to clarify the difference between current route location and cache entry location.

## [0.1.0]

### Added

- Initial public release.
- Added browser and hash router creation APIs.
- Added Vue Router-style global guards.
- Added Koa-style route middleware.
- Added global layouts.
- Added built-in LRU keep-alive page cache with cache clearing APIs.
