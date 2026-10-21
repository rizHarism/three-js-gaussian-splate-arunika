export const CONFIG = {
  // Model
  MODEL_PATH: "/model/office30000.spz",

  // Camera Defaults
  CAMERA_FOV: 15,
  CAMERA_NEAR: 0.01,
  CAMERA_FAR: 100,
  CAMERA_POSITION: { x: 10, y: 10, z: 10 },

  // Framing Offset (applied after bounds calculation)
  FRAMING_OFFSET: { x: 10.0, y: 6.0, z: 1.0 },
  FRAMING_CLOSE_UP_FACTOR: 0.7,
  FRAMING_ROTATION_ANGLE: Math.PI / 5, // 10 degrees

  // Weather Service
  OWM_BASE_URL: "https://api.openweathermap.org/data/2.5/weather",
  OWM_LOCATION: { lat: -8.0954, lon: 112.1611 }, // Blitar
  WEATHER_POLL_INTERVAL_MS: 5 * 60 * 1000, // 5 menit

  // IoT Simulation
  IOT_MIN_WATTS: 1200,
  IOT_MAX_WATTS: 7200,
  IOT_MIN_INTERVAL_MS: 3000,
  IOT_MAX_INTERVAL_MS: 5000,

  // CSS2D Label Coordinates (initial estimates in world space)
  LABEL_POWER_METER: { x: 2.5, y: 1.2, z: -1.0 },
  LABEL_CCTV_RIGHT: { x: 4.8, y: 2.8, z: 0.5 },
  LABEL_CCTV_LEFT: { x: -3.5, y: 2.8, z: -0.2 },

  // Environment & Visuals
  MAX_RAIN_PARTICLES: 5000,
};
