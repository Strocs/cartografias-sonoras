# Delta for Bottom Player

## MODIFIED Requirements

### Requirement: Persistent Bottom Bar

The system MUST render a fixed bottom bar when ANY audio is active. The bar MUST NOT render when all audio is idle. Background: teal `#073942`, border: bronze `#C2A576/30`, rounded-3xl. Entry/exit animations MUST use CSS transitions. The bar MUST consume audio state via the `useStore` wrapper hook from the vanilla audio store.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Bar appears | no audio active | user plays a sound | bottom bar slides in via CSS transition |
| Bar hides | sound is playing | user stops last sound | bottom bar slides out via CSS transition |
| Piece mode | piece is playing | bar renders | shows piece title, author, map thumbnail |
| Store consumption | bar needs audio state | `useStore(selector)` called | state read from vanilla store via React wrapper |

(Previously: consumed state directly via `useAudioStore` React hook from `zustand/create`.)

## Unchanged Requirements

All other requirements from the baseline spec are UNCHANGED:

- **Playback Controls** — play/pause toggle for active audio.
- **Scrubber** — currentTime/duration display; interactive seek for pieces.
- **Time Indicators** — elapsed/total in M:SS format.
- **Wave Visualizer Placeholder** — CSS keyframes wave animation.
- **Volume Control** — volume slider and mute toggle.
- **Mode Differentiation** — "Modo Exploración" vs "Modo Obra" label.
