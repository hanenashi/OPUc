# Changelog
All notable changes to **OPUc** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [0.2.5] - 2025-08-19
### Fixed
- Uploader (`/`) was misidentified as FAQ due to a loose text-based detector. FAQ is now matched **only** when `?page=faq` is present.


---


## [0.2.4] - 2025-08-19
### Fixed
- Root (`/`) misidentified as gallery due to a header `<div class="userpanel">`. Gallery detection now uses only true grid markers (`.box-wrap`, `.inbox-wrap`, `.inbox`), not the header class.


---

## [0.2.3] - 2025-08-19
### Fixed
- Route detection: `?page=userpanel` was mis-identified as "uploader". Now prioritizes explicit `page` param and DOM markers.
- Swipebox neutralization made robust: capture-phase click interceptor, jQuery plugin no-op, delegated handler `off`, class/rel stripping, and overlay removal.

### Notes
- Bare mode still hides the legacy upload spinner; we'll wire a minimal progress later.


---

## [0.2.2] - 2025-08-19
### Added
- Version echo in console on boot.
- Expose `OPUc.version` globally so modules can read the running version.

### Changed
- `modules/utils.js` logs now include version tag in every message.

---

## [0.2.1] - 2025-08-19
### Added
- `@updateURL` and `@downloadURL` headers to **OPUc.user.js** for Tampermonkey auto-update.
- CHANGELOG.md file.

---

## [0.2.0] - 2025-08-19
### Added
- Core **OPUc.user.js** loader with dynamic fetch from GitHub repo.
- `modules/utils.js` with logging backbone, route detection, settings store.
- Bare-mode CSS toggle (Ctrl+Alt+B) with aggressive reset in `css/base.css`.
- Route badge (`data-opuc-route`) overlay.
- `modules/router.js` with route detection + module loader.
- `modules/gallery.js` replacing Swipebox with direct links.
- `css/gallery.css` to suppress Swipebox overlays.

### Fixed
- Upload page spinner (`progress2.gif`) hidden in bare-mode.

---

## [0.1.0] - 2025-08-18
### Added
- Initial skeleton: folder structure, base userscript, placeholder modules and CSS.
- Repo created at [hanenashi/OPUc](https://github.com/hanenashi/OPUc).
