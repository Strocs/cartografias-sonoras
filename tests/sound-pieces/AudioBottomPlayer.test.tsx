import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';

import { AudioBottomPlayer } from '../../src/features/sound-pieces/ui/AudioBottomPlayer';
import { SoundPieceTrigger } from '../../src/features/sound-pieces/ui/SoundPieceTrigger';
import { createInitialState } from '../../src/shared/lib/audio-engine/engine';
import {
  audioTransitions,
  useAudioStore,
} from '../../src/shared/lib/audio-engine/store';
import { AUDIO_STATUS } from '../../src/shared/lib/audio-engine/types';

const SOUND_PIECE = {
  id: 1,
  mapId: 1,
  title: 'Paisaje de la plaza',
  author: 'Colectivo Marcasonora',
  description: 'Composición sonora de la plaza.',
  audioUrl: '/sound-pieces/piece.mp3',
};

const MAP_IMAGE = { src: '/maps/locacion-1.png', width: 100, height: 100 };

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="always">{children}</MotionConfig>
  );
}

describe('AudioBottomPlayer', () => {
  beforeEach(() => {
    useAudioStore.setState(createInitialState());
    vi.restoreAllMocks();
  });

  it('is hidden when no audio is active', () => {
    render(
      <Wrapper>
        <AudioBottomPlayer mapImage={MAP_IMAGE} soundPiece={SOUND_PIECE} />
      </Wrapper>
    );

    expect(screen.queryByTestId('audio-bottom-player')).not.toBeInTheDocument();
  });

  it('appears in exploration mode when a sound is playing', async () => {
    render(
      <Wrapper>
        <AudioBottomPlayer mapImage={MAP_IMAGE} soundPiece={SOUND_PIECE} />
      </Wrapper>
    );

    act(() => {
      useAudioStore.getState().playSound(101, 1);
      audioTransitions.soundLoaded(101, 60);
    });

    const player = await screen.findByTestId('audio-bottom-player');
    expect(player).toHaveAttribute('data-mode', 'exploration');
    expect(screen.getByText('Modo Exploración')).toBeInTheDocument();
  });

  it('toggles play/pause for the active sound', async () => {
    render(
      <Wrapper>
        <AudioBottomPlayer mapImage={MAP_IMAGE} soundPiece={SOUND_PIECE} />
      </Wrapper>
    );

    act(() => {
      useAudioStore.getState().playSound(101, 1);
      audioTransitions.soundLoaded(101, 60);
    });

    const button = await screen.findByTestId('bottom-play-pause');
    expect(useAudioStore.getState().activeSounds.get(101)?.status).toBe(
      AUDIO_STATUS.PLAYING
    );

    act(() => {
      fireEvent.click(button);
    });

    expect(useAudioStore.getState().activeSounds.get(101)?.status).toBe(
      AUDIO_STATUS.PAUSED
    );

    act(() => {
      fireEvent.click(button);
    });

    expect(useAudioStore.getState().activeSounds.get(101)?.status).toBe(
      AUDIO_STATUS.PLAYING
    );
  });

  it('shows elapsed and total time in mm:ss format', async () => {
    render(
      <Wrapper>
        <AudioBottomPlayer mapImage={MAP_IMAGE} soundPiece={SOUND_PIECE} />
      </Wrapper>
    );

    act(() => {
      useAudioStore.getState().playSound(101, 1);
      audioTransitions.soundLoaded(101, 125);
      audioTransitions.soundTimeUpdated(101, 65);
    });

    const time = await screen.findByTestId('bottom-time');
    expect(time).toHaveTextContent('1:05 / 2:05');
  });

  it('updates volume from the slider', async () => {
    render(
      <Wrapper>
        <AudioBottomPlayer mapImage={MAP_IMAGE} soundPiece={SOUND_PIECE} />
      </Wrapper>
    );

    act(() => {
      useAudioStore.getState().playSound(101, 1);
      audioTransitions.soundLoaded(101, 60);
    });

    const slider = await screen.findByTestId('bottom-volume');
    act(() => {
      fireEvent.change(slider, { target: { value: '35' } });
    });

    expect(useAudioStore.getState().volume).toBe(0.35);
  });

  it('toggles mute when the mute button is clicked', async () => {
    render(
      <Wrapper>
        <AudioBottomPlayer mapImage={MAP_IMAGE} soundPiece={SOUND_PIECE} />
      </Wrapper>
    );

    act(() => {
      useAudioStore.getState().playSound(101, 1);
      audioTransitions.soundLoaded(101, 60);
    });

    const muteButton = await screen.findByTestId('bottom-mute');
    act(() => {
      fireEvent.click(muteButton);
    });

    expect(useAudioStore.getState().muted).toBe(true);

    act(() => {
      fireEvent.click(muteButton);
    });

    expect(useAudioStore.getState().muted).toBe(false);
  });

  it('appears in piece mode when a sound piece is playing', async () => {
    render(
      <Wrapper>
        <AudioBottomPlayer mapImage={MAP_IMAGE} soundPiece={SOUND_PIECE} />
      </Wrapper>
    );

    act(() => {
      useAudioStore.getState().playPiece(SOUND_PIECE.id, SOUND_PIECE.mapId);
      audioTransitions.pieceLoaded(180);
    });

    const player = await screen.findByTestId('audio-bottom-player');
    expect(player).toHaveAttribute('data-mode', 'piece');
    expect(screen.getByText(SOUND_PIECE.title)).toBeInTheDocument();
    expect(screen.getByText(SOUND_PIECE.author)).toBeInTheDocument();
  });

  it('seeks the piece when the scrubber is changed in piece mode', async () => {
    render(
      <Wrapper>
        <AudioBottomPlayer mapImage={MAP_IMAGE} soundPiece={SOUND_PIECE} />
      </Wrapper>
    );

    act(() => {
      useAudioStore.getState().playPiece(SOUND_PIECE.id, SOUND_PIECE.mapId);
      audioTransitions.pieceLoaded(180);
    });

    const scrubber = await screen.findByTestId('bottom-scrubber');
    act(() => {
      fireEvent.change(scrubber, { target: { value: '50' } });
    });

    await waitFor(() => {
      expect(useAudioStore.getState().piece.currentTime).toBe(90);
    });
  });
});

describe('SoundPieceTrigger', () => {
  beforeEach(() => {
    useAudioStore.setState(createInitialState());
  });

  it('dispatches playPiece when clicked', async () => {
    render(
      <Wrapper>
        <SoundPieceTrigger soundPiece={SOUND_PIECE} mapId={SOUND_PIECE.mapId} />
      </Wrapper>
    );

    const trigger = screen.getByTestId('sound-piece-trigger');
    act(() => {
      fireEvent.click(trigger);
    });

    expect(useAudioStore.getState().activePieceId).toBe(SOUND_PIECE.id);
    expect(useAudioStore.getState().piece.status).toBe(AUDIO_STATUS.LOADING);
  });

  it('stops the piece when clicked while active', async () => {
    render(
      <Wrapper>
        <SoundPieceTrigger soundPiece={SOUND_PIECE} mapId={SOUND_PIECE.mapId} />
      </Wrapper>
    );

    const trigger = screen.getByTestId('sound-piece-trigger');
    act(() => {
      fireEvent.click(trigger);
    });

    await waitFor(() => {
      expect(trigger).toHaveAttribute('data-active', 'true');
    });

    act(() => {
      fireEvent.click(trigger);
    });

    expect(useAudioStore.getState().activePieceId).toBeNull();
  });
});
