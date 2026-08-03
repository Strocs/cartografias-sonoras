import type { Path } from './types';

export function checkPathInvariants(path: Path): void {
  if (path.mapId === null || path.mapId === undefined) {
    throw new Error('Path must belong to a map');
  }

  if (path.startSoundId === path.endSoundId) {
    throw new Error('Path must connect two different sounds');
  }

  checkWaypointInvariants(path);
}

/**
 * Validates waypoints as finite geometry points. This check is independent of
 * route topology and path cardinality — it only inspects the waypoint
 * coordinates themselves.
 */
export function checkWaypointInvariants(path: Path): void {
  for (const waypoint of path.waypoints) {
    if (
      !Number.isFinite(waypoint.x) ||
      !Number.isFinite(waypoint.y)
    ) {
      throw new Error('Waypoint coordinates must be finite');
    }

    if (
      waypoint.x < 0 ||
      waypoint.x > 100 ||
      waypoint.y < 0 ||
      waypoint.y > 100
    ) {
      throw new Error(
        'Waypoint must be within 0–100 (percentage of map dimensions)'
      );
    }
  }
}
