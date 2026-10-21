import React, { useState, useEffect } from "react";
import { Cloud, CloudRain, Sun, Wind, Droplets, WifiOff, Clock } from "lucide-react";

export default function WeatherCard({ weatherData }) {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!weatherData) return null;

  const { condition, temperature, humidity, windSpeed, description, isOffline } = weatherData;

  const formattedTime = currentTime.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const renderIcon = () => {
    switch (condition?.toLowerCase()) {
      case "rain":
        return <CloudRain size={28} color="#38bdf8" />;
      case "clear":
        return <Sun size={28} color="#f59e0b" />;
      default:
        return <Cloud size={28} color="#94a3b8" />;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
          Cuaca Area (Blitar)
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "11px",
            fontWeight: 600,
            color: "#38bdf8",
            background: "rgba(56, 189, 248, 0.1)",
            padding: "2px 8px",
            borderRadius: "6px",
            border: "1px solid rgba(56, 189, 248, 0.2)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <Clock size={12} />
          {formattedTime} WIB
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {renderIcon()}
          <div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#f8fafc" }}>
              {temperature}°C
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8", textTransform: "capitalize" }}>
              {description}
            </div>
          </div>
        </div>

        {isOffline && (
          <span style={{ fontSize: "10px", color: "#f87171", display: "flex", alignItems: "center", gap: "4px" }}>
            <WifiOff size={12} /> Offline
          </span>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "12px", color: "#cbd5e1" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Droplets size={14} color="#38bdf8" /> {humidity}%
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Wind size={14} color="#a5b4fc" /> {windSpeed} m/s
        </span>
      </div>
    </div>
  );
}
