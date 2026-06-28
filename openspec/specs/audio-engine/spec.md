# Spec: Audio Engine

> Source: 03-audio — Audio Playback & Bottom Player (archived 2026-06-28)

## Requirements

### Requirement: Audio Element Pool

The system MUST manage one `HTMLAudioElement` per active sound and piece. An `AudioPool` component MUST render hidden `<audio>` elements keyed by active sound/piece IDs inside `ActiveMapLayout`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Sound element created | store transitions sound to `loading` | AudioPool renders | `<audio src={sound.audioUrl}>` is mounted for that soundId |
| Piece element created | store transitions piece to `loading` | AudioPool renders | `<audio src={piece.audioUrl}>` is mounted for the active piece |
| Element destroyed | sound ends or errors | `ended`/`error` event fires | AudioPool removes the `<audio>` element from DOM |

### Requirement: Audio Event Sync

The system MUST wire native audio events to `audioTransitions` store actions.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Metadata loaded | `<audio>` fires `loadedmetadata` | event handler runs | `audioTransitions.soundLoaded(id)` / `pieceLoaded()` called; store sets `duration` from `audio.duration` and status to `playing` |
| Time update | `<audio>` fires `timeupdate` | event handler runs | store `currentTime` updated to `audio.currentTime` for that sound/piece |
| Sound ends | `<audio>` fires `ended` | event handler runs | `audioTransitions.soundEnded(id)` / `pieceEnded()` called |
| Audio error | `<audio>` fires `error` | event handler runs | `audioTransitions.soundError(id, message)` / `pieceError(message)` called |

### Requirement: Real Audio Control

Store actions MUST call actual `HTMLAudioElement` methods (`.play()`, `.pause()`, `.load()`). The engine MUST NOT only transition state — it MUST control the audio element.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Play sound | `playSound(id, mapId)` dispatched | AudioPool detects new `loading` sound | corresponding `<audio>.play()` is called |
| Pause sound | `pauseSound(id)` dispatched | store status → `paused` | corresponding `<audio>.pause()` is called |
| Resume sound | `resumeSound(id)` dispatched | store status → `playing` | corresponding `<audio>.play()` is called |
| Stop all on piece | `playPiece(id, mapId)` dispatched | store transitions to piece `loading` | all sound `<audio>` elements are paused and removed |

### Requirement: Seek Sound

The store MUST expose `audioTransitions.seekSound(soundId, time)` and the corresponding `<audio>.currentTime` MUST be set.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Seek playing sound | sound is `playing` | seek action dispatched | `audio.currentTime = time`; store reflects new `currentTime` |

### Requirement: Volume and Mute

The store MUST expose `volume: number` (0–1, default 1) and `muted: boolean` (default false) with actions `setVolume(v)` and `toggleMute()`. ALL active audio elements MUST reflect volume/mute changes.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Set volume | volume = 1 | `setVolume(0.5)` called | all active `<audio>.volume = 0.5`; store updates |
| Toggle mute | muted = false | `toggleMute()` called | all active `<audio>.muted = true`; store `muted = true` |
| New sound inherits | volume = 0.5, muted = true | new sound starts | its `<audio>` element has `.volume = 0.5` and `.muted = true` |

### Requirement: Piece Priority

`playPiece` MUST call `stopAllSounds` first (already in engine.ts). Individual sound play MUST be blocked while `activePieceId !== null` (already in engine.ts).

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Piece stops sounds | 2 sounds playing | `playPiece(id, mapId)` | both sounds paused and removed; piece starts `loading` |
| Sound blocked by piece | piece is `playing` | `playSound(id, mapId)` called | store returns unchanged; no audio element created |
