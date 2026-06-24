import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { BasePage } from '../base-page';

export class MapPage extends BasePage {
  readonly heading: Locator;
  readonly viewport: Locator;
  readonly backLink: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading');
    this.viewport = page.getByTestId('map-viewport');
    this.backLink = page.getByRole('link', { name: 'Volver' });
  }

  async goto(slug: string): Promise<void> {
    await super.goto(`/${slug}`);
  }

  async waitForViewportReady(): Promise<void> {
    await expect(this.viewport).toHaveAttribute('data-ready', 'true');
  }
}
