import React from "react";
import { Info } from "lucide-react";

export default function AboutPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#94a3b8" }}>
        <Info size={14} />
        <span>TENTANG APLIKASI</span>
      </div>

      <p style={{ margin: 0, fontSize: "12px", lineHeight: "1.6", color: "#cbd5e1" }}>
        Digital Twin fasad kantor <strong>Arunika Saha Vikasa</strong> menggunakan 3D Gaussian Splatting dan WebGPU.
        Menghubungkan data cuaca real-time Blitar dan simulasi sensor daya listrik eksterior.
      </p>

      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
        © 2026 Arunika Research &amp; Development
      </div>
    </div>
  );
}
