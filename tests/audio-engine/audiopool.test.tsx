import { act, fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AudioPool,
  useAudioStore,
} from '../../src/shared/lib/audio-engine';
import { createInitialState } from '../../src/shared/lib/audio-engine/engine';
import { AUDIO_STATUS } from '../../src/shared/lib/audio-engine/types';

const SOUNDS = [
  { id: 1, audioUrl: '/sounds/one.mp3' },
  { id: 2, audioUrl: '/sounds/two.mp3' },
];

const PIECE = { id: 100, audioUrl: '/sound-pieces/piece.mp3' };

describe('AudioPool subscription', () => {
  beforeEach(() => {
    useAudioStore.setState(createInitialState());
    vi.restoreAllMocks();
  });

  it('renders no audio elements when nothing is active', () => {
    const { container } = render(<AudioPool sounds={SOUNDS} />);
    expect(container.querySelectorAll('audio')).toHaveLength(0);
  });

  it('renders an audio element and plays when a sound starts', () => {
    const { container } = render(<AudioPool sounds={SOUNDS} />);
    const playSpy = vi.spyOn(HTMLAudioElement.prototype, 'play');

    act(() => {
      useAudioStore.getState().playSound(1, 10);
    });

    const audios = container.querySelectorAll('audio');
    expect(audios).toHaveLength(1);
    expect(audios[0]).toHaveAttribute('src', '/sounds/one.mp3');
    expect(playSpy).toHaveBeenCalled();
  });

  it('pauses and resumes a sound via the subscription', () => {
    const { container } = render(<AudioPool sounds={SOUNDS} />);
    const playSpy = vi.spyOn(HTMLAudioElement.prototype, 'play');
    const pauseSpy = vi.spyOn(HTMLAudioElement.prototype, 'pause');

    act(() => {
      useAudioStore.getState().playSound(1, 10);
    });

    const audio = container.querySelector('audio');
    act(() => {
      fireEvent.loadedMetadata(audio!);
    });

    act(() => {
      useAudioStore.getState().pauseSound(1);
    });
    expect(pauseSpy).toHaveBeenCalledTimes(1);

    act(() => {
      useAudioStore.getState().resumeSound(1);
    });
    expect(playSpy).toHaveBeenCalledTimes(3);

    expect(container.querySelectorAll('audio')).toHaveLength(1);
  });

  it('removes the audio element when a sound ends', () => {
    const { container } = render(<AudioPool sounds={SOUNDS} />);

    act(() => {
      useAudioStore.getState().playSound(1, 10);
    });

    const audio = container.querySelector('audio');
    expect(audio).not.toBeNull();

    act(() => {
      fireEvent.loadedMetadata(audio!);
    });

    act(() => {
      fireEvent.ended(audio!);
    });

    expect(useAudioStore.getState().activeSounds.get(1)?.status).toBe(
      AUDIO_STATUS.ENDED
    );
    expect(container.querySelectorAll('audio')).toHaveLength(0);
  });

  it('routes loadedmetadata to the store with duration', () => {
    render(<AudioPool sounds={SOUNDS} />);

    act(() => {
      useAudioStore.getState().playSound(1, 10);
    });

    const audio = document.querySelector('audio');
    expect(audio).not.toBeNull();

    Object.defineProperty(audio!, 'duration', { value: 60, configurable: true });

    act(() => {
      fireEvent.loadedMetadata(audio!);
    });

    const sound = useAudioStore.getState().activeSounds.get(1);
    expect(sound?.status).toBe(AUDIO_STATUS.PLAYING);
    expect(sound?.duration).toBe(60);
  });

  it('routes timeupdate to the store currentTime', () => {
    render(<AudioPool sounds={SOUNDS} />);

    act(() => {
      useAudioStore.getState().playSound(1, 10);
    });

    const audio = document.querySelector('audio');
    expect(audio).not.toBeNull();

    Object.defineProperty(audio!, 'currentTime', {
      value: 12.5,
      configurable: true,
    });

    act(() => {
      fireEvent.timeUpdate(audio!);
    });

    expect(useAudioStore.getState().activeSounds.get(1)?.currentTime).toBe(12.5);
  });

  it('applies volume and mute to active audio elements', () => {
    render(<AudioPool sounds={SOUNDS} />);

    act(() => {
      useAudioStore.getState().playSound(1, 10);
    });

    const audio = document.querySelector('audio') as HTMLAudioElement;
    expect(audio.volume).toBe(1);
    expect(audio.muted).toBe(false);

    act(() => {
      useAudioStore.getState().setVolume(0.5);
    });
    expect(audio.volume).toBe(0.5);

    act(() => {
      useAudioStore.getState().toggleMute();
    });
    expect(audio.muted).toBe(true);
  });

  it('lets new sounds inherit the current volume and mute state', () => {
    render(<AudioPool sounds={SOUNDS} />);

    act(() => {
      useAudioStore.getState().setVolume(0.25);
      useAudioStore.getState().toggleMute();
    });

    act(() => {
      useAudioStore.getState().playSound(1, 10);
    });

    const audio = document.querySelector('audio') as HTMLAudioElement;
    expect(audio.volume).toBe(0.25);
    expect(audio.muted).toBe(true);
  });

  it('applies pending seek to the audio element and updates the store', () => {
    render(<AudioPool sounds={SOUNDS} />);

    act(() => {
      useAudioStore.getState().playSound(1, 10);
    });

    const audio = document.querySelector('audio') as HTMLAudioElement;

    act(() => {
      useAudioStore.getState().seekSound(1, 42);
    });

    expect(audio.currentTime).toBe(42);
    expect(useAudioStore.getState().activeSounds.get(1)?.currentTime).toBe(42);
    expect(useAudioStore.getState()._pendingSeeks.has(1)).toBe(false);
  });

  it('renders a piece audio element when a piece is active', () => {
    const { container } = render(
      <AudioPool sounds={SOUNDS} soundPiece={PIECE} />
    );

    act(() => {
      useAudioStore.getState().playPiece(100, 10);
    });

    const audios = container.querySelectorAll('audio');
    expect(audios).toHaveLength(1);
    expect(audios[0]).toHaveAttribute('src', '/sound-pieces/piece.mp3');
  });

  it('routes piece events to the store', () => {
    render(<AudioPool sounds={SOUNDS} soundPiece={PIECE} />);

    act(() => {
      useAudioStore.getState().playPiece(100, 10);
    });

    const audio = document.querySelector('audio');
    expect(audio).not.toBeNull();

    Object.defineProperty(audio!, 'duration', { value: 180, configurable: true });

    act(() => {
      fireEvent.loadedMetadata(audio!);
    });

    const { piece } = useAudioStore.getState();
    expect(piece.status).toBe(AUDIO_STATUS.PLAYING);
    expect(piece.duration).toBe(180);
  });
});
