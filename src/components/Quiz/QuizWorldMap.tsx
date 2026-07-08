// Tap-board for continent/country quiz questions — a clean 2D world map.

import { memo, useCallback } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { CONTINENTS } from "../../data/continents";
import { getContinentId } from "../../data/continentMapping";
import { COUNTRY_BY_ID, getCountryColor } from "../../data/countries";

const GEO_URL = "/countries-110m.json";

const CONTINENT_COLOR: Record<string, string> = Object.fromEntries(
  CONTINENTS.map((c) => [c.id, c.color])
);

interface QuizWorldMapProps {
  kind: "continents" | "countries";
  /** When set, this region pulses as a hint/reveal. */
  hintId: string | null;
  onTap: (id: string) => void;
}

interface GeoShape {
  id?: string | number;
  rsmKey: string;
}

function QuizWorldMapImpl({ kind, hintId, onTap }: QuizWorldMapProps) {
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

  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{ scale: 125, center: [0, 25] }}
      style={{ width: "100%", height: "100%" }}
    >
      <ZoomableGroup center={[0, 25]} zoom={1} minZoom={1} maxZoom={12}>
        <Geographies geography={GEO_URL}>
          {({ geographies }: { geographies: GeoShape[] }) =>
            geographies.map((geo) => {
              const geoId = String(geo.id ?? "");
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
                      stroke: "#ffffff",
                      strokeWidth: 0.5,
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
