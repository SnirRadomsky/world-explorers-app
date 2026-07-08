import { useState, useCallback, useMemo, useRef } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { CONTINENTS } from "../../data/continents";
import { getContinentId } from "../../data/continentMapping";
import { COUNTRIES, COUNTRY_BY_ID, getCountryColor } from "../../data/countries";
import NameRevealBubble from "./NameRevealBubble";
import ConfettiEffect from "../Overlays/ConfettiEffect";
import MilestoneModal from "../Overlays/MilestoneModal";

// Bundled locally so the app is fully offline (no CDN at runtime).
const GEO_URL = "/countries-110m.json";

type GameMode = "continents" | "countries";

interface GeoShape {
  id?: string | number;
  rsmKey: string;
}

// Approximate continent centers for star placement
const CONTINENT_CENTERS: Record<string, [number, number]> = {
  asia:           [80,   35],
  africa:         [20,    5],
  europe:         [15,   52],
  "north-america":[-100, 45],
  "south-america":[-58, -15],
  australia:      [135, -25],
  antarctica:     [0,   -82],
};

// Continent color lookup
const CONTINENT_COLOR: Record<string, string> = Object.fromEntries(
  CONTINENTS.map((c) => [c.id, c.color])
);

// Country center approximations for star placement
const COUNTRY_CENTERS: Record<string, [number, number]> = {
  // North America
  "840": [-100, 38],   // USA
  "124": [-96, 60],    // Canada
  "484": [-102, 23],   // Mexico
  "304": [-42, 72],    // Greenland
  "320": [-90, 15.5],  // Guatemala
  "340": [-86.5, 15],  // Honduras
  "222": [-88.9, 13.8],// El Salvador
  "558": [-85, 13],    // Nicaragua
  "188": [-84, 10],    // Costa Rica
  "591": [-80, 8.5],   // Panama
  "084": [-88.5, 17],  // Belize
  "192": [-79, 21.5],  // Cuba
  "332": [-72.5, 19],  // Haiti
  "214": [-70.5, 19],  // Dominican Republic
  "388": [-77.3, 18],  // Jamaica
  "780": [-61.2, 10.5],// Trinidad and Tobago

  // South America
  "076": [-53, -10],   // Brazil
  "032": [-64, -34],   // Argentina
  "152": [-71, -35],   // Chile
  "604": [-75, -10],   // Peru
  "170": [-74, 4],     // Colombia
  "862": [-66, 8],     // Venezuela
  "218": [-78, -2],    // Ecuador
  "068": [-64, -17],   // Bolivia
  "600": [-58, -23],   // Paraguay
  "858": [-56, -33],   // Uruguay
  "328": [-59, 5],     // Guyana
  "740": [-56, 4],     // Suriname

  // Europe
  "643": [60, 60],     // Russia
  "250": [2, 46],      // France
  "276": [10, 51],     // Germany
  "380": [12, 43],     // Italy
  "724": [-4, 40],     // Spain
  "826": [-2, 54],     // UK
  "804": [32, 49],     // Ukraine
  "616": [20, 52],     // Poland
  "752": [17, 62],     // Sweden
  "578": [10, 64],     // Norway
  "246": [26, 64],     // Finland
  "208": [10, 56],     // Denmark
  "528": [5.3, 52.3],  // Netherlands
  "056": [4.5, 50.5],  // Belgium
  "756": [8, 47],      // Switzerland
  "040": [14, 47],     // Austria
  "300": [22, 39],     // Greece
  "620": [-8, 39],     // Portugal
  "642": [25, 46],     // Romania
  "100": [25, 43],     // Bulgaria
  "203": [15.5, 49.8], // Czech Republic
  "703": [19, 48.7],   // Slovakia
  "348": [19, 47],     // Hungary
  "191": [16, 45.5],   // Croatia
  "070": [17.5, 44],   // Bosnia
  "688": [21, 44],     // Serbia
  "499": [19.4, 42.7], // Montenegro
  "008": [20, 41],     // Albania
  "807": [21.7, 41.6], // North Macedonia
  "112": [28, 53.5],   // Belarus
  "498": [28.5, 47],   // Moldova
  "233": [25, 58.6],   // Estonia
  "428": [25, 57],     // Latvia
  "440": [24, 56],     // Lithuania
  "352": [-18, 65],    // Iceland
  "372": [-8, 53],     // Ireland
  "705": [14.8, 46.1], // Slovenia

  // Middle East
  "376": [35, 31.5],   // Israel
  "275": [35.2, 31.9], // Palestine
  "400": [37, 31],     // Jordan
  "422": [35.8, 33.9], // Lebanon
  "760": [38, 35],     // Syria
  "368": [44, 33],     // Iraq
  "364": [53, 32],     // Iran
  "792": [35, 39],     // Turkey
  "682": [45, 24],     // Saudi Arabia
  "784": [54, 24],     // UAE
  "512": [57, 22],     // Oman
  "887": [48, 16],     // Yemen
  "048": [50.5, 26],   // Bahrain
  "634": [51.2, 25.3], // Qatar
  "414": [47.7, 29.3], // Kuwait
  "004": [67, 33],     // Afghanistan
  "586": [70, 30],     // Pakistan

  // Central Asia
  "398": [67, 48],     // Kazakhstan
  "860": [63, 41],     // Uzbekistan
  "795": [59, 40],     // Turkmenistan
  "762": [71, 39],     // Tajikistan
  "417": [75, 41],     // Kyrgyzstan

  // Far East & South East Asia
  "156": [104, 35],    // China
  "392": [138, 36],    // Japan
  "356": [79, 21],     // India
  "410": [127.5, 36],  // South Korea
  "408": [127, 40],    // North Korea
  "496": [103, 47],    // Mongolia
  "764": [101, 15],    // Thailand
  "704": [108, 16],    // Vietnam
  "116": [105, 12],    // Cambodia
  "418": [103, 18],    // Laos
  "104": [96, 20],     // Myanmar
  "360": [117, -2],    // Indonesia
  "458": [110, 4],     // Malaysia
  "608": [122, 12],    // Philippines
  "050": [90, 24],     // Bangladesh
  "524": [84, 28],     // Nepal
  "144": [81, 8],      // Sri Lanka
  "031": [47.5, 40.5], // Azerbaijan
  "268": [43.5, 42],   // Georgia
  "051": [44.5, 40],   // Armenia
  "158": [121, 24],    // Taiwan

  // Africa
  "818": [30, 27],     // Egypt
  "710": [25, -29],    // South Africa
  "566": [8, 10],      // Nigeria
  "012": [3, 28],      // Algeria
  "504": [-6, 32],     // Morocco
  "788": [9, 34],      // Tunisia
  "434": [17, 27],     // Libya
  "729": [30, 16],     // Sudan
  "728": [30, 7],      // South Sudan
  "231": [40, 9],      // Ethiopia
  "404": [38, 1],      // Kenya
  "800": [32.5, 1.5],  // Uganda
  "834": [35, -6],     // Tanzania
  "508": [35, -18],    // Mozambique
  "450": [47, -20],    // Madagascar
  "180": [24, -4],     // DRC
  "178": [15.5, -1],   // Congo
  "024": [18, -12],    // Angola
  "516": [18, -22],    // Namibia
  "072": [24, -22],    // Botswana
  "716": [30, -20],    // Zimbabwe
  "894": [28, -14],    // Zambia
  "466": [-2, 18],     // Mali
  "562": [9, 17],      // Niger
  "148": [18, 15],     // Chad
  "478": [-11, 20],    // Mauritania
  "288": [-1.5, 8],    // Ghana
  "384": [-6, 7.5],    // Ivory Coast
  "120": [12.5, 6],    // Cameroon
  "706": [46, 6],      // Somalia
  "686": [-14, 14],    // Senegal
  "454": [34.3, -13.5],// Malawi
  "140": [21, 7],      // CAR
  "266": [11.6, -1],   // Gabon
  "854": [-2, 13],     // Burkina Faso
  "324": [-12, 11],    // Guinea
  "232": [39, 15],     // Eritrea
  "646": [30, -2],     // Rwanda
  "108": [29.9, -3.4], // Burundi
  "768": [1.2, 8.7],   // Togo
  "204": [2.3, 9.3],   // Benin
  "430": [-9.5, 6.5],  // Liberia
  "694": [-11.8, 8.5], // Sierra Leone
  "270": [-15.5, 13.4],// Gambia
  "262": [43, 11.8],   // Djibouti

  // Australia/Oceania
  "036": [134, -25],   // Australia
  "554": [172, -42],   // New Zealand
  "598": [145, -6.5],  // Papua New Guinea
  "242": [178, -18],   // Fiji
};

