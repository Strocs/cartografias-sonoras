import type { Path } from './types';

export interface RouteTopologyResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates that the paths of a single map form a connected linear route.
 *
 * A linear route over N sound markers must satisfy:
 *  - exactly N-1 paths (one semantic edge between two markers each)
 *  - every sound marker participates in at least one path
 *  - path endpoints belong to the same map
 *  - no self-connections
 *  - no duplicate undirected edges
 *  - the graph is connected
 *  - the graph is acyclic
 *  - exactly two degree-1 endpoints and all internal nodes have degree 2
 */
export function checkRouteTopology(
  mapId: number,
  soundIds: readonly number[],
  paths: readonly Path[]
): RouteTopologyResult {
  const errors: string[] = [];
  const soundSet = new Set(soundIds);

  const count = paths.length;
  const expected = soundIds.length - 1;
  if (count !== expected) {
    errors.push(
      `Map ${mapId} has ${count} paths but ${soundIds.length} sounds; expected exactly ${expected} (N-1)`
    );
  }

  const adjacency = new Map<number, Set<number>>();
  const undirectedEdges = new Set<string>();

  for (const path of paths) {
    if (path.mapId !== mapId) {
      errors.push(`Path ${path.id} belongs to map ${path.mapId}, not ${mapId}`);
    }
    if (path.startSoundId === path.endSoundId) {
      errors.push(`Path ${path.id} is a self-connection`);
    }
    for (const soundId of [path.startSoundId, path.endSoundId]) {
      if (!soundSet.has(soundId)) {
        errors.push(
          `Path ${path.id} references sound ${soundId} outside map ${mapId}`
        );
      }
    }

    const edgeKey = [path.startSoundId, path.endSoundId].sort(
      (a, b) => a - b
    ).join(':');
    if (undirectedEdges.has(edgeKey)) {
      errors.push(
        `Duplicate undirected edge ${path.startSoundId}-${path.endSoundId}`
      );
    }
    undirectedEdges.add(edgeKey);

    if (!adjacency.has(path.startSoundId)) {
      adjacency.set(path.startSoundId, new Set());
    }
    if (!adjacency.has(path.endSoundId)) {
      adjacency.set(path.endSoundId, new Set());
    }
    adjacency.get(path.startSoundId)!.add(path.endSoundId);
    adjacency.get(path.endSoundId)!.add(path.startSoundId);
  }

  for (const soundId of soundIds) {
    if (!adjacency.has(soundId)) {
      errors.push(`Sound ${soundId} has no path in map ${mapId}`);
    }
  }

  const degree1 = soundIds.filter(
    (id) => (adjacency.get(id)?.size ?? 0) === 1
  );
  const degree2 = soundIds.filter(
    (id) => (adjacency.get(id)?.size ?? 0) === 2
  );
  const invalidDegree = soundIds.filter((id) => {
    const degree = adjacency.get(id)?.size ?? 0;
    return degree !== 1 && degree !== 2;
  });

  if (degree1.length !== 2) {
    errors.push(
      `Map ${mapId} route must have exactly 2 endpoints (degree 1); found ${degree1.length}`
    );
  }
  if (degree2.length !== soundIds.length - 2) {
    errors.push(
      `Map ${mapId} route must have ${soundIds.length - 2} internal nodes (degree 2); found ${degree2.length}`
    );
  }
  for (const soundId of invalidDegree) {
    errors.push(`Sound ${soundId} has invalid degree ${adjacency.get(soundId)?.size}`);
  }

  if (soundIds.length > 0) {
    const visited = new Set<number>();
    const stack = [soundIds[0]];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        stack.push(neighbor);
      }
    }
    if (visited.size !== soundIds.length) {
      errors.push(`Map ${mapId} route is not connected`);
    }
  }

  const hasCycle = detectCycle(adjacency);
  if (hasCycle) {
    errors.push(`Map ${mapId} route contains a cycle`);
  }

  return { valid: errors.length === 0, errors };
}

function detectCycle(adjacency: Map<number, Set<number>>): boolean {
  const visited = new Set<number>();
  const inStack = new Set<number>();

  const dfs = (node: number, parent: number): boolean => {
    visited.add(node);
    inStack.add(node);
    for (const neighbor of adjacency.get(node) ?? []) {
      if (neighbor === parent) continue;
      if (inStack.has(neighbor)) return true;
      if (!visited.has(neighbor) && dfs(neighbor, node)) return true;
    }
    inStack.delete(node);
    return false;
  };

  for (const node of adjacency.keys()) {
    if (!visited.has(node) && dfs(node, -1)) {
      return true;
    }
  }
  return false;
}
