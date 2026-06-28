# Spec: Sound Marker

> Source: 03-audio — Audio Playback & Bottom Player (archived 2026-06-28)

## Requirements

### Requirement: Progress Ring Sync

The progress ring MUST reflect real `currentTime / duration` from the store. The ring `strokeDashoffset` MUST update on every store `currentTime` change for that specific sound.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Ring advances | sound is `playing`, `duration = 60` | `timeupdate` sets `currentTime = 30` | ring shows 50% fill |
| Ring resets | sound ends | status → `ended` | ring shows 0% or ring disappears |
| No re-render bleed | 5 sounds on map, 1 playing | `timeupdate` fires for sound 101 | ONLY marker 101 re-renders (per-sound selector) |

### Requirement: Marker Visual States

The marker MUST animate between idle, playing, and paused states using Motion.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Idle → playing | marker is idle | user clicks | marker scales up (56px), progress ring appears, icon → pause |
| Playing → paused | marker is playing | user clicks | marker stays 56px, ring holds position, icon → play |
| Paused → playing | marker is paused | user clicks | ring resumes advancing, icon → pause |
