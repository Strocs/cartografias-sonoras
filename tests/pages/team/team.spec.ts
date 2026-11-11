import { expect, test } from '@playwright/test'
import { teamMembers } from '@shared/data/team'

const names = [
  'Carolina Arriagada Sickinger',
  'Javier Alejandro Alberto Fredes González',
  'Mauricio Flores Sánchez',
  'Javiera Constanza Ramírez Vallejos',
  'Ignacio Andrés Molina Palominos'
]

test('team profiles appear in the requested order with contact and menu links', async ({ page }) => {
  await page.goto('/equipo')
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('Equipo')
  await expect(page.locator('main article h2')).toHaveText(names)
  const profiles = page.locator('main article')
  await expect(profiles).toHaveCount(5)
  for (const [index, profile] of (await profiles.all()).entries()) {
    await expect(profile.locator('p').first()).toHaveText(teamMembers[index].role)
    await expect(profile.locator('p').nth(1)).toHaveText(teamMembers[index].biography)
  }
  await expect(profiles.nth(1).getByRole('link', { name: 'javier.fredes@userena.cl' })).toHaveAttribute(
    'href',
    'mailto:javier.fredes@userena.cl'
  )
  await expect(
    page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Equipo', exact: true })
  ).toHaveAttribute('aria-current', 'page')
  await expect(
    page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Inicio', exact: true })
  ).toHaveAttribute('href', '/')
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
