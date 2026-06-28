# Spec: 03-audio — Audio Playback & Bottom Player

## audio-engine

### ADDED Requirements

#### Requirement: Audio Element Pool

The system MUST manage one `HTMLAudioElement` per active sound and piece. An `AudioPool` component MUST render hidden `<audio>` elements keyed by active sound/piece IDs inside `ActiveMapLayout`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Sound element created | store transitions sound to `loading` | AudioPool renders | `<audio src={sound.audioUrl}>` is mounted for that soundId |
| Piece element created | store transitions piece to `loading` | AudioPool renders | `<audio src={piece.audioUrl}>` is mounted for the active piece |
| Element destroyed | sound ends or errors | `ended`/`error` event fires | AudioPool removes the `<audio>` element from DOM |

#### Requirement: Audio Event Sync

The system MUST wire native audio events to `audioTransitions` store actions.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Metadata loaded | `<audio>` fires `loadedmetadata` | event handler runs | `audioTransitions.soundLoaded(id)` / `pieceLoaded()` called; store sets `duration` from `audio.duration` and status to `playing` |
| Time update | `<audio>` fires `timeupdate` | event handler runs | store `currentTime` updated to `audio.currentTime` for that sound/piece |
| Sound ends | `<audio>` fires `ended` | event handler runs | `audioTransitions.soundEnded(id)` / `pieceEnded()` called |
| Audio error | `<audio>` fires `error` | event handler runs | `audioTransitions.soundError(id, message)` / `pieceError(message)` called |

#### Requirement: Real Audio Control

Store actions MUST call actual `HTMLAudioElement` methods (`.play()`, `.pause()`, `.load()`). The engine MUST NOT only transition state — it MUST control the audio element.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Play sound | `playSound(id, mapId)` dispatched | AudioPool detects new `loading` sound | corresponding `<audio>.play()` is called |
| Pause sound | `pauseSound(id)` dispatched | store status → `paused` | corresponding `<audio>.pause()` is called |
| Resume sound | `resumeSound(id)` dispatched | store status → `playing` | corresponding `<audio>.play()` is called |
| Stop all on piece | `playPiece(id, mapId)` dispatched | store transitions to piece `loading` | all sound `<audio>` elements are paused and removed |

#### Requirement: Seek Sound

The store MUST expose `audioTransitions.seekSound(soundId, time)` and the corresponding `<audio>.currentTime` MUST be set.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Seek playing sound | sound is `playing` | seek action dispatched | `audio.currentTime = time`; store reflects new `currentTime` |

#### Requirement: Volume and Mute

The store MUST expose `volume: number` (0–1, default 1) and `muted: boolean` (default false) with actions `setVolume(v)` and `toggleMute()`. ALL active audio elements MUST reflect volume/mute changes.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Set volume | volume = 1 | `setVolume(0.5)` called | all active `<audio>.volume = 0.5`; store updates |
| Toggle mute | muted = false | `toggleMute()` called | all active `<audio>.muted = true`; store `muted = true` |
| New sound inherits | volume = 0.5, muted = true | new sound starts | its `<audio>` element has `.volume = 0.5` and `.muted = true` |

#### Requirement: Piece Priority

`playPiece` MUST call `stopAllSounds` first (already in engine.ts). Individual sound play MUST be blocked while `activePieceId !== null` (already in engine.ts).

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Piece stops sounds | 2 sounds playing | `playPiece(id, mapId)` | both sounds paused and removed; piece starts `loading` |
| Sound blocked by piece | piece is `playing` | `playSound(id, mapId)` called | store returns unchanged; no audio element created |

---

## sound-marker

### ADDED Requirements

#### Requirement: Progress Ring Sync

The progress ring MUST reflect real `currentTime / duration` from the store. The ring `strokeDashoffset` MUST update on every store `currentTime` change for that specific sound.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Ring advances | sound is `playing`, `duration = 60` | `timeupdate` sets `currentTime = 30` | ring shows 50% fill |
| Ring resets | sound ends | status → `ended` | ring shows 0% or ring disappears |
| No re-render bleed | 5 sounds on map, 1 playing | `timeupdate` fires for sound 101 | ONLY marker 101 re-renders (per-sound selector) |

