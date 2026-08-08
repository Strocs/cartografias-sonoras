import type { Locator, Page } from '@playwright/test'

import { mapFixtures } from '../../fixtures/maps'
import { BasePage } from '../base-page'

export class HomePage extends BasePage {
  readonly heading: Locator
  readonly nav: Locator
  readonly proyectoLink: Locator
  readonly datosLink: Locator
  readonly equipoLink: Locator
  readonly mapCards: Locator
  readonly compositionPreviews: Locator

  constructor(page: Page) {
    super(page)
    this.heading = page.getByText('Cartografías Sensoriales').first()
    this.nav = page.getByRole('navigation', { name: 'Principal' })
    this.proyectoLink = page.getByRole('link', { name: 'Proyecto' })
    this.datosLink = page.getByRole('link', { name: 'Datos' })
    this.equipoLink = page.getByRole('link', { name: 'Equipo' })
    this.mapCards = page.getByTestId('map-card')
    this.compositionPreviews = page.locator('[data-map-composition-preview]')
  }

  async goto(): Promise<void> {
    await super.goto('/')
  }

  getMapCard(title: string): Locator {
    return this.page.getByRole('link', { name: title })
  }

  async hoverMapCard(title: string): Promise<void> {
    await this.getMapCard(title).hover()
  }

  get firstMapTitle(): string {
    return mapFixtures[0].title
  }

  get firstMapSlug(): string {
    return mapFixtures[0].slug
  }
}
