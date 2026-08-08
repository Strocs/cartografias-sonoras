import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { AudioBottomPlayer } from '@features/sound-pieces/ui/AudioBottomPlayer'
import { createInitialState } from '@shared/lib/audio-engine/engine'
import { audioStore, audioTransitions } from '@shared/lib/audio-engine/store'
import { AUDIO_STATUS } from '@shared/lib/audio-engine/types'
import { buildSoundAudioAssetUrls } from '@shared/lib/audio-sources'

const SOUND_PIECE = {
  id: 1,
  mapId: 1,
  title: 'Paisaje de la plaza',
  author: 'Colectivo Marcasonora',
  description: 'Composición sonora de la plaza.',
  audioSources: buildSoundAudioAssetUrls(1, 1, 1)!.audioSources
}

describe('AudioBottomPlayer', () => {
  beforeEach(() => {
    audioStore.setState(createInitialState())
    vi.restoreAllMocks()
  })

  it('is always visible in idle state showing piece info', () => {
    render(<AudioBottomPlayer soundPiece={SOUND_PIECE} />)

    const player = screen.getByTestId('audio-bottom-player')
    expect(player).toBeInTheDocument()
    expect(player).toHaveAttribute('data-mode', 'idle')
    expect(screen.getByText(SOUND_PIECE.title)).toBeInTheDocument()
    expect(screen.getByText(SOUND_PIECE.author)).toBeInTheDocument()
    expect(screen.getByTestId('bottom-play-pause')).toBeInTheDocument()
  })

  it('stays in idle mode even when individual sounds are active', () => {
    render(<AudioBottomPlayer soundPiece={SOUND_PIECE} />)

    act(() => {
      audioStore.getState().playSound(101, 1)
      audioTransitions.soundLoaded(101, 60)
    })

    // Individual sounds do NOT affect the piece-only player.
    const player = screen.getByTestId('audio-bottom-player')
    expect(player).toHaveAttribute('data-mode', 'idle')
    expect(screen.getByText(SOUND_PIECE.title)).toBeInTheDocument()
  })

  it('toggles play/pause for the sound piece', () => {
    render(<AudioBottomPlayer soundPiece={SOUND_PIECE} />)

    const button = screen.getByTestId('bottom-play-pause')

    act(() => {
      fireEvent.click(button)
    })

    expect(audioStore.getState().piece.status).toBe(AUDIO_STATUS.LOADING)

    act(() => {
      audioTransitions.pieceLoaded(60)
      audioTransitions.piecePlaying()
    })

    expect(audioStore.getState().piece.status).toBe(AUDIO_STATUS.PLAYING)

    act(() => {
      fireEvent.click(button)
    })

    expect(audioStore.getState().piece.status).toBe(AUDIO_STATUS.PAUSED)

    act(() => {
      fireEvent.click(button)
    })

    expect(audioStore.getState().piece.status).toBe(AUDIO_STATUS.PLAYING)
  })

  it('shows elapsed and total time for the piece', async () => {
    render(<AudioBottomPlayer soundPiece={SOUND_PIECE} />)

    act(() => {
      audioStore.getState().playPiece(SOUND_PIECE.id, SOUND_PIECE.mapId)
      audioTransitions.pieceLoaded(125)
      audioTransitions.pieceTimeUpdated(65)
    })

    const time = await screen.findByTestId('bottom-time')
    expect(time).toHaveTextContent('1:05 / 2:05')
  })

  it('updates volume from the slider', () => {
    render(<AudioBottomPlayer soundPiece={SOUND_PIECE} />)

    const slider = screen.getByTestId('bottom-volume')
    act(() => {
      fireEvent.change(slider, { target: { value: '35' } })
    })

    expect(audioStore.getState().volume).toBe(0.35)
  })

  it('toggles mute when the mute button is clicked', () => {
    render(<AudioBottomPlayer soundPiece={SOUND_PIECE} />)

    const muteButton = screen.getByTestId('bottom-mute')
    act(() => {
      fireEvent.click(muteButton)
    })

    expect(audioStore.getState().muted).toBe(true)

    act(() => {
      fireEvent.click(muteButton)
    })

    expect(audioStore.getState().muted).toBe(false)
  })

  it('appears in piece mode when a sound piece is playing', async () => {
    render(<AudioBottomPlayer soundPiece={SOUND_PIECE} />)

    act(() => {
      audioStore.getState().playPiece(SOUND_PIECE.id, SOUND_PIECE.mapId)
      audioTransitions.pieceLoaded(180)
    })

    const player = await screen.findByTestId('audio-bottom-player')
    expect(player).toHaveAttribute('data-mode', 'piece')
    expect(screen.getByText(SOUND_PIECE.title)).toBeInTheDocument()
    expect(screen.getByText(SOUND_PIECE.author)).toBeInTheDocument()
  })

  it('renders the base, buffered, and played layers in one scrubber track', () => {
    render(<AudioBottomPlayer soundPiece={SOUND_PIECE} />)

    act(() => {
      audioStore.getState().playPiece(SOUND_PIECE.id, SOUND_PIECE.mapId)
      audioTransitions.pieceLoaded(100)
      audioTransitions.pieceTimeUpdated(25)
      audioTransitions.pieceBuffered([
        { start: 0, end: 50 },
        { start: 70, end: 90 }
      ])
    })

    const track = screen.getByTestId('bottom-scrubber-track')
    const buffered = screen.getByTestId('bottom-scrubber-buffered')
    const played = screen.getByTestId('bottom-scrubber-played')

    expect(track).toContainElement(screen.getByTestId('bottom-scrubber-base'))
    expect(track).toContainElement(buffered)
    expect(track).toContainElement(played)
    expect(screen.getByTestId('bottom-scrubber-base')).toHaveClass('bg-white/20')
    expect(buffered).toHaveClass('bg-white/40')
    expect(played).toHaveClass('bg-secondary-sand')
    expect(played).toHaveAttribute('data-played-percentage', '25')
    expect(buffered).toHaveAttribute('data-buffer-start', '25')
    expect(buffered).toHaveAttribute('data-buffer-width', '25')
    expect(screen.queryByText(/buffering|cargando/i)).not.toBeInTheDocument()
  })

  it('clamps played progress and shows no buffer without a containing range', () => {
    render(<AudioBottomPlayer soundPiece={SOUND_PIECE} />)

    act(() => {
      audioStore.getState().playPiece(SOUND_PIECE.id, SOUND_PIECE.mapId)
      audioTransitions.pieceLoaded(100)
      audioTransitions.pieceTimeUpdated(150)
      audioTransitions.pieceBuffered([{ start: 0, end: 50 }])
    })

    expect(screen.getByTestId('bottom-scrubber-played')).toHaveAttribute('data-played-percentage', '100')
    expect(screen.getByTestId('bottom-scrubber-buffered')).toHaveAttribute('data-buffer-width', '0')
  })

  it('updates the buffered layer while paused without changing the playhead', () => {
    render(<AudioBottomPlayer soundPiece={SOUND_PIECE} />)

    act(() => {
      audioStore.getState().playPiece(SOUND_PIECE.id, SOUND_PIECE.mapId)
      audioTransitions.pieceLoaded(100)
      audioTransitions.pieceTimeUpdated(30)
      audioStore.getState().pausePiece()
      audioTransitions.pieceBuffered([{ start: 0, end: 45 }])
    })

    expect(audioStore.getState().piece.currentTime).toBe(30)
    expect(screen.getByTestId('bottom-scrubber-buffered')).toHaveAttribute('data-buffer-width', '15')

    act(() => {
      audioTransitions.pieceBuffered([{ start: 0, end: 70 }])
    })

    expect(audioStore.getState().piece.currentTime).toBe(30)
    expect(screen.getByTestId('bottom-scrubber-buffered')).toHaveAttribute('data-buffer-width', '40')
  })

  it.each([
    [AUDIO_STATUS.LOADING, 'Cargando audio'],
    [AUDIO_STATUS.BUFFERING, 'Recuperando audio']
  ])('uses the shared spinner with distinct %s semantics', (status, label) => {
    render(<AudioBottomPlayer soundPiece={SOUND_PIECE} />)

    act(() => {
      audioStore.getState().playPiece(SOUND_PIECE.id, SOUND_PIECE.mapId)
      if (status === AUDIO_STATUS.BUFFERING) audioTransitions.pieceBuffering()
    })

    expect(screen.getByRole('button', { name: label })).toHaveAttribute('data-status', status)
    expect(screen.getByTestId('bottom-spinner')).toHaveAttribute('data-status', status)
    expect(screen.queryByTestId('bottom-wave')).toBeInTheDocument()
  })

  it('seeks the piece when the scrubber is changed in piece mode', async () => {
    render(<AudioBottomPlayer soundPiece={SOUND_PIECE} />)

    act(() => {
      audioStore.getState().playPiece(SOUND_PIECE.id, SOUND_PIECE.mapId)
      audioTransitions.pieceLoaded(180)
    })

    const scrubber = await screen.findByTestId('bottom-scrubber')
    act(() => {
      fireEvent.change(scrubber, { target: { value: '50' } })
    })

    await waitFor(() => {
      expect(audioStore.getState().piece.currentTime).toBe(90)
    })
  })

  it('renders nothing when disabled', () => {
    render(<AudioBottomPlayer soundPiece={SOUND_PIECE} enabled={false} />)

    expect(screen.queryByTestId('audio-bottom-player')).not.toBeInTheDocument()
    expect(screen.queryByTestId('bottom-play-pause')).not.toBeInTheDocument()
  })
})
