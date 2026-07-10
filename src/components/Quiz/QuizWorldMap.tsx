// Tap-board for continent/country quiz questions — a clean 2D world map.
// When the child misses and the engine hints/reveals, the map flies to the
// target region so even a tiny country is impossible to miss.

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { geoCentroid, geoBounds } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import { CONTINENTS } from "../../data/continents";
import { getContinentId } from "../../data/continentMapping";
import { COUNTRY_BY_ID, getCountryColor } from "../../data/countries";

const GEO_URL = "/countries-110m.json";

const CONTINENT_COLOR: Record<string, string> = Object.fromEntries(
  CONTINENTS.map((c) => [c.id, c.color])
);

// hand-tuned "fly here" views for whole continents (mercator-friendly)
const CONTINENT_VIEW: Record<string, { center: [number, number]; zoom: number }> = {
  africa:          { center: [18, 4], zoom: 1.9 },
  asia:            { center: [88, 38], zoom: 1.6 },
  europe:          { center: [16, 52], zoom: 2.6 },
  "north-america": { center: [-98, 44], zoom: 1.6 },
  "south-america": { center: [-60, -18], zoom: 1.9 },
  australia:       { center: [136, -25], zoom: 2.3 },
  antarctica:      { center: [0, -68], zoom: 1.3 },
};

const HOME_VIEW = { center: [0, 25] as [number, number], zoom: 1 };

interface QuizWorldMapProps {
  kind: "continents" | "countries";
  /** When set, this region pulses as a hint/reveal — and the map flies to it. */
  hintId: string | null;
  onTap: (id: string) => void;
}

interface GeoShape {
  id?: string | number;
  rsmKey: string;
}

function QuizWorldMapImpl({ kind, hintId, onTap }: QuizWorldMapProps) {
  const [view, setView] = useState(HOME_VIEW);
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  // centroid + angular span per country, captured from the loaded geographies
  const geoInfoRef = useRef(new Map<string, { center: [number, number]; span: number }>());
  const animRef = useRef(0);

  const fillFor = useCallback(
    (geoId: string): string => {
      if (kind === "continents") {
        const cid = getContinentId(geoId);
        return CONTINENT_COLOR[cid] ?? "#d1d5db";
      }
      const country = COUNTRY_BY_ID.get(geoId);
      if (!country) return "#e2e8f0";
      return getCountryColor(country.continentId);
    },
    [kind]
  );

  const isHinted = useCallback(
    (geoId: string): boolean => {
      if (!hintId) return false;
      if (kind === "continents") return getContinentId(geoId) === hintId;
      return geoId === hintId;
    },
    [kind, hintId]
  );

  // fly to the hinted region (or back home) with a smooth ease
  useEffect(() => {
    let target = HOME_VIEW;
    if (hintId) {
      if (kind === "continents") {
        target = CONTINENT_VIEW[hintId] ?? HOME_VIEW;
      } else {
        const info = geoInfoRef.current.get(hintId);
        if (info) {
          const zoom = Math.min(9, Math.max(2.2, 30 / Math.max(3.5, info.span)));
          target = { center: info.center, zoom };
        }
      }
    }
    cancelAnimationFrame(animRef.current);
    const from = { center: [...viewRef.current.center] as [number, number], zoom: viewRef.current.zoom };
    // shortest longitudinal path (avoid spinning the long way around)
    let dLng = target.center[0] - from.center[0];
    if (dLng > 180) dLng -= 360;
    if (dLng < -180) dLng += 360;
    const t0 = performance.now();
    const DUR = 750;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / DUR);
      const e = k * k * (3 - 2 * k); // smoothstep
      setView({
        center: [from.center[0] + dLng * e, from.center[1] + (target.center[1] - from.center[1]) * e],
        zoom: from.zoom + (target.zoom - from.zoom) * e,
      });
      if (k < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [hintId, kind]);

  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{ scale: 125, center: [0, 25] }}
      style={{ width: "100%", height: "100%" }}
    >
      <ZoomableGroup
        center={view.center}
        zoom={view.zoom}
        minZoom={1}
        maxZoom={12}
        onMoveEnd={({ coordinates, zoom }: { coordinates: [number, number]; zoom: number }) => {
          setView({ center: coordinates, zoom });
        }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }: { geographies: GeoShape[] }) =>
            geographies.map((geo) => {
              const geoId = String(geo.id ?? "");
              if (!geoInfoRef.current.has(geoId)) {
                try {
                  const gobj = geo as unknown as GeoPermissibleObjects;
                  const c = geoCentroid(gobj) as [number, number];
                  const [[minLng, minLat], [maxLng, maxLat]] = geoBounds(gobj);
                  const lngSpan = minLng <= maxLng ? maxLng - minLng : 360 - (minLng - maxLng);
                  geoInfoRef.current.set(geoId, {
                    center: c,
                    span: Math.max(lngSpan, maxLat - minLat),
                  });
                } catch { /* ignore odd geometries */ }
              }
              const clickable =
                kind === "continents" ? !!CONTINENT_COLOR[getContinentId(geoId)] : COUNTRY_BY_ID.has(geoId);
              const fill = fillFor(geoId);
              const hinted = isHinted(geoId);

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  data-geo-id={geoId}
                  onClick={
                    clickable
                      ? () => {
                          const id = kind === "continents" ? getContinentId(geoId) : geoId;
                          onTap(id);
                        }
                      : undefined
                  }
                  style={{
                    default: {
                      fill,
                      stroke: hinted ? "#ffe95e" : "#ffffff",
                      strokeWidth: hinted ? 1.4 : 0.5,
                      outline: "none",
                      cursor: clickable ? "pointer" : "default",
                      animation: hinted ? "quizPulse 0.75s ease-in-out infinite" : undefined,
                    },
                    hover: {
                      fill,
                      stroke: "#ffffff",
                      strokeWidth: 1,
                      outline: "none",
                      filter: clickable ? "brightness(1.15)" : undefined,
                    },
                    pressed: { fill, outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ZoomableGroup>
    </ComposableMap>
  );
}

export default memo(QuizWorldMapImpl);
