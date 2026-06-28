# Design: 03-audio — Audio Playback & Bottom Player

## Technical Approach

Wire the existing pure-state audio engine to real `HTMLAudioElement` playback via a React `AudioPool` component that renders hidden `<audio>` elements and controls them through a Zustand store subscription. The subscription diffs status changes to call `.play()`/`.pause()`, while native audio events flow back through the existing `audioTransitions` helpers. A new `AudioBottomPlayer` component in `sound-pieces/ui/` provides the persistent playback bar. This is Approach 1 from exploration — the spec explicitly mandates "AudioPool renders hidden `<audio>` elements."

## Architecture Decisions

### Decision: Audio Element Management

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Service class with imperative DOM creation | Full control, but fights React lifecycle | **Rejected** |
| `AudioPool` React component rendering `<audio>` | Idiomatic React, matches spec, auto-cleanup on unmount | **Chosen** |
| Zustand middleware managing elements outside React | Decoupled from render, but leaks DOM into store layer | **Rejected** |

**Rationale**: Spec mandates AudioPool component. React-rendered elements get automatic cleanup, devtools visibility, and stay inside the existing `client:only="react"` island.

### Decision: Store → Audio Control Flow

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Store actions call audio methods directly | Tight coupling, store needs DOM refs | **Rejected** |
| Command queue in state (`_commands[]`) | Explicit, but adds fields to every state snapshot | **Rejected** |
| `useMountEffect` subscription diffing status | One-time setup, no re-renders, clean separation | **Chosen** |

**Rationale**: The subscription pattern keeps the engine pure (no side effects), uses the only allowed `useEffect` wrapper, and avoids re-render storms. The subscription compares `prevStatus` vs `currentStatus` per sound/piece — only calls `.play()`/`.pause()` on actual transitions, ignoring `timeupdate` noise.

### Decision: Seek Without Feedback Loop

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Set `audio.currentTime` from `timeupdate` handler | Creates infinite loop | **Rejected** |
| `_pendingSeeks: Map<id, number>` in state | Subscription applies and clears; no loop | **Chosen** |

**Rationale**: `seekSound` action writes to `_pendingSeeks`. The AudioPool subscription detects entries, sets `audio.currentTime`, and calls `audioTransitions.seekSound` to update store `currentTime` and clear the pending entry. This breaks the feedback cycle.

### Decision: Volume/Mute Propagation

Store holds `volume: number` (default 1) and `muted: boolean` (default false). The same AudioPool subscription diffs these values and applies `.volume`/`.muted` to ALL active `<audio>` elements. New elements inherit current values on mount via initial attribute set.

### Decision: Bottom Player Location & Composition

| Option | Tradeoff | Decision |
|--------|----------|----------|
| New `audio-player` feature | Clean but premature for one component | **Rejected** |
| `sound-pieces/ui/AudioBottomPlayer.tsx` | Pieces are the primary mode; exploration is secondary display | **Chosen** |

The BottomPlayer lives inside the `ActiveMapLayout` React island (already `client:only="react"`). No separate Astro wrapper needed. It reads piece/sound state from the store via granular selectors.

### Decision: Placeholder Audio Assets

Generate minimal valid silent MP3 files (~1 frame of silence, <1KB each) using a Node.js script. Place at every `audioUrl` path in mock data. This lets `<audio>` elements load without 404s and fire `loadedmetadata` → `timeupdate` → `ended` naturally.

## Data Flow

```
User clicks SoundMarker
    │
    ▼
playSound(id, mapId) ──→ store: status=LOADING
                              │
                    AudioPool subscription detects
                    new Map entry with LOADING
                              │
                              ▼
                    <audio> element exists (rendered)
                    audio.play() called
                              │
                    loadedmetadata fires ──→ audioTransitions.soundLoaded(id)
                    timeupdate fires ──────→ audioTransitions (currentTime)
                    ended fires ───────────→ audioTransitions.soundEnded(id)
                              │
                              ▼
                    Store updates ──→ SoundMarker ring advances
                                   ──→ BottomPlayer scrubber advances
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/shared/lib/audio-engine/types.ts` | Modify | Add `volume`, `muted`, `_pendingSeeks` to state; `setVolume`, `toggleMute` to actions |
| `src/shared/lib/audio-engine/engine.ts` | Modify | Add `setVolume`, `toggleMute`, `pendingSeek` pure functions; update `createInitialState` |
| `src/shared/lib/audio-engine/store.ts` | Modify | Wire new actions; expose `setVolume`/`toggleMute` via store and `audioTransitions` |
| `src/shared/lib/audio-engine/index.ts` | Modify | Export new types |
| `src/shared/lib/audio-engine/AudioPool.tsx` | Create | React component: renders `<audio>` elements, subscription for control flow |
| `src/features/sound-pieces/ui/AudioBottomPlayer.tsx` | Create | Persistent bottom bar with scrubber, time, volume, wave placeholder, mode label |
| `src/features/sound-pieces/ui/SoundPieceTrigger.tsx` | Create | Button to start piece playback from ActiveMapLayout |
| `src/features/sounds/ui/SoundMarker.tsx` | Modify | Add Motion transitions for visual states; disable interaction during piece mode |
| `src/features/maps/ui/ActiveMapLayout.tsx` | Modify | Compose AudioPool + AudioBottomPlayer + SoundPieceTrigger; accept `soundPiece` prop |
| `src/features/maps/ui/ActiveMapLayout.astro` | Modify | Pass `soundPiece` prop from page data |
| `src/pages/[slug].astro` | Modify | Import `mockSoundPieces`, find active piece, pass to layout |
| `scripts/generate-placeholder-audio.mjs` | Create | Node script generating silent MP3s at all mock audioUrl paths |
| `public/sounds/locacion-*//*.mp3` | Create | Placeholder silent audio (15 files) |
| `public/sound-pieces/locacion-*//*.mp3` | Create | Placeholder silent audio (3 files) |

## Interfaces / Contracts

```typescript
// types.ts additions
interface AudioEngineState {
  // ... existing fields
  volume: number;        // 0–1, default 1
  muted: boolean;        // default false
  _pendingSeeks: Map<number, number>; // soundId → time (internal)
}

interface AudioActions {
  // ... existing actions
  setVolume: (v: number) => void;
  toggleMute: () => void;
}

// audioTransitions additions
audioTransitions.seekSound(soundId: number, time: number): void;
audioTransitions.clearPendingSeek(soundId: number): void;
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Engine pure functions (`setVolume`, `toggleMute`, `pendingSeek`) | Vitest — same pattern as existing engine tests in `tests/` |
| Unit | AudioPool subscription logic | Mock `<audio>` elements, verify play/pause calls on status transitions |
| Integration | Store ↔ AudioPool round-trip | Render AudioPool, dispatch actions, verify audio method calls |
| E2E | Click marker → progress ring advances | Playwright — verify ring movement with placeholder audio |
| E2E | Bottom player appears/disappears | Playwright — verify visibility transitions |

## Migration / Rollout

No migration required. All changes are additive — existing pure-state engine gains new fields with safe defaults. Placeholder audio script runs once before development.

## Open Questions

- [ ] Should `SoundPieceTrigger` be a floating button on the map, a RightRail entry, or integrated into the BottomPlayer's empty state? (Leaning: RightRail entry — consistent with existing map-switching UI pattern)
- [ ] Should the silent MP3 generator use a build-step hook or be a manual `pnpm gen:audio` script? (Leaning: manual script — runs once, files checked into git)
