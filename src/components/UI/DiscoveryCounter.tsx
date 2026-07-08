interface DiscoveryCounterProps {
  count: number;
  total: number;
}

export default function DiscoveryCounter({ count, total }: DiscoveryCounterProps) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
      style={{
        background: "rgba(255,255,255,0.9)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: "16px" }}>⭐</span>
      <span
        style={{
          fontFamily: "Heebo, sans-serif",
          fontWeight: 800,
          fontSize: "17px",
          color: "#1a365d",
        }}
      >
        {count}/{total}
      </span>
      <span
        style={{
          fontFamily: "Heebo, sans-serif",
          fontWeight: 700,
          fontSize: "13px",
          color: "#64748b",
        }}
      >
        גילויים
      </span>
    </div>
  );
}
