import { describe, expect, it } from 'vitest';

import type { Path } from '../../src/features/paths/domain';
import {
  checkRouteTopology,
  checkWaypointInvariants
} from '../../src/features/paths/domain';
import { MAPS_DATA } from '../../src/features/maps/data';
import { PATHS } from '../../src/features/paths/data';
import { SOUNDS } from '../../src/features/sounds/data';

const linearRoute = (): Path[] => [
  { id: 1, mapId: 2, waypoints: [], startSoundId: 201, endSoundId: 205 },
  { id: 2, mapId: 2, waypoints: [], startSoundId: 205, endSoundId: 202 },
  { id: 3, mapId: 2, waypoints: [], startSoundId: 202, endSoundId: 203 },
  { id: 4, mapId: 2, waypoints: [], startSoundId: 203, endSoundId: 204 }
];

const mapSounds = (mapId: number): number[] =>
  SOUNDS.filter((s) => s.mapId === mapId).map((s) => s.id);

const mapPaths = (mapId: number): Path[] =>
  PATHS.filter((p) => p.mapId === mapId);

describe('checkRouteTopology — dataset', () => {
  it('satisfies N-1 for every map', () => {
    for (const map of MAPS_DATA) {
      const result = checkRouteTopology(
        map.id,
        mapSounds(map.id),
        mapPaths(map.id)
      );
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    }
  });
});

describe('checkRouteTopology — linear route invariants', () => {
  it('accepts a valid linear route', () => {
    const result = checkRouteTopology(
      2,
      [201, 205, 202, 203, 204],
      linearRoute()
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects the wrong number of paths (N-1 violation)', () => {
    const paths = linearRoute().slice(0, 3);
    const result = checkRouteTopology(2, [201, 205, 202, 203, 204], paths);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('expected exactly 4 (N-1)');
  });

  it('rejects a disconnected route', () => {
    const paths = [
      { id: 1, mapId: 2, waypoints: [], startSoundId: 201, endSoundId: 205 },
      { id: 2, mapId: 2, waypoints: [], startSoundId: 202, endSoundId: 203 },
      { id: 3, mapId: 2, waypoints: [], startSoundId: 203, endSoundId: 204 },
      { id: 4, mapId: 2, waypoints: [], startSoundId: 204, endSoundId: 202 }
    ];
    const result = checkRouteTopology(2, [201, 205, 202, 203, 204], paths);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('not connected');
  });

  it('rejects a route with a cycle', () => {
    const paths = [
      { id: 1, mapId: 2, waypoints: [], startSoundId: 201, endSoundId: 205 },
      { id: 2, mapId: 2, waypoints: [], startSoundId: 205, endSoundId: 202 },
      { id: 3, mapId: 2, waypoints: [], startSoundId: 202, endSoundId: 203 },
      { id: 4, mapId: 2, waypoints: [], startSoundId: 203, endSoundId: 205 }
    ];
    const result = checkRouteTopology(2, [201, 205, 202, 203, 204], paths);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('cycle');
  });

  it('rejects a self-connection', () => {
    const paths = [
      { id: 1, mapId: 2, waypoints: [], startSoundId: 201, endSoundId: 201 },
      ...linearRoute().slice(1)
    ];
    const result = checkRouteTopology(2, [201, 205, 202, 203, 204], paths);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('self-connection');
  });

  it('rejects duplicate undirected edges', () => {
    const paths = [
      ...linearRoute(),
      { id: 5, mapId: 2, waypoints: [], startSoundId: 203, endSoundId: 202 }
    ];
    const result = checkRouteTopology(2, [201, 205, 202, 203, 204], paths);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('Duplicate undirected edge');
  });

  it('rejects a sound with no path', () => {
    const result = checkRouteTopology(
      2,
      [201, 205, 202, 203, 204, 999],
      linearRoute()
    );
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('Sound 999 has no path');
  });

  it('rejects a sound that does not belong to the map', () => {
    const paths = [
      { id: 1, mapId: 2, waypoints: [], startSoundId: 201, endSoundId: 205 },
      { id: 2, mapId: 2, waypoints: [], startSoundId: 205, endSoundId: 202 },
      { id: 3, mapId: 2, waypoints: [], startSoundId: 202, endSoundId: 999 },
      { id: 4, mapId: 2, waypoints: [], startSoundId: 203, endSoundId: 204 }
    ];
    const result = checkRouteTopology(2, [201, 205, 202, 203, 204], paths);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain(
      'references sound 999 outside map 2'
    );
  });

  it('rejects a path that belongs to another map', () => {
    const paths = [
      { id: 1, mapId: 2, waypoints: [], startSoundId: 201, endSoundId: 205 },
      { id: 2, mapId: 1, waypoints: [], startSoundId: 205, endSoundId: 202 },
      { id: 3, mapId: 2, waypoints: [], startSoundId: 202, endSoundId: 203 },
      { id: 4, mapId: 2, waypoints: [], startSoundId: 203, endSoundId: 204 }
    ];
    const result = checkRouteTopology(2, [201, 205, 202, 203, 204], paths);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('belongs to map 1');
  });

  it('rejects a route with a non-degree-2 internal node', () => {
    const paths = [
      { id: 1, mapId: 2, waypoints: [], startSoundId: 201, endSoundId: 205 },
      { id: 2, mapId: 2, waypoints: [], startSoundId: 205, endSoundId: 202 },
      { id: 3, mapId: 2, waypoints: [], startSoundId: 205, endSoundId: 203 },
      { id: 4, mapId: 2, waypoints: [], startSoundId: 203, endSoundId: 204 }
    ];
    const result = checkRouteTopology(2, [201, 205, 202, 203, 204], paths);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('degree');
  });
});

describe('checkWaypointInvariants — finite geometry points', () => {
  it('accepts finite in-range waypoints', () => {
    const path: Path = {
      id: 1,
      mapId: 2,
      waypoints: [{ x: 50, y: 50 }],
      startSoundId: 201,
      endSoundId: 202
    };
    expect(() => checkWaypointInvariants(path)).not.toThrow();
  });

  it('rejects a non-finite waypoint x', () => {
    const path: Path = {
      id: 1,
      mapId: 2,
      waypoints: [{ x: Infinity, y: 50 }],
      startSoundId: 201,
      endSoundId: 202
    };
    expect(() => checkWaypointInvariants(path)).toThrow(
      'Waypoint coordinates must be finite'
    );
  });

  it('rejects a non-finite waypoint y', () => {
    const path: Path = {
      id: 1,
      mapId: 2,
      waypoints: [{ x: 50, y: NaN }],
      startSoundId: 201,
      endSoundId: 202
    };
    expect(() => checkWaypointInvariants(path)).toThrow(
      'Waypoint coordinates must be finite'
    );
  });

  it('rejects a waypoint outside the percentage range', () => {
    const path: Path = {
      id: 1,
      mapId: 2,
      waypoints: [{ x: 150, y: 50 }],
      startSoundId: 201,
      endSoundId: 202
    };
    expect(() => checkWaypointInvariants(path)).toThrow(
      'Waypoint must be within 0–100'
    );
  });

  it('accepts an empty waypoint list', () => {
    const path: Path = {
      id: 1,
      mapId: 2,
      waypoints: [],
      startSoundId: 201,
      endSoundId: 202
    };
    expect(() => checkWaypointInvariants(path)).not.toThrow();
  });
});
