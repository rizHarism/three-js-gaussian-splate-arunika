import React from "react";
import WeatherCard from "./WeatherCard.jsx";
import PowerWidget from "./PowerWidget.jsx";
import AboutPanel from "./AboutPanel.jsx";

export default function Sidebar({ weatherData, powerWatts }) {
  return (
    <aside className="sidebar-container">
      <div className="sidebar-panel sidebar-panel-top">
        <WeatherCard weatherData={weatherData} />
        <PowerWidget powerWatts={powerWatts} />
      </div>
      <div className="sidebar-panel sidebar-panel-bottom">
        <AboutPanel />
      </div>
    </aside>
  );
}
