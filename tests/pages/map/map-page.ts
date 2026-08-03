import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { BasePage } from '../base-page';

export interface MapBounds {
  viewport: { left: number; right: number; top: number; bottom: number };
  image: { left: number; right: number; top: number; bottom: number };
}

export class MapPage extends BasePage {
  readonly heading: Locator;
  readonly viewport: Locator;
  readonly markers: Locator;
  readonly hoverCards: Locator;
  readonly mapControls: Locator;
  readonly zoomInButton: Locator;
  readonly zoomOutButton: Locator;
  readonly centerMapButton: Locator;
  readonly rightRail: Locator;
  readonly railLinks: Locator;
  readonly pathSvg: Locator;
  readonly navTitle: Locator;
  readonly bottomPlayer: Locator;
  readonly bottomPlayPause: Locator;
  readonly bottomScrubber: Locator;
  readonly bottomTime: Locator;
  readonly bottomWave: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading');
    this.viewport = page.locator('map-view#main-map');
    this.markers = page.getByTestId('sound-marker');
    this.hoverCards = page.locator('.sound-marker__tooltip');
    this.mapControls = page.getByTestId('map-controls');
    this.zoomInButton = page.getByTestId('zoom-in');
    this.zoomOutButton = page.getByTestId('zoom-out');
    this.centerMapButton = page.getByTestId('center-map');
    this.rightRail = page.getByTestId('right-rail');
    this.railLinks = page.getByTestId('right-rail').getByRole('link');
    this.pathSvg = page.getByTestId('map-path');
    this.navTitle = page.getByText('Cartografías Sensoriales').first();
    this.bottomPlayer = page.getByTestId('audio-bottom-player');
    this.bottomPlayPause = page.getByTestId('bottom-play-pause');
    this.bottomScrubber = page.getByTestId('bottom-scrubber');
    this.bottomTime = page.getByTestId('bottom-time');
    this.bottomWave = page.getByTestId('bottom-wave');
  }

  async goto(slug: string): Promise<void> {
    await super.goto(`/${slug}`);
  }

  async waitForViewportReady(): Promise<void> {
    await expect(this.viewport).toHaveAttribute('data-ready', 'true');
  }

  getMarkerBySoundId(soundId: number): Locator {
    return this.page.locator(
      `[data-testid="sound-marker"][data-sound-id="${soundId}"]`
    );
  }

  getRailLink(slug: string): Locator {
    return this.rightRail.locator(`a[href="/${slug}"]`);
  }

  async getZoom(): Promise<number> {
    return this.page.evaluate(() => {
      const mapView = document.querySelector('map-view#main-map');
      return (mapView as HTMLMapViewElement | null)?.getScale() ?? 1;
    });
  }

  async getBounds(): Promise<MapBounds> {
    return this.page.evaluate(() => {
      const viewport = document.querySelector('.map-viewport')?.getBoundingClientRect();
      const image = document.querySelector('.map-panzoom')?.getBoundingClientRect();
      if (viewport === undefined || image === undefined) {
        throw new Error('Map viewport is not ready');
      }
      return {
        viewport: { left: viewport.left, right: viewport.right, top: viewport.top, bottom: viewport.bottom },
        image: { left: image.left, right: image.right, top: image.top, bottom: image.bottom },
      };
    });
  }
}

declare global {
  interface HTMLMapViewElement extends HTMLElement {
    getScale(): number;
  }
}
