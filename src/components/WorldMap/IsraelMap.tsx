import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import {
  ISRAEL_CITIES,
  ISRAEL_CITIES_BY_ID,
  ISRAEL_PLACES,
  ISRAEL_PLACE_BY_ID,
  ISRAEL_DISTRICTS,
  DISTRICT_BY_ID,
  TOTAL_ISRAEL_CITIES,
  TOTAL_ISRAEL_PLACES,
  TOTAL_ISRAEL_SITES,
} from "../../data/israelCities";
import NameRevealBubble from "./NameRevealBubble";
import ConfettiEffect from "../Overlays/ConfettiEffect";
import MilestoneModal from "../Overlays/MilestoneModal";

const GEO_URL = "/israel-districts.json";

interface DistrictFeature {
  properties?: { iso_3166_2?: string };
}

interface DistrictCollection {
  features: DistrictFeature[];
}

// A tap selects the city visually closest to the finger, within this screen
// radius (grows a bit when zoomed out so small clusters stay tappable).
const TAP_RADIUS_PX = 42;

const zoomBtnStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: "50%",
  border: "none",
  background: "rgba(255,255,255,0.92)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  fontSize: 24,
  fontWeight: 800,
  color: "#1a365d",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "Heebo, sans-serif",
};

interface Props {
  discoveredSet: Set<string>;
  onDiscover: (id: string) => boolean;
  speakHebrew: (text: string) => void;
  playSfx?: (name: "pop" | "chime") => void;
}

