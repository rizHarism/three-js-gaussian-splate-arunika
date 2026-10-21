import { CONFIG } from "../constants/config.js";

let timerId = null;

export const iotSimulationService = {
  start(callback) {
    this.stop();

    const triggerNext = () => {
      const minWatts = CONFIG.IOT_MIN_WATTS;
      const maxWatts = CONFIG.IOT_MAX_WATTS;
      const watts = Math.floor(
        minWatts + Math.random() * (maxWatts - minWatts),
      );

      callback(watts);

      const minInterval = CONFIG.IOT_MIN_INTERVAL_MS;
      const maxInterval = CONFIG.IOT_MAX_INTERVAL_MS;
      const nextDelay = Math.floor(
        minInterval + Math.random() * (maxInterval - minInterval),
      );

      timerId = setTimeout(triggerNext, nextDelay);
    };

    triggerNext();
  },

  stop() {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  },
};
