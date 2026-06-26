import type { Locator, Page } from '@playwright/test';

import { mockMaps } from '../../../src/features/maps/data/mock-maps';
import { BasePage } from '../base-page';

export class HomePage extends BasePage {
  readonly heading: Locator;
  readonly nav: Locator;
  readonly proyectoLink: Locator;
  readonly datosLink: Locator;
  readonly equipoLink: Locator;
  readonly mapCards: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByText('Cartografías Sensoriales').first();
    this.nav = page.getByRole('navigation', { name: 'Principal' });
    this.proyectoLink = page.getByRole('link', { name: 'Proyecto' });
    this.datosLink = page.getByRole('link', { name: 'Datos' });
    this.equipoLink = page.getByRole('link', { name: 'Equipo' });
    this.mapCards = page.getByTestId('map-card');
  }

  async goto(): Promise<void> {
    await super.goto('/');
  }

  getMapCard(title: string): Locator {
    return this.page.getByRole('link', { name: title });
  }

  get firstMapTitle(): string {
    return mockMaps[0].title;
  }

  get firstMapSlug(): string {
    return mockMaps[0].slug;
  }
}
