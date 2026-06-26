# Proposal: 03-audio — Audio Playback & Bottom Player

## Intent

Connect the existing pure audio-engine state machine to real playback via native HTMLAudioElement so that SoundMarkers and the new bottom player actually produce sound, report progress, and respect map-scoped concurrency rules.

## Scope

### In Scope
- Native `<audio>` element pool wired to the Zustand audio engine.
- `SoundMarker` progress-ring sync and play/pause/resume from real audio events.
- Persistent bottom audio player bar for the active map's SoundPiece.
- SoundPiece playback UI and mode distinction ("Modo Exploración" vs "Modo Obra").
- Global volume + mute control in the bottom player.
- Placeholder audio files under `public/sounds/` and `public/sound-pieces/`.

### Out of Scope
- Advanced audio-reactive wave visualizer (Phase 5); only a CSS keyframes placeholder now.
- Per-sound volume, repeat/shuffle, playlists, or spatial audio.
- Real final audio assets (Phase 6).
- Seeking inside SoundPieces (scrubber is for display only this phase).

## Capabilities

### New Capabilities
- `audio-playback`: native HTMLAudioElement pool, event wiring to the Zustand store, currentTime/duration sync, error handling.
- `bottom-player`: fixed persistent bar with play/pause, scrubber, time, volume/mute, wave placeholder, and map thumbnail.
- `sound-piece-playback`: SoundPiece trigger, stops all individual sounds, communicates mode change.
- `sound-marker-playback`: SoundMarker click → play/pause/resume, progress ring driven by real currentTime/duration.

### Modified Capabilities
- None (no existing specs in `openspec/specs/`).

## Approach

Use Approach 1 from exploration: an `AudioPool` component inside `ActiveMapLayout` renders hidden `<audio>` elements keyed by active sound/piece IDs. Audio events (`loadedmetadata`, `timeupdate`, `ended`, `error`) are mapped to the existing `audioTransitions` helpers. `useMountEffect` is used only for one-time setup; all play/pause/seek logic flows through event handlers and store actions. The bottom player reads the active piece state and renders controls with Motion transitions. Placeholder MP3s are added so tests and manual QA work before final assets arrive.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/shared/lib/audio-engine/store.ts` | Modified | Expose volume/mute state and seek action; sync from audio events. |
| `src/features/sounds/ui/SoundMarker.tsx` | Modified | Animate progress ring from real currentTime/duration. |
| `src/features/sound-pieces/ui/AudioBottomPlayer.tsx` | New | Persistent bottom player bar. |
| `src/features/sound-pieces/ui/SoundPiecePlayer.tsx` | New | SoundPiece trigger + mode indicator. |
| `src/features/maps/ui/ActiveMapLayout.tsx` | Modified | Compose AudioPool and bottom player. |
| `src/pages/[slug].astro` | Modified | Pass active SoundPiece into layout. |
| `public/sounds/`, `public/sound-pieces/` | New | Placeholder audio files. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missing final audio assets causes 404s | High | Add short silent/loop placeholder MP3s for dev/tests. |
| Progress ring re-renders all markers | Low | Select only the per-sound state in each marker. |
| `useEffect` temptation in audio lifecycle | Med | Review against `no-use-effect` skill; use `useMountEffect` only. |
| User confusion between piece and sound modes | Med | Clear labels: "Modo Exploración" / "Modo Obra". |

## Rollback Plan

1. Remove `AudioPool` and bottom player from `ActiveMapLayout`.  
2. Restore audio engine to pure state-only transitions (revert store changes).  
3. Delete new UI components and placeholder audio files.  
4. Confirm existing 82 tests still pass.

## Dependencies

- Placeholder MP3 assets for development and tests.

## Success Criteria

- [ ] Clicking a SoundMarker starts real audio and animates its progress ring.
- [ ] Bottom player renders for every active map and controls the SoundPiece.
- [ ] Starting a SoundPiece stops all currently playing individual sounds.
- [ ] Volume/mute toggle updates global playback volume.
- [ ] Placeholder audio files exist; `pnpm test` passes and `pnpm build` succeeds.
