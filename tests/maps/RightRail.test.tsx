import { describe, expect, it } from 'vitest';

import { render, screen } from '@testing-library/react';

import { RightRail } from '../../src/features/maps/ui/RightRail';
import { mockMaps } from '../../src/features/maps/data/mock-maps';

describe('RightRail', () => {
  it('excludes the active map from the rail', () => {
    const activeSlug = mockMaps[0].slug;
    render(<RightRail maps={mockMaps} activeSlug={activeSlug} />);

    const activeMap = mockMaps[0];
    const inactive1 = mockMaps[1];
    const inactive2 = mockMaps[2];

    expect(screen.queryByText(activeMap.title)).not.toBeInTheDocument();
    expect(screen.getByText(inactive1.title)).toBeInTheDocument();
    expect(screen.getByText(inactive2.title)).toBeInTheDocument();
  });

  it('renders a link to each inactive map', () => {
    const activeSlug = mockMaps[1].slug;
    render(<RightRail maps={mockMaps} activeSlug={activeSlug} />);

    const inactiveMaps = mockMaps.filter((m) => m.slug !== activeSlug);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(inactiveMaps.length);
    expect(links[0]).toHaveAttribute('href', `/${inactiveMaps[0].slug}`);
    expect(links[1]).toHaveAttribute('href', `/${inactiveMaps[1].slug}`);
  });

  it('renders thumbnails for inactive maps', () => {
    const activeSlug = mockMaps[2].slug;
    render(<RightRail maps={mockMaps} activeSlug={activeSlug} />);

    const inactiveMaps = mockMaps.filter((m) => m.slug !== activeSlug);
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(inactiveMaps.length);
    expect(images[0]).toHaveAttribute('src', inactiveMaps[0].image.src);
    expect(images[1]).toHaveAttribute('src', inactiveMaps[1].image.src);
  });

  it('renders the map titles', () => {
    const activeSlug = mockMaps[0].slug;
    render(<RightRail maps={mockMaps} activeSlug={activeSlug} />);

    const inactiveMaps = mockMaps.filter((m) => m.slug !== activeSlug);
    expect(screen.getByText(inactiveMaps[0].title)).toBeInTheDocument();
    expect(screen.getByText(inactiveMaps[1].title)).toBeInTheDocument();
  });
});
