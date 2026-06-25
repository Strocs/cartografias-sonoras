import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { BasePage } from '../base-page';

export class MapPage extends BasePage {
  readonly heading: Locator;
  readonly viewport: Locator;
  readonly backLink: Locator;
  readonly markers: Locator;
  readonly hoverCards: Locator;
  readonly mapControls: Locator;
  readonly zoomInButton: Locator;
  readonly zoomOutButton: Locator;
  readonly centerMapButton: Locator;
  readonly rightRail: Locator;
  readonly railLinks: Locator;
  readonly pathSvg: Locator;
  readonly waveDivider: Locator;
  readonly subtitle: Locator;
  readonly institutionalLogos: Locator;
  readonly bottomPlayer: Locator;
  readonly bottomPlayPause: Locator;
  readonly bottomScrubber: Locator;
  readonly bottomTime: Locator;
  readonly bottomWave: Locator;
  readonly soundPieceTrigger: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading');
    this.viewport = page.getByTestId('map-viewport');
    this.backLink = page.getByRole('link', { name: 'Volver' });
    this.markers = page.getByTestId('sound-marker');
    this.hoverCards = page.getByTestId('hover-card');
    this.mapControls = page.getByTestId('map-controls');
    this.zoomInButton = page.getByTestId('zoom-in');
    this.zoomOutButton = page.getByTestId('zoom-out');
    this.centerMapButton = page.getByTestId('center-map');
    this.rightRail = page.getByTestId('right-rail');
    this.railLinks = page.getByTestId('right-rail').getByRole('link');
    this.pathSvg = page.locator('.leaflet-path-pane path');
    this.waveDivider = page.locator('aside svg[viewBox="0 0 200 8"]');
    this.subtitle = page.getByText('Paisaje Sonoro Urbano');
    this.institutionalLogos = page.getByText('Instituciones');
    this.bottomPlayer = page.getByTestId('audio-bottom-player');
    this.bottomPlayPause = page.getByTestId('bottom-play-pause');
    this.bottomScrubber = page.getByTestId('bottom-scrubber');
    this.bottomTime = page.getByTestId('bottom-time');
    this.bottomWave = page.getByTestId('bottom-wave');
    this.soundPieceTrigger = page.getByTestId('sound-piece-trigger');
  }

  async goto(slug: string): Promise<void> {
    await super.goto(`/${slug}`);
  }

  async waitForViewportReady(): Promise<void> {
    await expect(this.viewport).toHaveAttribute('data-ready', 'true');
  }

  getMarkerBySoundId(soundId: number): Locator {
    return this.page.locator(`[data-testid="sound-marker"][data-sound-id="${soundId}"]`);
  }

  getRailLink(slug: string): Locator {
    return this.rightRail.locator(`a[href="/${slug}"]`);
  }

  async getZoom(): Promise<number> {
    const zoom = await this.viewport.getAttribute('data-zoom');
    return Number(zoom ?? 0);
  }
}
