import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { MapCompositionFixture } from '../../fixtures/map-composition';
import { BasePage } from '../base-page';

export interface MapBounds {
  viewport: { left: number; right: number; top: number; bottom: number };
  image: { left: number; right: number; top: number; bottom: number };
}

export interface MarkPositionProbe {
  x: number;
  y: number;
  transform: string;
  imageWidth: number;
  imageHeight: number;
}

export class MapPage extends BasePage {
  readonly heading: Locator;
  readonly viewport: Locator;
  readonly marks: Locator;
  readonly soundButtons: Locator;
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
  readonly compositionPreviews: Locator;
  readonly compositionErrors: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading');
    this.viewport = page.locator('map-view#main-map');
    this.marks = page.getByTestId('sound-mark');
    this.soundButtons = page.getByTestId('sound-button');
    this.hoverCards = page.locator('.sound-mark__tooltip');
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
    this.compositionPreviews = page.locator('[data-map-composition-preview]');
    this.compositionErrors = this.viewport.getByRole('alert');
  }

  async goto(slug: string): Promise<void> {
    await super.goto(`/${slug}`);
  }

  async waitForViewportReady(): Promise<void> {
    await expect(this.viewport).toHaveAttribute('data-ready', 'true');
  }

  getCompositionPreview(slug: string): Locator {
    return this.page.locator(
      `[data-map-composition-preview][aria-labelledby="map-composition-label-${slug}"]`
    );
  }

  async expectCompositionParity(fixture: MapCompositionFixture): Promise<void> {
    await expect(this.getCompositionPreview(fixture.slug)).toHaveCount(1);
    await expect(
      this.getCompositionPreview(fixture.slug).locator('img')
    ).toHaveAttribute('width', /[1-9]\d*/);
    await expect(
      this.getCompositionPreview(fixture.slug).locator('img')
    ).toHaveAttribute('height', /[1-9]\d*/);
    const layerIds = await this.viewport
      .locator('[data-map-layer]')
      .evaluateAll((layers) =>
        layers.map((layer) => layer.getAttribute('data-map-layer'))
      );
    expect(layerIds).toEqual(fixture.layerIds);
    await expect(
      this.viewport.locator('[data-map-layer="base"]')
    ).toHaveAttribute(
      'style',
      new RegExp(
        `left: ${fixture.baseFrame.x}px; top: ${fixture.baseFrame.y}px;`
      )
    );
  }

  /** The Mark group for a mark id (`data-testid="sound-mark"`). */
  getSoundMark(markId: number): Locator {
    return this.page.locator(
      `[data-testid="sound-mark"][data-mark-id="${markId}"]`
    );
  }

  /** One sound button inside a mark's fan for a sound id. */
  getSoundButton(markId: number, soundId: number): Locator {
    return this.getSoundMark(markId).locator(
      `[data-testid="sound-button"][data-sound-id="${soundId}"]`
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

  async getMarkPosition(markId: number): Promise<MarkPositionProbe> {
    const mark = this.getSoundMark(markId);
    return mark.evaluate((element) => {
      const mapView = document.querySelector('map-view#main-map') as
        | (HTMLElement & { imageWidth: number; imageHeight: number })
        | null;
      const x = Number.parseFloat(
        element.style.getPropertyValue('--mark-x')
      );
      const y = Number.parseFloat(
        element.style.getPropertyValue('--mark-y')
      );
      return {
        x,
        y,
        transform: element.style.transform,
        imageWidth: mapView?.imageWidth ?? 0,
        imageHeight: mapView?.imageHeight ?? 0
      };
    });
  }

  async getImageSize(): Promise<{ width: number; height: number }> {
    return this.page.evaluate(() => {
      const mapView = document.querySelector('map-view#main-map') as
        | (HTMLElement & { imageWidth: number; imageHeight: number })
        | null;
      return { width: mapView?.imageWidth ?? 0, height: mapView?.imageHeight ?? 0 };
    });
  }

  async getBounds(): Promise<MapBounds> {
    return this.page.evaluate(() => {
      const viewport = document
        .querySelector('.map-viewport')
        ?.getBoundingClientRect();
      // The real content box: the world layer (the image footprint). The
      // `.map-panzoom` interaction surface stays a static, viewport-sized
      // wrapper — the pan/zoom transform (and its semantic content bounds) live
      // on the world, so the bounds are measured there.
      const image = document
        .querySelector('.map-world')
        ?.getBoundingClientRect();
      if (viewport === undefined || image === undefined) {
        throw new Error('Map viewport is not ready');
      }
      return {
        viewport: {
          left: viewport.left,
          right: viewport.right,
          top: viewport.top,
          bottom: viewport.bottom
        },
        image: {
          left: image.left,
          right: image.right,
          top: image.top,
          bottom: image.bottom
        }
      };
    });
  }
}

declare global {
  interface HTMLMapViewElement extends HTMLElement {
    getScale(): number;
  }
}