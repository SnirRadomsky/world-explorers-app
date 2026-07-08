// Tap-board for the Israeli-cities quiz — districts + all city dots labeled.

import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { ISRAEL_CITIES, DISTRICT_BY_ID } from "../../data/israelCities";

const GEO_URL = "/israel-districts.json";

interface DistrictFeature {
  properties?: { iso_3166_2?: string };
}

interface DistrictCollection {
  features: DistrictFeature[];
}

interface QuizIsraelMapProps {
  hintId: string | null;
  onTap: (cityId: string) => void;
}

export default function QuizIsraelMap({ hintId, onTap }: QuizIsraelMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 380, h: 620 });
  const [geoData, setGeoData] = useState<DistrictCollection | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(GEO_URL)
      .then((r) => r.json())
      .then((d: DistrictCollection) => {
        if (!cancelled) setGeoData(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const projection = useMemo(() => {
    if (!geoData) return null;
    return geoMercator().fitSize([size.w, size.h], geoData as unknown as GeoPermissibleObjects);
  }, [geoData, size]);

  const pathGen = projection ? geoPath(projection) : null;

  return (
    <div ref={containerRef} className="w-full h-full" style={{ background: "#bfdbfe" }}>
      {geoData && pathGen && projection && (
        <svg width={size.w} height={size.h} style={{ display: "block" }}>
          {geoData.features.map((feature, i) => {
            const distId = feature.properties?.iso_3166_2 ?? "";
            const district = DISTRICT_BY_ID.get(distId);
            if (!district) return null;
            return (
              <path
                key={distId || i}
                d={pathGen(feature as GeoPermissibleObjects) ?? ""}
                fill={district.color + "77"}
                stroke="#ffffff"
                strokeWidth={2}
              />
            );
          })}

          {ISRAEL_CITIES.map((city) => {
            const pt = projection(city.coordinates);
            if (!pt) return null;
            const district = DISTRICT_BY_ID.get(city.districtId);
            const color = district?.color ?? "#3b82f6";
            const hinted = hintId === city.id;
            return (
              <g
                key={city.id}
                onClick={() => onTap(city.id)}
                style={{ cursor: "pointer" }}
              >
                {hinted && (
                  <circle
                    cx={pt[0]}
                    cy={pt[1]}
                    r={16}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={4}
                    style={{ animation: "quizPulse 0.75s ease-in-out infinite" }}
                  />
                )}
                <circle
                  cx={pt[0]}
                  cy={pt[1]}
                  r={7}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={2}
                  style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
                />
                <text
                  x={pt[0]}
                  y={pt[1] - 11}
                  textAnchor="middle"
                  style={{
                    fontSize: 10.5,
                    fontFamily: "Heebo, sans-serif",
                    fontWeight: 800,
                    fill: "#1e3a5f",
                    filter:
                      "drop-shadow(0 0 2px rgba(255,255,255,1)) drop-shadow(0 0 3px rgba(255,255,255,1))",
                    pointerEvents: "none",
                  }}
                >
                  {city.nameHebrew}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
