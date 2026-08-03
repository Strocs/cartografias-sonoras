# Delta for Audio Engine

## ADDED Requirements

### Requirement: Vanilla Store Core

The audio store MUST be created using `zustand/vanilla` (`createStore`). The store instance MUST be framework-agnostic. A React `useStore` wrapper hook MUST be exported for React consumers.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Vanilla creation | store module loaded | `createStore` called | store instance created without React dependency |
| React wrapper | React component needs state | `useStore(selector)` called | component re-renders on selected state changes |
| Vanilla subscribe | vanilla map code needs state | `store.subscribe(selector)` called | callback fires on state changes |
| getState | any code reads state | `store.getState()` called | current state returned without React |

## MODIFIED Requirements

### Requirement: Audio Element Pool

The system MUST manage one `HTMLAudioElement` per active sound and piece. An `AudioPool` component MUST render hidden `<audio>` elements keyed by active sound/piece IDs. AudioPool MUST be extracted from the map island and rendered as a separate `client:idle` React island in `MapPage.astro`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Sound element created | store transitions sound to `loading` | AudioPool renders | `<audio src={sound.audioUrl}>` mounted for that soundId |
| Piece element created | store transitions piece to `loading` | AudioPool renders | `<audio src={piece.audioUrl}>` mounted for the active piece |
| Element destroyed | sound ends or errors | `ended`/`error` event fires | AudioPool removes the `<audio>` element from DOM |
| Separate island | AudioPool in MapPage.astro | page renders | AudioPool hydrates as `client:idle`, independent of map |

(Previously: AudioPool was rendered inside `ActiveMapLayout` within the map `client:only` React island.)

## Unchanged Requirements

The following requirements from the baseline spec are UNCHANGED:

- **Audio Event Sync** — native audio events wire to `audioTransitions` store actions.
- **Real Audio Control** — store actions call actual `HTMLAudioElement` methods.
- **Seek Sound** — `seekSound` sets `audio.currentTime`.
- **Volume and Mute** — volume/mute state and actions preserved.
- **Piece Priority** — `playPiece` stops all sounds; sound blocked while piece active.
