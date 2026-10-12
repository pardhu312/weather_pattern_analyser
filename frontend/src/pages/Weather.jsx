import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { getWeatherData, fetchLiveWeather } from "../services/api";
import "./Weather.css";

const MONITORED_CITIES = {
  Bengaluru: { lat: 12.9716, lon: 77.5946 },
  Chennai: { lat: 13.0827, lon: 80.2707 },
  Delhi: { lat: 28.6139, lon: 77.2090 },
  Hyderabad: { lat: 17.3850, lon: 78.4867 },
  Mumbai: { lat: 19.0760, lon: 72.8777 }
};

export default function Weather() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCity = searchParams.get("city");

  const [weatherData, setWeatherData] = useState([]);
  const [selectedCity, setSelectedCity] = useState(urlCity || "All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("observedAt");
  const [sortOrder, setSortOrder] = useState("desc"); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [fetchCity, setFetchCity] = useState("Delhi");
  const [fetchingLive, setFetchingLive] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");

  const loadWeather = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const data = await getWeatherData();
      setWeatherData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Unable to load weather data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWeather();

    const interval = setInterval(() => {
      loadWeather(true);
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (urlCity && urlCity !== selectedCity) {
      setSelectedCity(urlCity);
      setCurrentPage(1);
    }
  }, [urlCity, selectedCity]);

  const cities = useMemo(() => {
    return [
      "All",
      ...new Set(weatherData.map((item) => item.city).filter(Boolean))
    ];
  }, [weatherData]);

  const handleCityFilterChange = (city) => {
    setSelectedCity(city);
    setCurrentPage(1);
    if (city === "All") {
      searchParams.delete("city");
    } else {
      searchParams.set("city", city);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const handleLiveFetch = async () => {
    const coords = MONITORED_CITIES[fetchCity];
    if (!coords) return;

    try {
      setFetchingLive(true);
      setError("");
      setActionSuccess("");

      const result = await fetchLiveWeather(fetchCity, coords.lat, coords.lon);
      setActionSuccess(`Successfully fetched and stored live weather observation for ${result.city || fetchCity}!`);
      await loadWeather(true);

      setTimeout(() => {
        setActionSuccess("");
      }, 5000);
    } catch (err) {
      console.error("Live fetch failed:", err);
      setError(err?.message || `Failed to fetch live weather for ${fetchCity}`);
    } finally {
      setFetchingLive(false);
    }
  };

  const filteredData = useMemo(() => {
    let list = selectedCity === "All"
      ? weatherData
      : weatherData.filter((item) => item.city === selectedCity);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) =>
        (item.city && item.city.toLowerCase().includes(q)) ||
        (item.weatherMain && item.weatherMain.toLowerCase().includes(q)) ||
        (item.weatherDescription && item.weatherDescription.toLowerCase().includes(q))
      );
    }

    return [...list].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === "observedAt") {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      } else {
        aVal = aVal != null ? Number(aVal) || String(aVal) : "";
        bVal = bVal != null ? Number(bVal) || String(bVal) : "";
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [weatherData, selectedCity, searchQuery, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const getSortIcon = (field) => {
    if (sortField !== field) return "↕";
    return sortOrder === "asc" ? "▲" : "▼";
  };

  return (
    <div className="weather-page">
      <Sidebar />

      <main className="weather-main">
        <header className="weather-header">
          <div>
            <span className="weather-eyebrow">LIVE WEATHER MONITOR</span>
            <h1>Weather Observations</h1>
            <p>
              Real-time atmospheric records collected from monitored meteorological stations.
            </p>
          </div>

          <div className="header-actions-group">
            {/* Live Fetch Action Trigger */}
            <div className="live-fetch-box">
              <select
                value={fetchCity}
                onChange={(e) => setFetchCity(e.target.value)}
                disabled={fetchingLive}
                aria-label="Select city for live fetch"
              >
                {Object.keys(MONITORED_CITIES).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <button
                className="fetch-live-btn"
                onClick={handleLiveFetch}
                disabled={fetchingLive}
                type="button"
                title="Fetch live weather observation from OpenWeather"
              >
                {fetchingLive ? "Fetching..." : "Fetch Live Data"}
              </button>
            </div>

            <button
              className="weather-refresh"
              onClick={() => loadWeather(true)}
              disabled={refreshing}
              type="button"
            >
              <span className={refreshing ? "spin" : ""}>↻</span>
              {refreshing ? "Updating..." : "Refresh"}
            </button>
          </div>
        </header>

        {actionSuccess && (
          <div className="weather-success-toast">
            <span>✓</span>
            <span>{actionSuccess}</span>
          </div>
        )}

        {error && (
          <div className="weather-error">
            <span>!</span>
            <span>{error}</span>
          </div>
        )}

        {/* Toolbar with City Filter, Search, and Summary */}
        <section className="weather-toolbar-v2">
          <div className="filter-item">
            <label htmlFor="city-select">FILTER CITY</label>
            <select
              id="city-select"
              value={selectedCity}
              onChange={(e) => handleCityFilterChange(e.target.value)}
            >
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city} {city !== "All" && `(${weatherData.filter((d) => d.city === city).length})`}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-item search-filter">
            <label htmlFor="weather-search">SEARCH</label>
            <input
              id="weather-search"
              type="text"
              placeholder="Filter by keyword or condition..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="weather-count-badge">
            <strong>{filteredData.length}</strong> observations found
          </div>
        </section>

        {loading ? (
          <div className="weather-loading">
            <div className="spinner"></div>
            <p>Loading weather observations...</p>
          </div>
        ) : (
          <section className="weather-table-card">
            <div className="weather-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th onClick={() => handleSort("city")} className="sortable-th">
                      City <span className="sort-icon">{getSortIcon("city")}</span>
                    </th>
                    <th onClick={() => handleSort("temperature")} className="sortable-th">
                      Temperature <span className="sort-icon">{getSortIcon("temperature")}</span>
                    </th>
                    <th onClick={() => handleSort("feelsLike")} className="sortable-th">
                      Feels Like <span className="sort-icon">{getSortIcon("feelsLike")}</span>
                    </th>
                    <th onClick={() => handleSort("humidity")} className="sortable-th">
                      Humidity <span className="sort-icon">{getSortIcon("humidity")}</span>
                    </th>
                    <th onClick={() => handleSort("pressure")} className="sortable-th">
                      Pressure <span className="sort-icon">{getSortIcon("pressure")}</span>
                    </th>
                    <th onClick={() => handleSort("windSpeed")} className="sortable-th">
                      Wind <span className="sort-icon">{getSortIcon("windSpeed")}</span>
                    </th>
                    <th onClick={() => handleSort("cloudPercent")} className="sortable-th">
                      Clouds <span className="sort-icon">{getSortIcon("cloudPercent")}</span>
                    </th>
                    <th onClick={() => handleSort("rain1h")} className="sortable-th">
                      Rain <span className="sort-icon">{getSortIcon("rain1h")}</span>
                    </th>
                    <th onClick={() => handleSort("observedAt")} className="sortable-th">
                      Observed <span className="sort-icon">{getSortIcon("observedAt")}</span>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: "40px" }}>
                        No weather records match your search or filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item, index) => (
                      <tr key={`${item.city}-${item.observedAt}-${index}`}>
                        <td>
                          <strong>{item.city}</strong>
                        </td>
                        <td>
                          {item.temperature != null
                            ? `${Number(item.temperature).toFixed(1)} °C`
                            : "—"}
                        </td>
                        <td>
                          {item.feelsLike != null
                            ? `${Number(item.feelsLike).toFixed(1)} °C`
                            : "—"}
                        </td>
                        <td>{item.humidity != null ? `${item.humidity}%` : "—"}</td>
                        <td>{item.pressure != null ? `${item.pressure} hPa` : "—"}</td>
                        <td>
                          {item.windSpeed != null
                            ? `${Number(item.windSpeed).toFixed(1)} m/s`
                            : "—"}
                        </td>
                        <td>{item.cloudPercent != null ? `${item.cloudPercent}%` : "—"}</td>
                        <td>
                          {item.rain1h != null ? `${Number(item.rain1h).toFixed(2)} mm` : "0 mm"}
                        </td>
                        <td>
                          {item.observedAt
                            ? new Date(item.observedAt).toLocaleString()
                            : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="weather-pagination">
                <div className="pagination-info">
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                </div>

                <div className="pagination-buttons">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    type="button"
                  >
                    ← Previous
                  </button>

                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    type="button"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}