import { CONFIG } from "../constants/config.js";

const MOCK_WEATHER_DATA = {
  condition: "Clouds",
  temperature: 29,
  humidity: 78,
  windSpeed: 3.5,
  description: "Berawan Tebal",
  icon: "04d",
  isOffline: true,
};

let pollIntervalId = null;

export const weatherService = {
  async fetchOnce() {
    const apiKey = import.meta.env.VITE_OWM_API_KEY;

    if (!apiKey) {
      console.warn("VITE_OWM_API_KEY is not set. Using mock weather data.");
      return { ...MOCK_WEATHER_DATA, isOffline: true };
    }

    try {
      const { lat, lon } = CONFIG.OWM_LOCATION;
      const url = `${CONFIG.OWM_BASE_URL}?lat=${lat}&lon=${lon}&units=metric&lang=id&appid=${apiKey}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`OpenWeatherMap responded with status ${res.status}`);
      }

      const data = await res.json();
      return {
        condition: data.weather?.[0]?.main || "Clouds",
        temperature: Math.round(data.main?.temp ?? 29),
        humidity: data.main?.humidity ?? 75,
        windSpeed: data.wind?.speed ?? 3.0,
        description: data.weather?.[0]?.description || "Berawan",
        icon: data.weather?.[0]?.icon || "04d",
        isOffline: false,
      };
    } catch (err) {
      console.error("Weather fetch failed, falling back to mock:", err);
      return { ...MOCK_WEATHER_DATA, isOffline: true };
    }
  },

  startPolling(callback) {
    this.stopPolling();
    this.fetchOnce().then(callback);

    pollIntervalId = setInterval(async () => {
      const data = await this.fetchOnce();
      callback(data);
    }, CONFIG.WEATHER_POLL_INTERVAL_MS);
  },

  stopPolling() {
    if (pollIntervalId) {
      clearInterval(pollIntervalId);
      pollIntervalId = null;
    }
  },
};
