# Spec: Path Engine

> Delta for 05-paths-home — Path Visual States & View Transitions

## ADDED Requirements

### Requirement: buildPolylineD

The module MUST export a pure function `buildPolylineD(points, width, height)` that converts percentage-based point coordinates to an SVG path `d` string using straight line segments (`M`/`L` commands).

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Two points | `[{x:0,y:0},{x:100,y:100}]` with w=800, h=600 | called | returns `"M 0 0 L 800 600"` |
| Single point | `[{x:50,y:50}]` | called | returns `""` (empty string) |
| Zero points | `[]` | called | returns `""` (empty string) |
| N points | 5 points in sequence | called | returns correct `M L L L L` string with all points |
| Percentage conversion | point `{x:12.5,y:25}` with w=800, h=600 | called | pixel values are `100, 150` |
| Deterministic output | same points array twice | called | identical `d` string both times |

### Requirement: reversePoints

The module MUST export a pure function `reversePoints(points)` that returns a NEW reversed copy of the points array without mutating the original.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Reverse | `[{x:0,y:0},{x:100,y:100}]` | `reversePoints()` called | returns `[{x:100,y:100},{x:0,y:0}]` |
| Immutability | original array of 3 points | after reverse | original array unchanged |
| Empty | `[]` | called | returns `[]` |

### Requirement: Zero Framework Dependencies

The pathEngine module MUST have zero imports from React, Leaflet, or any UI framework. It MUST be a standalone pure TypeScript module.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| No framework imports | source file | inspected | no `import from 'react'`, `'leaflet'`, or framework packages |
| Pure types | source | compiled | only uses Point type from domain, no JSX |