export default function IsraelMap({ discoveredSet, onDiscover, speakHebrew, playSfx }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 400, h: 700 });
  const [geoData, setGeoData] = useState<DistrictCollection | null>(null);

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const activePointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{
    dist: number; scale: number; pan: { x: number; y: number }; midX: number; midY: number;
  } | null>(null);
  const totalMovement = useRef(0);

  const [activeBubble, setActiveBubble] = useState<{
    name: string;
    subName?: string;
    color: string;
  } | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [confettiOrigin, setConfettiOrigin] = useState({ x: 0.5, y: 0.5 });
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [milestoneMessage, setMilestoneMessage] = useState("");
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setSize({ w: el.clientWidth, h: el.clientHeight })
    );
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    fetch(GEO_URL).then((r) => r.json()).then(setGeoData);
  }, []);

  const projection = useMemo(() => {
    if (!geoData) return null;
    return geoMercator().fitSize([size.w, size.h], geoData as unknown as GeoPermissibleObjects);
  }, [geoData, size]);

  // For each city, project its coordinates to screen pixels
  const cityPoints = useMemo(() => {
    if (!projection) return new Map<string, [number, number]>();
    const map = new Map<string, [number, number]>();
    for (const city of ISRAEL_CITIES) {
      const pt = projection(city.coordinates);
      if (pt) map.set(city.id, pt as [number, number]);
    }
    return map;
  }, [projection]);

  // ...and the special attraction pins
  const placePoints = useMemo(() => {
    if (!projection) return new Map<string, [number, number]>();
    const map = new Map<string, [number, number]>();
    for (const place of ISRAEL_PLACES) {
      const pt = projection(place.coordinates);
      if (pt) map.set(place.id, pt as [number, number]);
    }
    return map;
  }, [projection]);

  // Group cities by district
  const citiesByDistrict = useMemo(() => {
    const map = new Map<string, typeof ISRAEL_CITIES>();
    for (const d of ISRAEL_DISTRICTS) map.set(d.id, []);
    for (const city of ISRAEL_CITIES) {
      map.get(city.districtId)?.push(city);
    }
    return map;
  }, []);

  // Milestone checks shared by cities and places.
  const checkMilestones = useCallback(
    (justDiscoveredCity: boolean) => {
      const cityCount = ISRAEL_CITIES.filter((c) => discoveredSet.has(c.id)).length + (justDiscoveredCity ? 1 : 0);
      if (discoveredSet.size + 1 === TOTAL_ISRAEL_SITES) {
        setTimeout(() => {
          setMilestoneMessage("גילית את כל ערי ישראל וכל האתרים המיוחדים! 🇮🇱🏆");
          setMilestoneOpen(true);
        }, 1500);
      } else if (justDiscoveredCity && cityCount === TOTAL_ISRAEL_CITIES) {
        setTimeout(() => {
          setMilestoneMessage("גילית את כל ערי ישראל! 🇮🇱✨");
          setMilestoneOpen(true);
        }, 1500);
      }
    },
    [discoveredSet]
  );

  // Shared discovery trigger for a chosen city.
  const discoverCity = useCallback(
    (cityId: string, event: React.MouseEvent) => {
      const city = ISRAEL_CITIES_BY_ID.get(cityId);
      if (!city) return;
      const district = DISTRICT_BY_ID.get(city.districtId);
      const color = district?.color ?? "#3b82f6";

      playSfx?.("pop");
      setActiveBubble({
        name: city.emoji ? `${city.emoji} ${city.nameHebrew}` : city.nameHebrew,
        subName: district?.nameHebrew,
        color,
      });
      setConfettiOrigin({
        x: event.clientX / window.innerWidth,
        y: event.clientY / window.innerHeight,
      });

      const isNew = onDiscover(cityId);
      if (isNew) {
        setConfettiTrigger((p) => p + 1);
        playSfx?.("chime");
      }
      // first discovery of a city with a fun fact → hear the fact too
      speakHebrew(isNew && city.factHebrew ? `${city.nameHebrew}. ${city.factHebrew}` : city.nameHebrew);

      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => setActiveBubble(null), 2800);

      if (isNew) checkMilestones(true);
    },
    [onDiscover, speakHebrew, playSfx, checkMilestones]
  );

  // Discovery trigger for a special attraction (golden star pin).
  const discoverPlace = useCallback(
    (placeId: string, event: React.MouseEvent) => {
      const place = ISRAEL_PLACE_BY_ID.get(placeId);
      if (!place) return;

      playSfx?.("pop");
      setActiveBubble({
        name: `${place.emoji} ${place.nameHebrew}`,
        subName: "אתר מיוחד",
        color: "#d97706",
      });
      setConfettiOrigin({
        x: event.clientX / window.innerWidth,
        y: event.clientY / window.innerHeight,
      });

      const isNew = onDiscover(placeId);
      if (isNew) {
        setConfettiTrigger((p) => p + 1);
        playSfx?.("chime");
      }
      speakHebrew(isNew ? `${place.nameHebrew}. ${place.factHebrew}` : place.nameHebrew);

      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => setActiveBubble(null), 3600);

      if (isNew) checkMilestones(false);
    },
    [onDiscover, speakHebrew, playSfx, checkMilestones]
  );

  /**
   * Improved city detection: a tap picks the city visually closest to the
   * finger (screen-space, zoom-aware). Only if no city is near enough does the
   * tap fall back to "nearest undiscovered city in the tapped district".
   */
  const handleDistrictClick = useCallback(
    (districtId: string, clickX: number, clickY: number, event: React.MouseEvent) => {
      const toScreen = (pt: [number, number]): [number, number] => [
        pt[0] * scale + pan.x,
        pt[1] * scale + pan.y,
      ];

      // 1) Nearest city or attraction anywhere within the tap radius wins.
      let nearestAny: { id: string; kind: "city" | "place"; dist: number } | null = null;
      for (const c of ISRAEL_CITIES) {
        const pt = cityPoints.get(c.id);
        if (!pt) continue;
        const [tx, ty] = toScreen(pt);
        const dist = Math.hypot(clickX - tx, clickY - ty);
        if (!nearestAny || dist < nearestAny.dist) nearestAny = { id: c.id, kind: "city", dist };
      }
      for (const p of ISRAEL_PLACES) {
        const pt = placePoints.get(p.id);
        if (!pt) continue;
        const [tx, ty] = toScreen(pt);
        const dist = Math.hypot(clickX - tx, clickY - ty);
        if (!nearestAny || dist < nearestAny.dist) nearestAny = { id: p.id, kind: "place", dist };
      }
      const radius = TAP_RADIUS_PX * (scale < 1.5 ? 1.15 : 1); // a bit more forgiving when zoomed out
      if (nearestAny && nearestAny.dist <= radius) {
        if (nearestAny.kind === "place") discoverPlace(nearestAny.id, event);
        else discoverCity(nearestAny.id, event);
        return;
      }

      // 2) Fallback: nearest undiscovered city in this district.
      const cities = citiesByDistrict.get(districtId) ?? [];
      const undiscovered = cities.filter((c) => !discoveredSet.has(c.id));
      const pool = undiscovered.length > 0 ? undiscovered : cities;

      let nearest: (typeof pool)[number] | null = null;
      let minDist = Infinity;
      for (const c of pool) {
        const pt = cityPoints.get(c.id);
        if (!pt) continue;
        const [tx, ty] = toScreen(pt);
        const dist = Math.hypot(clickX - tx, clickY - ty);
        if (dist < minDist) {
          minDist = dist;
          nearest = c;
        }
      }
      if (nearest) discoverCity(nearest.id, event);
    },
    [citiesByDistrict, cityPoints, placePoints, discoveredSet, scale, pan, discoverCity, discoverPlace]
  );

  // Direct city click (dot)
  const handleCityClick = useCallback(
    (cityId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      discoverCity(cityId, event);
    },
    [discoverCity]
  );

  const dismissBubble = useCallback(() => {
    setActiveBubble(null);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  }, []);

  const getSVGPoint = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    return { x: rect ? clientX - rect.left : clientX, y: rect ? clientY - rect.top : clientY };
  };

  // Pan + pinch-to-zoom
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    svgRef.current?.setPointerCapture(e.pointerId);
    const pt = getSVGPoint(e.clientX, e.clientY);
    activePointers.current.set(e.pointerId, pt);

    if (activePointers.current.size === 1) {
      totalMovement.current = 0;
      isPanning.current = true;
      lastPan.current = pt;
      pinchStart.current = null;
    } else if (activePointers.current.size === 2) {
      isPanning.current = false;
      const pts = Array.from(activePointers.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      pinchStart.current = {
        dist,
        scale: scaleRef.current,
        pan: { ...panRef.current },
        midX: (pts[0].x + pts[1].x) / 2,
        midY: (pts[0].y + pts[1].y) / 2,
      };
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const pt = getSVGPoint(e.clientX, e.clientY);
    const prev = activePointers.current.get(e.pointerId);
    if (prev) totalMovement.current += Math.hypot(pt.x - prev.x, pt.y - prev.y);
    activePointers.current.set(e.pointerId, pt);

    if (activePointers.current.size >= 2 && pinchStart.current) {
      const pts = Array.from(activePointers.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const curMidX = (pts[0].x + pts[1].x) / 2;
      const curMidY = (pts[0].y + pts[1].y) / 2;
      const { dist: d0, scale: s0, pan: p0, midX: mx0, midY: my0 } = pinchStart.current;
      const newScale = Math.max(1, Math.min(12, s0 * (dist / d0)));
      const factor = newScale / s0;
      const newPan = {
        x: curMidX + (p0.x - mx0) * factor,
        y: curMidY + (p0.y - my0) * factor,
      };
      scaleRef.current = newScale;
      panRef.current = newPan;
      setScale(newScale);
      setPan(newPan);
    } else if (isPanning.current && activePointers.current.size === 1) {
      const dx = pt.x - lastPan.current.x;
      const dy = pt.y - lastPan.current.y;
      lastPan.current = pt;
      const newPan = { x: panRef.current.x + dx, y: panRef.current.y + dy };
      panRef.current = newPan;
      setPan(newPan);
    }
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) pinchStart.current = null;
    if (activePointers.current.size === 1) {
      const pts = Array.from(activePointers.current.values());
      lastPan.current = pts[0];
      isPanning.current = true;
    } else if (activePointers.current.size === 0) {
      isPanning.current = false;
    }
  }, []);

  const onPointerCancel = useCallback((e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size === 0) {
      isPanning.current = false;
      pinchStart.current = null;
    }
  }, []);

  const zoomIn = useCallback(() => {
    const cx = size.w / 2;
    const cy = size.h / 2;
    const newScale = Math.min(scaleRef.current * 1.4, 12);
    const factor = newScale / scaleRef.current;
    const newPan = { x: cx + (panRef.current.x - cx) * factor, y: cy + (panRef.current.y - cy) * factor };
    scaleRef.current = newScale;
    panRef.current = newPan;
    setScale(newScale);
    setPan(newPan);
  }, [size.w, size.h]);

  const zoomOut = useCallback(() => {
    const cx = size.w / 2;
    const cy = size.h / 2;
    const newScale = scaleRef.current / 1.4;
    if (newScale <= 1) {
      scaleRef.current = 1; panRef.current = { x: 0, y: 0 };
      setScale(1); setPan({ x: 0, y: 0 });
      return;
    }
    const factor = newScale / scaleRef.current;
    const newPan = { x: cx + (panRef.current.x - cx) * factor, y: cy + (panRef.current.y - cy) * factor };
    scaleRef.current = newScale;
    panRef.current = newPan;
    setScale(newScale);
    setPan(newPan);
  }, [size.w, size.h]);

  const resetView = useCallback(() => {
    scaleRef.current = 1; panRef.current = { x: 0, y: 0 };
    setScale(1); setPan({ x: 0, y: 0 });
  }, []);

  const transform = `translate(${pan.x},${pan.y}) scale(${scale})`;
  const totalDiscovered = ISRAEL_CITIES.filter((c) => discoveredSet.has(c.id)).length;
  const placesDiscovered = ISRAEL_PLACES.filter((p) => discoveredSet.has(p.id)).length;
  const pathGen = projection ? geoPath(projection) : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      style={{ minHeight: "400px", touchAction: "none", background: "#bfdbfe" }}
    >
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        style={{ display: "block", cursor: "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <g transform={transform}>
          {/* District polygons — colored, clickable */}
          {geoData && pathGen && geoData.features.map((feature, i) => {
            const distId: string = feature.properties?.iso_3166_2 ?? "";
            const district = DISTRICT_BY_ID.get(distId);
            if (!district) return null;

            const cities = citiesByDistrict.get(distId) ?? [];
            const allDone = cities.length > 0 && cities.every((c) => discoveredSet.has(c.id));
            const anyDone = cities.some((c) => discoveredSet.has(c.id));

            const fill = allDone
              ? district.color
              : anyDone
              ? district.color + "bb"
              : district.color + "66";

            const centroid = allDone ? pathGen.centroid(feature as GeoPermissibleObjects) : null;

            return (
              <g key={distId || i}>
                <path
                  d={pathGen(feature as GeoPermissibleObjects) ?? ""}
                  fill={fill}
                  stroke="#ffffff"
                  strokeWidth={2 / scale}
                  style={{ cursor: "pointer", transition: "fill 0.25s ease" }}
                  onClick={(e) => {
                    if (totalMovement.current > 8) return;
                    const rect = svgRef.current!.getBoundingClientRect();
                    handleDistrictClick(distId, e.clientX - rect.left, e.clientY - rect.top, e);
                  }}
                />
                {/* District complete badge */}
                {centroid && Number.isFinite(centroid[0]) && (
                  <text
                    x={centroid[0]}
                    y={centroid[1]}
                    textAnchor="middle"
                    style={{ fontSize: 26 / scale, pointerEvents: "none" }}
                  >
                    ✅
                  </text>
                )}
              </g>
            );
          })}

          {/* City dots + labels */}
          {geoData && pathGen && ISRAEL_CITIES.map((city) => {
            const pt = cityPoints.get(city.id);
            if (!pt) return null;
            const isFound = discoveredSet.has(city.id);
            const district = DISTRICT_BY_ID.get(city.districtId);
            const color = district?.color ?? "#3b82f6";
            const r = 4.5 / scale;
            const fs = 11 / scale;

            return (
              <g key={city.id} onClick={(e) => { if (totalMovement.current > 8) return; handleCityClick(city.id, e); }} style={{ cursor: "pointer" }}>
                {/* Dot */}
                <circle
                  cx={pt[0]}
                  cy={pt[1]}
                  r={r}
                  fill={isFound ? color : "#fff"}
                  stroke={isFound ? "#fff" : color}
                  strokeWidth={1.5 / scale}
                  style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
                />
                {/* Label */}
                <text
                  x={pt[0]}
                  y={pt[1] - 8 / scale}
                  textAnchor="middle"
                  style={{
                    fontSize: `${fs}px`,
                    fontFamily: "Heebo, sans-serif",
                    fontWeight: 800,
                    fill: isFound ? "#1e3a5f" : "#374151",
                    filter:
                      "drop-shadow(0 0 2px rgba(255,255,255,1)) drop-shadow(0 0 3px rgba(255,255,255,1))",
                    pointerEvents: "none",
                  }}
                >
                  {isFound ? `⭐ ${city.nameHebrew}` : "❓"}
                </text>
              </g>
            );
          })}

          {/* Special attractions — golden star pins */}
          {geoData && pathGen && ISRAEL_PLACES.map((place) => {
            const pt = placePoints.get(place.id);
            if (!pt) return null;
            const isFound = discoveredSet.has(place.id);
            const r = 7 / scale;
            const fs = 11 / scale;

            return (
              <g
                key={place.id}
                data-testid={`israel-place-${place.id}`}
                onClick={(e) => {
                  if (totalMovement.current > 8) return;
                  e.stopPropagation();
                  discoverPlace(place.id, e);
                }}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={pt[0]}
                  cy={pt[1]}
                  r={r}
                  fill={isFound ? "#f59e0b" : "#fffbeb"}
                  stroke="#d97706"
                  strokeWidth={2 / scale}
                  style={{ filter: "drop-shadow(0 1px 3px rgba(180,83,9,0.55))" }}
                />
                <text
                  x={pt[0]}
                  y={pt[1] + 3.4 / scale}
                  textAnchor="middle"
                  style={{ fontSize: `${9 / scale}px`, pointerEvents: "none" }}
                >
                  {isFound ? place.emoji : "⭐"}
                </text>
                <text
                  x={pt[0]}
                  y={pt[1] - 10 / scale}
                  textAnchor="middle"
                  style={{
                    fontSize: `${fs}px`,
                    fontFamily: "Heebo, sans-serif",
                    fontWeight: 800,
                    fill: "#92400e",
                    filter:
                      "drop-shadow(0 0 2px rgba(255,255,255,1)) drop-shadow(0 0 3px rgba(255,255,255,1))",
                    pointerEvents: "none",
                  }}
                >
                  {isFound ? place.nameHebrew : "❓"}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Progress badge */}
      <div
        style={{
          position: "absolute", top: 70, left: "50%", transform: "translateX(-50%)",
          zIndex: 20, background: "rgba(255,255,255,0.92)", borderRadius: 12,
          padding: "6px 18px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          fontFamily: "Heebo, sans-serif", fontWeight: 700, fontSize: 15,
          color: "#1a365d", direction: "rtl", whiteSpace: "nowrap",
        }}
      >
        🇮🇱 ערי ישראל: {totalDiscovered} / {TOTAL_ISRAEL_CITIES}
        <span style={{ color: "#b45309", marginRight: 8 }}>
          ⭐ אתרים: {placesDiscovered} / {TOTAL_ISRAEL_PLACES}
        </span>
      </div>

      {/* Zoom controls */}
      <div style={{ position: "absolute", bottom: 20, left: 20, display: "flex", flexDirection: "column", gap: 8, zIndex: 20 }}>
        <button onClick={zoomIn} style={zoomBtnStyle}>+</button>
        <button onClick={zoomOut} style={zoomBtnStyle}>−</button>
        {(scale > 1.05 || Math.abs(pan.x) > 5 || Math.abs(pan.y) > 5) && (
          <button onClick={resetView} style={{ ...zoomBtnStyle, fontSize: 18 }}>🔄</button>
        )}
      </div>

      <NameRevealBubble
        name={activeBubble?.name ?? null}
        subName={activeBubble?.subName}
        color={activeBubble?.color ?? "#3b82f6"}
        position={null}
        onDismiss={dismissBubble}
      />
      <ConfettiEffect trigger={confettiTrigger} originX={confettiOrigin.x} originY={confettiOrigin.y} />
      <MilestoneModal isOpen={milestoneOpen} onClose={() => setMilestoneOpen(false)} message={milestoneMessage} />
    </div>
  );
}