// Zoom button style
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

interface WorldMapProps {
  mode: GameMode;
  discoveredSet: Set<string>;
  onDiscover: (id: string) => boolean;
  speakHebrew: (text: string) => void;
  playSfx?: (name: "pop" | "chime") => void;
  /** When provided, the discovery bubble offers an עוד! button opening a card. */
  onMoreInfo?: (kind: GameMode, id: string) => void;
}

export default function WorldMap({ mode, discoveredSet, onDiscover, speakHebrew, playSfx, onMoreInfo }: WorldMapProps) {
  const [activeBubble, setActiveBubble] = useState<{
    id: string;
    kind: GameMode;
    name: string;
    subName?: string;
    color: string;
  } | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [confettiOrigin, setConfettiOrigin] = useState({ x: 0.5, y: 0.5 });
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [milestoneMessage, setMilestoneMessage] = useState("");
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Zoom & pan state
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([0, 25]);

  // ─── Color logic per mode ───────────────────────────────────────────────────

  const getGeoFill = useCallback(
    (geoId: string): string => {
      if (mode === "continents") {
        const cId = getContinentId(geoId);
        const color = CONTINENT_COLOR[cId] ?? "#d1d5db";
        return discoveredSet.has(cId) ? color : color + "88";
      }

      if (mode === "countries") {
        const country = COUNTRY_BY_ID.get(geoId);
        if (!country) return "#e2e8f0";
        const color = getCountryColor(country.continentId);
        return discoveredSet.has(geoId) ? color : color + "88";
      }

      return "#d1d5db";
    },
    [mode, discoveredSet]
  );

  // ─── Click handlers ─────────────────────────────────────────────────────────

  const triggerDiscovery = useCallback(
    (id: string, kind: GameMode, name: string, color: string, subName?: string, event?: React.MouseEvent) => {
      setActiveBubble({ id, kind, name, subName, color });
      playSfx?.("pop");

      if (event) {
        setConfettiOrigin({
          x: event.clientX / window.innerWidth,
          y: event.clientY / window.innerHeight,
        });
      }

      const isNew = onDiscover(id);
      if (isNew) {
        setConfettiTrigger((p) => p + 1);
        playSfx?.("chime");
      }

      speakHebrew(name);

      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => setActiveBubble(null), 3400);

      return isNew;
    },
    [onDiscover, speakHebrew, playSfx]
  );

  const handleGeoClick = useCallback(
    (geo: GeoShape, event: React.MouseEvent) => {
      const geoId = String(geo.id ?? "");

      if (mode === "continents") {
        const cId = getContinentId(geoId);
        const continent = CONTINENTS.find((c) => c.id === cId);
        if (!continent) return;

        const isNew = triggerDiscovery(cId, "continents", continent.nameHebrew, continent.color, undefined, event);

        if (isNew) {
          const next = new Set(discoveredSet);
          next.add(cId);
          if (next.size === CONTINENTS.length) {
            setTimeout(() => {
              setMilestoneMessage("גילית את כל היבשות! 🌍");
              setMilestoneOpen(true);
            }, 1500);
          }
        }
        return;
      }

      if (mode === "countries") {
        const country = COUNTRY_BY_ID.get(geoId);
        if (!country) return;

        const color = getCountryColor(country.continentId);
        const isNew = triggerDiscovery(geoId, "countries", country.nameHebrew, color, undefined, event);

        if (isNew) {
          const next = new Set(discoveredSet);
          next.add(geoId);
          if (next.size === COUNTRIES.length) {
            setTimeout(() => {
              setMilestoneMessage("גילית את כל המדינות! 🗺️");
              setMilestoneOpen(true);
            }, 1500);
          }
        }
        return;
      }
    },
    [mode, discoveredSet, triggerDiscovery]
  );

  const dismissBubble = useCallback(() => {
    setActiveBubble(null);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  }, []);

  // ─── Star markers ────────────────────────────────────────────────────────────

  const continentStars = useMemo(() =>
    mode === "continents"
      ? CONTINENTS.filter((c) => discoveredSet.has(c.id)).map((c) => ({
          id: c.id,
          coords: CONTINENT_CENTERS[c.id] ?? [0, 0] as [number, number],
        }))
      : [],
    [mode, discoveredSet]
  );

  const countryStars = useMemo(() =>
    mode === "countries"
      ? COUNTRIES.filter((c) => discoveredSet.has(c.id))
      : [],
    [mode, discoveredSet]
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      ref={mapContainerRef}
      className="relative w-full h-full"
      style={{ minHeight: "400px" }}
    >
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 125, center: [0, 25] }}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup
          center={center}
          zoom={zoom}
          onMoveEnd={({ coordinates, zoom: z }) => {
            setCenter(coordinates as [number, number]);
            setZoom(z);
          }}
          minZoom={1}
          maxZoom={150}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: GeoShape[] }) =>
              geographies.map((geo) => {
                const geoId = String(geo.id);
                const fill = getGeoFill(geoId);
                const isClickable =
                  mode === "continents" ||
                  (mode === "countries" && COUNTRY_BY_ID.has(geoId));

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    data-geo-id={geoId}
                    onClick={
                      isClickable
                        ? (event) => handleGeoClick(geo, event as unknown as React.MouseEvent)
                        : undefined
                    }
                    style={{
                      default: {
                        fill,
                        stroke: "#ffffff",
                        strokeWidth: 0.5,
                        outline: "none",
                        transition: "fill 0.2s ease",
                        cursor: isClickable ? "pointer" : "default",
                      },
                      hover: {
                        fill,
                        stroke: "#ffffff",
                        strokeWidth: isClickable ? 1.2 : 0.5,
                        outline: "none",
                        filter: isClickable ? "brightness(1.18)" : "none",
                        cursor: isClickable ? "pointer" : "default",
                      },
                      pressed: {
                        fill,
                        stroke: "#ffffff",
                        strokeWidth: 1,
                        outline: "none",
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>

          {/* Continent stars — fixed screen size regardless of zoom */}
          {continentStars.map((s) => {
            const sz = 12 / zoom;
            return (
              <Marker key={s.id} coordinates={s.coords as [number, number]}>
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ fontSize: `${sz}px`, pointerEvents: "none", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.3))" }}
                >
                  ⭐
                </text>
              </Marker>
            );
          })}

          {/* Country stars — fixed screen size regardless of zoom */}
          {countryStars.map((c) => {
            const coords = COUNTRY_CENTERS[c.id] ?? [0, 0];
            const sz = 8 / zoom;
            return (
              <Marker key={c.id} coordinates={coords as [number, number]}>
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ fontSize: `${sz}px`, pointerEvents: "none", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
                >
                  ⭐
                </text>
              </Marker>
            );
          })}

        </ZoomableGroup>
      </ComposableMap>

      {/* Zoom controls */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 20,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 20,
        }}
      >
        <button onClick={() => setZoom((z) => Math.min(z * 1.5, 150))} style={zoomBtnStyle}>+</button>
        <button onClick={() => setZoom((z) => Math.max(z / 1.5, 1))} style={zoomBtnStyle}>−</button>
        {zoom > 1.1 && (
          <button
            onClick={() => { setZoom(1); setCenter([0, 25]); }}
            style={{ ...zoomBtnStyle, fontSize: 18 }}
            title="איפוס תצוגה"
          >
            🔄
          </button>
        )}
      </div>

      {/* Name reveal bubble */}
      <NameRevealBubble
        name={activeBubble?.name ?? null}
        subName={activeBubble?.subName}
        color={activeBubble?.color ?? "#818cf8"}
        position={null}
        onDismiss={dismissBubble}
        onMore={
          activeBubble && onMoreInfo
            ? () => {
                if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
                onMoreInfo(activeBubble.kind, activeBubble.id);
                setActiveBubble(null);
              }
            : undefined
        }
      />

      {/* Confetti */}
      <ConfettiEffect
        trigger={confettiTrigger}
        originX={confettiOrigin.x}
        originY={confettiOrigin.y}
      />

      {/* Milestone */}
      <MilestoneModal
        isOpen={milestoneOpen}
        onClose={() => setMilestoneOpen(false)}
        message={milestoneMessage}
      />
    </div>
  );
}
