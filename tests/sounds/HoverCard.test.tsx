import { describe, expect, it } from 'vitest';

import { render, screen } from '@testing-library/react';

import { HoverCard } from '../../src/features/sounds/ui/HoverCard';
import { mockSounds } from '../../src/features/sounds/data/mock-sounds';

const sound = mockSounds[0];

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

    expect(screen.getByText('1:42')).toBeInTheDocument();
  });

  it('renders the location from the sound object', () => {
    render(<HoverCard sound={sound} />);

    expect(screen.getByText(sound.location)).toBeInTheDocument();
  });

  it('renders the sound description', () => {
    render(<HoverCard sound={sound} />);

    expect(screen.getByText(sound.description)).toBeInTheDocument();
  });

  it('does not render the location row when location is missing', () => {
    const noLocationSound = { ...sound, location: '' };
    render(<HoverCard sound={noLocationSound} />);

    expect(screen.getByText(sound.title)).toBeInTheDocument();
    expect(screen.queryByText(sound.location)).not.toBeInTheDocument();
  });
});
