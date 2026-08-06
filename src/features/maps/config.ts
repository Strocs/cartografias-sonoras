/**
 * Legacy @panzoom integration default (used only by panzoom-setup tests).
 *
 * The interactive <map-view> custom element does NOT use this constant: it
 * derives its zoom range from the fitted scale (zoom factors relative to 1x),
 * where 1x means "the whole map fits the viewport".
 */
export const DEFAULT_MAX_ZOOM = 4;

/**
 * Zoom factors expressed relative to the fitted scale (fit = 1x, the state in
 * which the complete map fits the viewport). Both apply regardless of screen
 * size: the effective scale is `fit * factor`.
 */
export const DEFAULT_MIN_ZOOM_FACTOR = 0.8;
export const DEFAULT_MAX_ZOOM_FACTOR = 3;
export const DEFAULT_START_ZOOM_FACTOR = 1;