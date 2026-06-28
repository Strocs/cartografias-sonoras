# Archive Report: 03-audio — Audio Playback & Bottom Player

**Archived**: 2026-06-28
**Archive location**: `openspec/changes/archive/2026-06-28-03-audio/`
**Mode**: hybrid (filesystem + Engram)

## SDD Cycle Verdict

**PASS WITH WARNINGS** — Successfully archived.

### Task Completion Gate

All 25 implementation tasks across 4 phases are marked `[x]` in the persisted `tasks.md`. No stale unchecked tasks. Gate: ✅ PASS.

### CRITICAL Issue Resolution

The sole CRITICAL finding from verify — "SoundPieceTrigger not composed (task 4.1)" — was resolved by team decision:
- `SoundPieceTrigger.tsx` and its 2 test cases were deleted as dead code
- Piece playback activation is handled by `AudioBottomPlayer.handlePlayPause`, which dispatches `playPiece()` when idle with a `soundPiece` prop
- Build and all 130/130 tests pass cleanly post-removal
- No other code changes were needed

### Intentional Deviations (Team-Approved)

The following WARNING-level spec deviations are editorial decisions recorded in the archive per team approval:

| Deviation | Spec Says | Implementation | Rationale |
|-----------|-----------|----------------|-----------|
| Bottom player visibility | Conditional on audio active | Always visible | Simplified UX — player shows piece info in idle state |
| Mode labels | "Modo Exploración" / "Modo Obra" | `data-mode` attribute ("idle"/"piece") | Attribute-based approach avoids i18n coupling |
| SoundMarker in piece mode | Become non-interactive | Pause piece, play clicked sound | Preferred UX — allows sound exploration during piece |
| Border color | Bronze `#C2A576/30` | Charcoal `#1a2a3a` | Visual design choice |
| Playback controls | Per active audio (piece or sound) | Piece-only | Bottom player controls piece; markers control sounds individually |
| Ring on end | 0% or disappears | Stays at 100% | Deliberate visual: completed state |
| Marker base size | 40px idle → 56px | Constant 54px with scale-140 transform | Visual design choice |
| `_pendingPieceSeek` | Not in original design | Added as design extension | Consistent pattern with `_pendingSeeks` for piece seeks |

### Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| audio-engine | Created (full spec) | 6 requirements (Audio Element Pool, Audio Event Sync, Real Audio Control, Seek Sound, Volume and Mute, Piece Priority) — 14 scenarios |
| sound-marker | Created (full spec) | 2 requirements (Progress Ring Sync, Marker Visual States) — 6 scenarios |
| bottom-player | Created (full spec) | 7 requirements (Persistent Bottom Bar, Playback Controls, Scrubber, Time Indicators, Wave Visualizer, Volume Control, Mode Differentiation) — 11 scenarios |
| sound-piece | Created (full spec) | 2 requirements (Piece Playback Trigger, Mode Communication) — 4 scenarios |

**Total**: 4 main specs created, 17 requirements, 35 scenarios synced from 03-audio.

### Archive Contents

| Artifact | Status | Notes |
|----------|--------|-------|
| proposal.md | ✅ | Present — 76 lines |
| spec.md | ✅ | Present — 183 lines, 4 domains |
| specs/ | ✅ | Empty directory (spec was single-file, not delta-per-domain) |
| design.md | ✅ | Present — 137 lines |
| tasks.md | ✅ | Present — 25/25 tasks complete |
| verify-report.md | ✅ | Present — 191 lines, PASS WITH WARNINGS |
| archive-report.md | ✅ | This file |

### Engram Observations (Traceability)

| Artifact | Observation ID | Type |
|----------|---------------|------|
| sdd/03-audio/explore | #289 | architecture |
| sdd/03-audio/proposal | #290 | architecture |
| sdd/03-audio/spec | #291 | architecture |
| sdd/03-audio/design | #292 | architecture |
| sdd/03-audio/tasks | #293 | architecture |
| sdd/03-audio/verify-report | #296 | decision (CRITICAL resolution) |
| sdd/03-audio/archive-report | #this | architecture (current) |

### Source of Truth Updated

The following main specs now reflect the 03-audio behavior:
- `openspec/specs/audio-engine/spec.md`
- `openspec/specs/sound-marker/spec.md`
- `openspec/specs/bottom-player/spec.md`
- `openspec/specs/sound-piece/spec.md`

### Risks Addressed

1. ✅ SoundPiece activation gap — resolved by consolidating piece playback in AudioBottomPlayer
2. ✅ Bottom player unconditional render — intentional deviation, recorded as WARNING
3. ✅ Marker interaction in piece mode — intentional UX choice, not blocker

### SDD Cycle Complete

The 03-audio change has been fully planned, explored, proposed, spec'd, designed, implemented (3 stacked PRs), verified, and archived. Ready for the next change.
