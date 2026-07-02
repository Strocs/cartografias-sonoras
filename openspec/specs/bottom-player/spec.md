# Spec: Bottom Player

> Source: 03-audio — Audio Playback & Bottom Player (archived 2026-06-28)

## Requirements

### Requirement: Persistent Bottom Bar

The system MUST render a fixed bottom bar when ANY audio is active. The bar MUST NOT render when all audio is idle. Background: teal `#073942`, border: bronze `#C2A576/30`, rounded-3xl. Entry/exit animations MUST use CSS transitions.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Bar appears | no audio active | user plays a sound | bottom bar slides in via CSS transition |
| Bar hides | sound is playing | user stops last sound | bottom bar slides out via CSS transition |
| Piece mode | piece is playing | bar renders | shows piece title, author, map thumbnail |

### Requirement: Playback Controls

The bar MUST provide play/pause toggle for the active audio (piece or sound).

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Pause piece | piece is `playing` | user clicks pause | `pausePiece()` dispatched; icon → play |
| Resume piece | piece is `paused` | user clicks play | `resumePiece()` dispatched; icon → pause |

### Requirement: Scrubber

The bar MUST display a scrubber showing `currentTime / duration`. For pieces, the scrubber MUST be interactive (seek). For individual sounds, the scrubber is display-only this phase.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Scrubber advances | piece playing, duration=180 | currentTime=90 | scrubber thumb at 50% |
| Piece seek | piece playing | user drags scrubber to 60% | `seekPiece(108)` dispatched; `audio.currentTime = 108` |

### Requirement: Time Indicators

The bar MUST display elapsed time and total duration in `M:SS` format.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Time display | piece playing, currentTime=65, duration=180 | bar renders | shows "1:05 / 3:00" |

### Requirement: Wave Visualizer Placeholder

The bar MUST render a CSS keyframes wave animation placeholder while audio is `playing`. No Web Audio API integration this phase.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Wave animates | piece is `playing` | bar renders | CSS animated bars visible |
| Wave stops | piece is `paused` | bar renders | wave animation paused |

### Requirement: Volume Control

The bar MUST provide a volume slider and mute toggle.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Volume change | volume = 1 | user drags slider to 0.3 | `setVolume(0.3)` dispatched; all audio elements update |
| Mute toggle | muted = false | user clicks mute icon | `toggleMute()` dispatched; icon → muted; audio muted |

### Requirement: Mode Differentiation

The bar MUST visually distinguish "Modo Exploración" (individual sounds) from "Modo Obra" (SoundPiece). Display the active mode label.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Exploration mode | individual sound playing | bar renders | label shows "Modo Exploración" |
| Piece mode | SoundPiece playing | bar renders | label shows "Modo Obra" |
