# Tasks: 03-audio — Audio Playback & Bottom Player

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

| Estimated changed lines | ~800 | Delivery strategy | auto-chain |
| 400-line budget risk | High | Suggested split | PR 1 → PR 2 → PR 3 |

| Unit | Goal | PR | Notes |
|------|------|----|-------|
| 1 | Audio engine + AudioPool + audio assets | PR 1 | main; tests |
| 2 | SoundMarker sync + visual states | PR 2 | main; needs PR 1 types |
| 3 | BottomPlayer + integration wiring | PR 3 | main; needs PR 1-2 |

## Phase 1 — Audio Engine Foundation

- [x] 1.1 Add `volume`, `muted`, `_pendingSeeks` to `types.ts`
- [x] 1.2 Add `setVolume`, `toggleMute`, `pendingSeek` to `engine.ts`
- [x] 1.3 Wire `setVolume`, `toggleMute`, `seekSound` in `store.ts` + `audioTransitions`
- [x] 1.4 Export new types from `index.ts`
- [x] 1.5 Create `AudioPool.tsx`: renders `<audio>` elements keyed by active IDs
- [x] 1.6 Subscription diffs status → call `.play()`/`.pause()`/`.load()`
- [x] 1.7 Wire native events: loadedmetadata, timeupdate, ended, error → store
- [x] 1.8 Detect `_pendingSeeks` → set `audio.currentTime`, clear pending
- [x] 1.9 Diff volume/muted → apply to all active `<audio>` elements
- [x] 1.10 Create `scripts/generate-placeholder-audio.mjs` + run for 18 MP3s
- [x] 1.11 Tests: engine pure functions (volume, mute, pendingSeek)
- [x] 1.12 Tests: AudioPool subscription with mock audio elements

## Phase 2 — SoundMarker Sync & Visual States

- [x] 2.1 Per-sound selector for currentTime/duration (no re-render bleed)
- [x] 2.2 Progress ring: strokeDashoffset = (currentTime / duration) × circumference
- [x] 2.3 Motion: idle 40px → playing 56px; play ↔ pause icon transitions
- [x] 2.4 Block marker interaction when activePieceId !== null
- [x] 2.5 Tests: marker re-renders only for its own sound timeupdate
- [x] 2.6 Tests: visual state transitions idle → playing → paused → idle

## Phase 3 — Bottom Player

- [ ] 3.1 Create `AudioBottomPlayer.tsx`: fixed teal bar, bronze border
- [ ] 3.2 Motion enter/exit animation for bar show/hide
- [ ] 3.3 Play/pause toggle wired to store status
- [ ] 3.4 Interactive scrubber for pieces, display-only for sounds
- [ ] 3.5 Time indicators: elapsed + duration in M:SS
- [ ] 3.6 CSS keyframes wave visualizer placeholder
- [ ] 3.7 Volume slider + mute toggle → store actions
- [ ] 3.8 Mode label: "Modo Exploración" vs "Modo Obra"
- [ ] 3.9 Create `SoundPieceTrigger.tsx`: dispatches playPiece
- [ ] 3.10 Tests: bottom player controls + SoundPieceTrigger

## Phase 4 — Integration & Wiring

- [ ] 4.1 Compose AudioPool + AudioBottomPlayer + SoundPieceTrigger in ActiveMapLayout.tsx
- [ ] 4.2 Pass soundPiece prop via ActiveMapLayout.astro from page data
- [ ] 4.3 In `[slug].astro`: find active SoundPiece from mock data, pass to layout
- [ ] 4.4 Verify piece stops sounds, blocking during piece, auto-resume after
- [ ] 4.5 Verify mode label flips correctly exploration ↔ piece
