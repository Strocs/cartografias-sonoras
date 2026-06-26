import { describe, expect, it } from 'vitest';

import { render, screen } from '@testing-library/react';

import { HoverCard } from '../../src/features/sounds/ui/HoverCard';
import type { Sound } from '../../src/features/sounds/domain/types';

const sound: Sound = {
  id: 101,
  title: 'Fuente central',
  description: 'Murmullo constante del agua cayendo en la pileta principal.',
  audioUrl: '/sounds/locacion-1/fuente-central.mp3',
  position: { x: 608, y: 432 },
  mapId: 1,
};

describe('HoverCard', () => {
  it('renders the sound title', () => {
    render(<HoverCard sound={sound} />);

    expect(screen.getByText(sound.title)).toBeInTheDocument();
  });

  it('renders the formatted duration', () => {
    render(<HoverCard sound={sound} duration="0:45" />);

    expect(screen.getByText('0:45')).toBeInTheDocument();
  });

  it('renders the default duration when none is provided', () => {
    render(<HoverCard sound={sound} />);

    expect(screen.getByText('0:30')).toBeInTheDocument();
  });

  it('renders the location when provided', () => {
    render(<HoverCard sound={sound} location="Barrio Inglés, Coquimbo" />);

    expect(screen.getByText('Barrio Inglés, Coquimbo')).toBeInTheDocument();
  });

  it('renders the sound description', () => {
    render(<HoverCard sound={sound} />);

    expect(screen.getByText(sound.description)).toBeInTheDocument();
  });

  it('does not render the location row when location is missing', () => {
    render(<HoverCard sound={sound} />);

    expect(screen.queryByText('📍')).not.toBeInTheDocument();
  });
});
