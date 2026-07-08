// Shared, cached loader for the bundled world TopoJSON (offline asset).

import type { Topology } from "topojson-specification";

let topoPromise: Promise<Topology> | null = null;

export function loadWorldTopo(): Promise<Topology> {
  topoPromise ??= fetch("/countries-110m.json").then((r) => r.json());
  return topoPromise;
}
