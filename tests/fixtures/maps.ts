/**
 * E2E-safe map metadata fixture.
 *
 * This mirrors the production mock maps but does not import image assets, so
 * Playwright's Node-side test runner can load it without a PNG transform.
 */
export interface MapFixture {
  id: number;
  slug: string;
  title: string;
}

export const mapFixtures: MapFixture[] = [
  {
    id: 1,
    slug: 'avenida-de-aguirre-la-serena',
    title: 'Avenida de Aguirre - La Serena'
  },
  {
    id: 2,
    slug: 'plaza-de-armas-la-serena',
    title: 'Plaza de Armas - La Serena'
  },
  {
    id: 3,
    slug: 'cruz-del-tercer-milenio-coquimbo',
    title: 'Cruz del Tercer Milenio - Coquimbo'
  }
];
