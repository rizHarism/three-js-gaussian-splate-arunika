import React from "react";
import { Zap } from "lucide-react";

export default function PowerWidget({ powerWatts }) {
  // Simple dummy bar chart levels
  const percentage = Math.min(100, Math.round((powerWatts / 7200) * 100));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        paddingTop: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "#64748b",
            textTransform: "uppercase",
          }}
        >
          Konsumsi Daya (IoT Mock)
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            color: "#f59e0b",
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          <Zap size={14} />
          {`${powerWatts.toLocaleString("id")} W`}
        </span>
      </div>

      <div
        style={{
          width: "100%",
          height: "6px",
          background: "rgba(255,255,255,0.1)",
          borderRadius: "9999px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percentage}%`,
            background: "linear-gradient(90deg, #22c55e, #f59e0b, #ef4444)",
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}
