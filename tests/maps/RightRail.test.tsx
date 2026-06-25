import { describe, expect, it } from 'vitest';

import { render, screen } from '@testing-library/react';

import { RightRail } from '../../src/features/maps/ui/RightRail';
import type { Map } from '../../src/features/maps/domain/types';

const maps: Map[] = [
  {
    id: 1,
    slug: 'locacion-1',
    title: 'Plaza de Armas — La Serena',
    image: { src: '/maps/locacion-1.png', width: 1216, height: 864 },
    soundPieceId: 1,
  },
  {
    id: 2,
    slug: 'locacion-2',
    title: 'Mercado — Coquimbo',
    image: { src: '/maps/locacion-2.png', width: 864, height: 1243 },
    soundPieceId: 2,
  },
  {
    id: 3,
    slug: 'locacion-3',
    title: 'Borde Costero',
    image: { src: '/maps/locacion-3.png', width: 1160, height: 912 },
    soundPieceId: 3,
  },
];

describe('RightRail', () => {
  it('excludes the active map from the rail', () => {
    render(<RightRail maps={maps} activeSlug="locacion-1" />);

    expect(screen.queryByText('Plaza de Armas — La Serena')).not.toBeInTheDocument();
    expect(screen.getByText('Mercado — Coquimbo')).toBeInTheDocument();
    expect(screen.getByText('Borde Costero')).toBeInTheDocument();
  });

  it('renders a link to each inactive map', () => {
    render(<RightRail maps={maps} activeSlug="locacion-2" />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '/locacion-1');
    expect(links[1]).toHaveAttribute('href', '/locacion-3');
  });

  it('renders thumbnails for inactive maps', () => {
    render(<RightRail maps={maps} activeSlug="locacion-3" />);

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute('src', '/maps/locacion-1.png');
    expect(images[1]).toHaveAttribute('src', '/maps/locacion-2.png');
  });

  it('renders the map titles', () => {
    render(<RightRail maps={maps} activeSlug="locacion-1" />);

    expect(screen.getByText('Mercado — Coquimbo')).toBeInTheDocument();
    expect(screen.getByText('Borde Costero')).toBeInTheDocument();
  });
});
