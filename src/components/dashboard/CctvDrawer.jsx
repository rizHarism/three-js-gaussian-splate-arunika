import React, { useEffect, useState } from "react";
import { X, ShieldCheck } from "lucide-react";

export default function CctvDrawer({ isOpen, onClose, cctvName = "Front Office CCTV" }) {
  const [timestamp, setTimestamp] = useState(() =>
    new Date().toISOString().replace("T", " ").substring(0, 19)
  );

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setTimestamp(new Date().toISOString().replace("T", " ").substring(0, 19));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <aside className={`cctv-drawer-panel ${isOpen ? "open" : ""}`} aria-hidden={!isOpen}>
      <div className="cctv-drawer-header">
        <div className="cctv-drawer-title">
          <span className="cctv-live-dot" />
          <span>{cctvName}</span>
        </div>
        <button
          className="cctv-close-btn"
          onClick={onClose}
          title="Tutup Panel CCTV (Esc)"
        >
          <X size={16} />
        </button>
      </div>

      <div className="cctv-screen-viewport">
        {/*
          ======================================================================
          PANDUAN INTEGRASI STREAM CCTV ASLI:
          - Untuk stream HLS (.m3u8): Gunakan library 'hls.js' lalu sematkan ke elemen <video ref={videoRef}>.
          - Untuk RTSP / WebRTC: Gunakan WebRTC signaling gateway (seperti go2rtc atau mediamtx).
          - Untuk file MP4 / WebM simulasi online: Masukkan URL ke properti src tag <video>.
          ======================================================================
        */}
        <div className="cctv-simulated-screen">
          <div className="cctv-overlay-scanline" />
          <div className="cctv-osd-top">
            <span className="cctv-badge-live">● LIVE (MOCK)</span>
            <span>{timestamp}</span>
          </div>
          <div className="cctv-center-crosshair">
            <div className="crosshair-target" />
            <span className="cctv-channel-name">CH-01: FACADE_CAM</span>
          </div>
          <div className="cctv-osd-bottom">
            <span>RES: 1920x1080 @ 30FPS</span>
            <span>SIG: 98% (STABLE)</span>
          </div>
        </div>
      </div>

      <div className="cctv-drawer-footer">
        <div className="cctv-status-info">
          <ShieldCheck size={14} color="#22c55e" />
          <span>Kamera Keamanan Eksterior Berfungsi Normal</span>
        </div>
      </div>
    </aside>
  );
}
