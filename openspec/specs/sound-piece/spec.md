# Spec: Sound Piece

> Source: 03-audio — Audio Playback & Bottom Player (archived 2026-06-28)

## Requirements

### Requirement: Piece Playback Trigger

The system MUST provide a UI trigger to start SoundPiece playback. The trigger MUST be accessible from the active map layout.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Start piece | no piece playing, map has SoundPiece | user clicks piece trigger | `playPiece(pieceId, mapId)` dispatched; piece status → `loading` then `playing` |
| Piece stops sounds | 2 individual sounds playing | user clicks piece trigger | all sounds stopped; piece starts |

### Requirement: Mode Communication

When a piece starts, the UI MUST reflect the mode change from exploration to piece mode. When the piece ends or is stopped, the UI MUST return to exploration mode.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Enter piece mode | piece starts playing | store updates | bottom player shows "Modo Obra"; SoundMarkers become non-interactive |
| Exit piece mode | piece ends | `ended` event fires | bottom player returns to "Modo Exploración" or hides; SoundMarkers become interactive again |