#### Requirement: Marker Visual States

The marker MUST animate between idle, playing, and paused states using Motion.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Idle → playing | marker is idle | user clicks | marker scales up (56px), progress ring appears, icon → pause |
| Playing → paused | marker is playing | user clicks | marker stays 56px, ring holds position, icon → play |
| Paused → playing | marker is paused | user clicks | ring resumes advancing, icon → pause |

---

## bottom-player

### ADDED Requirements

#### Requirement: Persistent Bottom Bar

The system MUST render a fixed bottom bar when ANY audio is active (piece or sound). The bar MUST NOT render when all audio is idle. Background: teal `#073942`, border: bronze `#C2A576/30`, rounded-3xl.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Bar appears | no audio active | user plays a sound | bottom bar animates in (Motion) |
| Bar hides | sound is playing | user stops last sound | bottom bar animates out |
| Piece mode | piece is playing | bar renders | shows piece title, author, map thumbnail |

#### Requirement: Playback Controls

The bar MUST provide play/pause toggle for the active audio (piece or sound).

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Pause piece | piece is `playing` | user clicks pause | `pausePiece()` dispatched; icon → play |
| Resume piece | piece is `paused` | user clicks play | `resumePiece()` dispatched; icon → pause |

#### Requirement: Scrubber

The bar MUST display a scrubber showing `currentTime / duration`. For pieces, the scrubber MUST be interactive (seek). For individual sounds, the scrubber is display-only this phase.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Scrubber advances | piece playing, duration=180 | currentTime=90 | scrubber thumb at 50% |
| Piece seek | piece playing | user drags scrubber to 60% | `seekPiece(108)` dispatched; `audio.currentTime = 108` |

#### Requirement: Time Indicators

The bar MUST display elapsed time and total duration in `M:SS` format.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Time display | piece playing, currentTime=65, duration=180 | bar renders | shows "1:05 / 3:00" |

#### Requirement: Wave Visualizer Placeholder

The bar MUST render a CSS keyframes wave animation placeholder while audio is `playing`. No Web Audio API integration this phase.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Wave animates | piece is `playing` | bar renders | CSS animated bars visible |
| Wave stops | piece is `paused` | bar renders | wave animation paused |

#### Requirement: Volume Control

The bar MUST provide a volume slider and mute toggle.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Volume change | volume = 1 | user drags slider to 0.3 | `setVolume(0.3)` dispatched; all audio elements update |
| Mute toggle | muted = false | user clicks mute icon | `toggleMute()` dispatched; icon → muted; audio muted |

#### Requirement: Mode Differentiation

The bar MUST visually distinguish "Modo Exploración" (individual sounds) from "Modo Obra" (SoundPiece). Display the active mode label.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Exploration mode | individual sound playing | bar renders | label shows "Modo Exploración" |
| Piece mode | SoundPiece playing | bar renders | label shows "Modo Obra" |

---

## sound-piece

### ADDED Requirements

#### Requirement: Piece Playback Trigger

The system MUST provide a UI trigger to start SoundPiece playback. The trigger MUST be accessible from the active map layout.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Start piece | no piece playing, map has SoundPiece | user clicks piece trigger | `playPiece(pieceId, mapId)` dispatched; piece status → `loading` then `playing` |
| Piece stops sounds | 2 individual sounds playing | user clicks piece trigger | all sounds stopped; piece starts |

#### Requirement: Mode Communication

When a piece starts, the UI MUST reflect the mode change from exploration to piece mode. When the piece ends or is stopped, the UI MUST return to exploration mode.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Enter piece mode | piece starts playing | store updates | bottom player shows "Modo Obra"; SoundMarkers become non-interactive |
| Exit piece mode | piece ends | `ended` event fires | bottom player returns to "Modo Exploración" or hides; SoundMarkers become interactive again |
