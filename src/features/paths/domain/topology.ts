import type { Path } from './types'

export interface RouteTopologyResult {
  valid: boolean
  errors: string[]
}

/**
 * Validates that the paths of a single map form a connected linear route.
 *
 * A linear route over N marks must satisfy:
 *  - exactly N-1 paths (one semantic edge between two marks each)
 *  - every mark participates in at least one path
 *  - path endpoints belong to the same map
 *  - no self-connections
 *  - no duplicate undirected edges
 *  - the graph is connected
 *  - the graph is acyclic
 *  - exactly two degree-1 endpoints and all internal nodes have degree 2
 */
export function checkRouteTopology(
  mapId: number,
  markIds: readonly number[],
  paths: readonly Path[]
): RouteTopologyResult {
  const errors: string[] = []
  const markSet = new Set(markIds)

  const count = paths.length
  const expected = markIds.length - 1
  if (count !== expected) {
    errors.push(`Map ${mapId} has ${count} paths but ${markIds.length} marks; expected exactly ${expected} (N-1)`)
  }

  const adjacency = new Map<number, Set<number>>()
  const undirectedEdges = new Set<string>()

  for (const path of paths) {
    if (path.mapId !== mapId) {
      errors.push(`Path ${path.id} belongs to map ${path.mapId}, not ${mapId}`)
    }
    if (path.startMarkId === path.endMarkId) {
      errors.push(`Path ${path.id} must connect to two different marks (self-connection)`)
    }
    for (const markId of [path.startMarkId, path.endMarkId]) {
      if (!markSet.has(markId)) {
        errors.push(`Path ${path.id} references mark ${markId} outside map ${mapId}`)
      }
    }

    const edgeKey = [path.startMarkId, path.endMarkId].sort((a, b) => a - b).join(':')
    if (undirectedEdges.has(edgeKey)) {
      errors.push(`Duplicate undirected edge ${path.startMarkId}-${path.endMarkId}`)
    }
    undirectedEdges.add(edgeKey)

    if (!adjacency.has(path.startMarkId)) {
      adjacency.set(path.startMarkId, new Set())
    }
    if (!adjacency.has(path.endMarkId)) {
      adjacency.set(path.endMarkId, new Set())
    }
    adjacency.get(path.startMarkId)!.add(path.endMarkId)
    adjacency.get(path.endMarkId)!.add(path.startMarkId)
  }

  for (const markId of markIds) {
    if (!adjacency.has(markId)) {
      errors.push(`Mark ${markId} has no path in map ${mapId}`)
    }
  }

  const degree1 = markIds.filter((id) => (adjacency.get(id)?.size ?? 0) === 1)
  const degree2 = markIds.filter((id) => (adjacency.get(id)?.size ?? 0) === 2)
  const invalidDegree = markIds.filter((id) => {
    const degree = adjacency.get(id)?.size ?? 0
    return degree !== 1 && degree !== 2
  })

  if (degree1.length !== 2) {
    errors.push(`Map ${mapId} route must have exactly 2 endpoints (degree 1); found ${degree1.length}`)
  }
  if (degree2.length !== markIds.length - 2) {
    errors.push(`Map ${mapId} route must have ${markIds.length - 2} internal nodes (degree 2); found ${degree2.length}`)
  }
  for (const markId of invalidDegree) {
    errors.push(`Mark ${markId} has invalid degree ${adjacency.get(markId)?.size}`)
  }

  if (markIds.length > 0) {
    const visited = new Set<number>()
    const stack = [markIds[0]]
    while (stack.length > 0) {
      const current = stack.pop()!
      if (visited.has(current)) continue
      visited.add(current)
      for (const neighbor of adjacency.get(current) ?? []) {
        stack.push(neighbor)
      }
    }
    if (visited.size !== markIds.length) {
      errors.push(`Map ${mapId} route is not connected`)
    }
  }

  const hasCycle = detectCycle(adjacency)
  if (hasCycle) {
    errors.push(`Map ${mapId} route contains a cycle`)
  }

  return { valid: errors.length === 0, errors }
}

function detectCycle(adjacency: Map<number, Set<number>>): boolean {
  const visited = new Set<number>()
  const inStack = new Set<number>()

  const dfs = (node: number, parent: number): boolean => {
    visited.add(node)
    inStack.add(node)
    for (const neighbor of adjacency.get(node) ?? []) {
      if (neighbor === parent) continue
      if (inStack.has(neighbor)) return true
      if (!visited.has(neighbor) && dfs(neighbor, node)) return true
    }
    inStack.delete(node)
    return false
  }

  for (const node of adjacency.keys()) {
    if (!visited.has(node) && dfs(node, -1)) {
      return true
    }
  }
  return false
}
