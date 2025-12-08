# Changelog
All notable changes to **OPUc** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).


## [0.3.8] - 2025-12-09
### Added
- Gallery: range/multi-select with visible `.selected` tiles.
- Gallery: optional `.gif/.webp` placeholder for large sets.
- Gallery: auto-load further pages until a target count (configurable delay).
- Settings: new Gallery section (target items, per-page delay, placeholder toggle).

### Notes
- Features adapted from prior OPUx enhancements. 

---

## [0.3.7] - 2025-12-09
### Fixed
- Uploader now force-refreshes module assets (minute-based salt) to avoid stale caches.
- Self-heals tiles: ensures the Crop/Resize/Remove bar exists for every card.

### Added
- Hover/touch mini-FAB on each thumbnail for quick actions.


## [0.3.7] - 2025-12-09
### Fixed
- Uploader now force-refreshes module assets (minute-based salt) to avoid stale caches.
- Self-heals tiles: ensures the Crop/Resize/Remove bar exists for every card.

### Added
- Hover/touch mini-FAB on each thumbnail for quick actions.


---


## [0.3.6] - 2025-12-09
### Added
- Per-image tools on uploader tiles: **Crop** (Cropper.js modal), **Resize** (percent or WxH / W× / ×H), **Remove**.
- Keeps tile style; edits update filename, size and dimensions; order preserved.

### Notes
- Cropper.js is loaded on-demand from cdnjs (1.5.13).



---


## [0.3.5] - 2025-08-23
### Added
- Settings: **Bare mode** checkbox (mobile-friendly way to toggle).
- Stronger, card-style themes (dark/light) aligned with uploader tiles.

### Fixed
- Button text contrast in both themes (uses `--opuc-btn-fg`).

### Changed
- Uploader + Settings styles now read from shared theme tokens for consistency.


---

## [0.3.4] - 2025-08-20
### Fixed
- `[hidden]` now stays hidden under bare mode (compat note no longer leaks).
- “Re-upload oprásku odněkud z internetůch” form (`#xhttp`) is hidden reliably.

### Changed
- Explicit compatibility-note toggle in uploader based on `DataTransfer` availability.

---

## [0.3.3] - 2025-08-19
### Fixed
- Stopped hiding a generic ancestor around native fields (which sometimes hid the OPUc UI under site CSS).
- Compatibility banner no longer tells you to use the old form; it now reflects the new fallback.
- Native “Re-upload…” block now hides reliably.

### Added
- Fallback submission path when `DataTransfer` is unavailable: builds `FormData` from the existing form, appends queue files, `POST`s to the same endpoint, and renders the server response.

### Changed
- Native file/URL fieldsets are hidden unconditionally (the original form stays in DOM for submission).

---

## [0.3.2] - 2025-08-19
### Added
- Paste button that uses `navigator.clipboard.readText()` (mobile-friendly) to import image URLs.
- Clipboard text parsing: detects image URLs and fetches them into the queue.
- Auto-submit: **Poslat a odeslat** now populates the hidden native input and submits the form.

### Changed
- Native uploader inputs are hidden when `DataTransfer` is supported (form remains in DOM for submission).
- If `DataTransfer` isn’t available, the native form stays visible with a compatibility note.

---

## [0.3.1] - 2025-08-19
### Fixed
- Safe `DataTransfer` construction (no crash on browsers where it’s not constructible).

### Added
- Drag-to-reorder thumbnails (HTML5 DnD).
- Global resize-on-push: max dimension + JPEG quality; processed via canvas when pushing to form.
- Progress bar during processing.
- Fallback behavior when `DataTransfer` is unavailable (queue works; push/auto-sync disabled with tip).

---

## [0.3.0] - 2025-08-19
### Added
- **Uploader OPUh Phase-1**:
  - Drag-and-drop and clipboard paste of images.
  - Thumbnail queue with size + dimensions.
  - Reorder, remove, clear queue.
  - **Push to form** (DataTransfer) so the native submit keeps working.
  - Auto-sync toggle.

---

## [0.2.7] - 2025-08-19
### Added
- Two-column settings layout: left = native OPU, right = OPUc panel.
- Theme selector in OPUc panel: **Simple Dark** / **Simple White**.
- Global theme classes applied across pages.
- Responsive behavior.

---

## [0.2.6] - 2025-08-19
### Added
- New route: `?page=prihlaseni` (login) + helpers (remember email, permanent login).

---

## [0.2.5] - 2025-08-19
### Fixed
- Strict FAQ detection.

---

## [0.2.4] - 2025-08-19
### Fixed
- Root misidentified as gallery due to header `.userpanel` clash.

---

## [0.2.3] - 2025-08-19
### Fixed
- Route detection for `?page=userpanel`.
- Swipebox neutralization on gallery.

---

## [0.2.2] - 2025-08-19
### Added
- Version echo in console; expose `OPUc.version` globally.

---

## [0.2.1] - 2025-08-19
### Added
- `@updateURL` and `@downloadURL` for Tampermonkey auto-update.
- CHANGELOG.md file.

---

## [0.2.0] - 2025-08-19
### Added
- Core loader, utils, bare-mode CSS, router, gallery tweaks, and spinner hide.

---

## [0.1.0] - 2025-08-18
### Added
- Initial skeleton and repo setup.
