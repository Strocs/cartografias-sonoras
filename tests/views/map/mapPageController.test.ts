import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const bindMapViewMock = vi.hoisted(() => vi.fn())

vi.mock('../../../src/views/map/mapViewBindings', () => ({
  bindMapView: bindMapViewMock
}))

import { bindMapPage } from '../../../src/views/map/mapPageController'

const MAP_DATA = { marks: [], paths: [], imgWidth: 100, imgHeight: 100 }

function createMapView(ready = false): HTMLElement {
  const el = document.createElement('map-view')
  el.id = 'main-map'
  if (ready) el.setAttribute('data-ready', 'true')
  document.body.appendChild(el)
  return el
}

describe('bindMapPage', () => {
  beforeEach(() => {
    bindMapViewMock.mockReset()
    document.body.innerHTML = ''
    const dataScript = document.createElement('script')
    dataScript.id = 'map-data'
    dataScript.type = 'application/json'
    dataScript.textContent = JSON.stringify(MAP_DATA)
    document.body.appendChild(dataScript)
  })

  afterEach(() => {
    bindMapPage()
  })

  it('binds immediately when the map view is already ready', () => {
    const el = createMapView(true)

    const dispose = bindMapPage()

    expect(bindMapViewMock).toHaveBeenCalledTimes(1)
    expect(bindMapViewMock).toHaveBeenCalledWith(expect.objectContaining({ mapView: el, ...MAP_DATA }))
    dispose()
  })

  it('waits for map-composition-ready before binding', () => {
    const el = createMapView(false)

    const dispose = bindMapPage()

    expect(bindMapViewMock).not.toHaveBeenCalled()

    el.dispatchEvent(
      new CustomEvent('map-composition-ready', {
        bubbles: true,
        detail: { status: 'ready' }
      })
    )

    expect(bindMapViewMock).toHaveBeenCalledTimes(1)
    dispose()
  })

  it('does not bind twice when the ready event fires repeatedly', () => {
    const el = createMapView(false)

    bindMapPage()
    el.dispatchEvent(new CustomEvent('map-composition-ready', { bubbles: true }))
    el.dispatchEvent(new CustomEvent('map-composition-ready', { bubbles: true }))

    expect(bindMapViewMock).toHaveBeenCalledTimes(1)
  })

  it('cleanup unbinds the binding and detaches the ready listener', () => {
    const el = createMapView(false)
    const unbind = vi.fn()
    bindMapViewMock.mockReturnValueOnce(unbind)

    const dispose = bindMapPage()
    el.dispatchEvent(new CustomEvent('map-composition-ready', { bubbles: true }))
    expect(bindMapViewMock).toHaveBeenCalledTimes(1)

    dispose()
    expect(unbind).toHaveBeenCalledOnce()

    el.dispatchEvent(new CustomEvent('map-composition-ready', { bubbles: true }))
    expect(bindMapViewMock).toHaveBeenCalledTimes(1)
  })

  it('cleans the previous binding when rebinding for a new page load', () => {
    createMapView(true)
    const firstUnbind = vi.fn()
    bindMapViewMock.mockReturnValueOnce(firstUnbind)

    bindMapPage()
    expect(bindMapViewMock).toHaveBeenCalledTimes(1)

    const secondUnbind = vi.fn()
    bindMapViewMock.mockReturnValueOnce(secondUnbind)
    bindMapPage()

    expect(bindMapViewMock).toHaveBeenCalledTimes(2)
    expect(firstUnbind).toHaveBeenCalledOnce()
    expect(secondUnbind).not.toHaveBeenCalled()
  })

  it('ignores a stale map readiness event after ClientRouter replaces the page', () => {
    const staleMapView = createMapView(false)
    bindMapPage()

    staleMapView.remove()
    document.getElementById('map-data')?.remove()
    const dataScript = document.createElement('script')
    dataScript.id = 'map-data'
    dataScript.type = 'application/json'
    dataScript.textContent = JSON.stringify(MAP_DATA)
    document.body.appendChild(dataScript)
    const currentMapView = createMapView(false)

    bindMapPage()
    staleMapView.dispatchEvent(new CustomEvent('map-composition-ready', { bubbles: true }))
    expect(bindMapViewMock).not.toHaveBeenCalled()

    currentMapView.dispatchEvent(new CustomEvent('map-composition-ready', { bubbles: true }))
    expect(bindMapViewMock).toHaveBeenCalledOnce()
    expect(bindMapViewMock).toHaveBeenCalledWith(expect.objectContaining({ mapView: currentMapView }))
  })

  it('does not bind when the map view element is absent', () => {
    const dispose = bindMapPage()

    expect(bindMapViewMock).not.toHaveBeenCalled()
    dispose()
  })

  it('does not bind when the page data script is absent', () => {
    createMapView(true)
    document.getElementById('map-data')?.remove()

    const dispose = bindMapPage()

    expect(bindMapViewMock).not.toHaveBeenCalled()
    dispose()
  })
})
