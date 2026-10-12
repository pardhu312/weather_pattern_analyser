import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { getAnomalies } from "../services/api";
import "./Anomalies.css";

export default function Anomalies() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  const loadAnomalies = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      const result = await getAnomalies();
      setData(result);
    } catch (err) {
      console.error("Anomaly API error:", err);
      setError(err?.message || "Failed to load anomaly data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnomalies();

    const interval = setInterval(() => {
      loadAnomalies(true);
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const anomalies = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.anomalies)) return data.anomalies;
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data.observations)) return data.observations;
    if (Array.isArray(data.data)) return data.data;
    return [];
  }, [data]);

  const anomalyCount = useMemo(() => {
    const possibleCount =
      data?.count ??
      data?.total_anomalies ??
      data?.anomaly_count ??
      data?.total;

    const numericCount = Number(possibleCount);
    if (Number.isFinite(numericCount)) return numericCount;
    return anomalies.length;
  }, [data, anomalies]);

  const method =
    data?.method ||
    data?.model ||
    data?.detector ||
    "Isolation Forest";

  const contamination =
    data?.contamination ??
    data?.contamination_rate ??
    null;

  const getValue = (item, keys) => {
    for (const key of keys) {
      if (
        item &&
        item[key] !== undefined &&
        item[key] !== null &&
        item[key] !== ""
      ) {
        return item[key];
      }
    }
    return null;
  };

  const formatNumber = (value, decimals = 1) => {
    if (value === null || value === undefined || value === "") return "--";
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);
    return number.toFixed(decimals);
  };

  const formatDate = (value) => {
    if (!value) return "Time unavailable";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  };

  const getSeverity = (score) => {
    if (score === null || score === undefined) return "Candidate";
    const number = Number(score);
    if (!Number.isFinite(number)) return "Candidate";

    if (number < -0.25 || number > 0.05) return "High";
    if (number < -0.1 || number > 0.02) return "Medium";
    return "Candidate";
  };

  const getSeverityClass = (severity) => {
    if (severity === "High") return "severity-high";
    if (severity === "Medium") return "severity-medium";
    return "severity-candidate";
  };

  const availableCities = useMemo(() => {
    return [
      "all",
      ...new Set(
        anomalies
          .map((item) => getValue(item, ["city", "location", "city_name"]))
          .filter(Boolean)
      )
    ];
  }, [anomalies]);

  const filteredAnomalies = useMemo(() => {
    return anomalies.filter((item) => {
      const city = getValue(item, ["city", "location", "city_name"]);
      const score = getValue(item, ["anomaly_score", "anomalyScore", "score"]);
      const severity = getSeverity(score);

      if (cityFilter !== "all" && city !== cityFilter) return false;
      if (severityFilter !== "all" && severity !== severityFilter) return false;
      return true;
    });
  }, [anomalies, cityFilter, severityFilter]);

  if (loading) {
    return (
      <div className="anomalies-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <span>Loading anomaly detection...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="anomalies-page">
      <Sidebar />

      <main className="anomalies-main">
        {/* HEADER */}
        <header className="anomalies-header">
          <div>
            <p className="anomalies-eyebrow">MACHINE LEARNING MONITORING</p>
            <h1>Anomaly Detection</h1>
            <p className="anomalies-subtitle">
              Identify weather observations that diverge from historical meteorological baselines.
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={() => loadAnomalies(true)}
            disabled={refreshing}
            type="button"
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>
        </header>

        {/* ERROR */}
        {error && (
          <div className="anomalies-error">
            <div className="error-icon">!</div>
            <div>
              <strong>Unable to load anomaly data</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* OVERVIEW CARDS */}
        <section className="anomaly-overview">
          <div className="anomaly-stat-card danger-card">
            <div className="stat-top">
              <span>CANDIDATE ANOMALIES</span>
              <div className="stat-icon danger-icon">!</div>
            </div>
            <strong>{anomalyCount}</strong>
            <small>Observations flagged by the model</small>
          </div>

          <div
            className="anomaly-stat-card clickable-card"
            onClick={() => navigate("/models")}
            style={{ cursor: "pointer" }}
            title="Inspect anomaly detection model"
          >
            <div className="stat-top">
              <span>DETECTION METHOD</span>
              <div className="stat-icon blue-icon">AI</div>
            </div>
            <strong className="method-value">{method}</strong>
            <small>Isolation Forest model →</small>
          </div>

          <div
            className="anomaly-stat-card clickable-card"
            onClick={() => navigate("/analytics")}
            style={{ cursor: "pointer" }}
            title="Inspect dataset summary"
          >
            <div className="stat-top">
              <span>CONTAMINATION</span>
              <div className="stat-icon purple-icon">%</div>
            </div>
            <strong>
              {contamination !== null
                ? `${(Number(contamination) * 100).toFixed(1)}%`
                : "5.0%"}
            </strong>
            <small>Expected anomaly proportion →</small>
          </div>

          <div
            className="anomaly-stat-card clickable-card"
            onClick={() => navigate("/dashboard")}
            style={{ cursor: "pointer" }}
            title="Back to dashboard"
          >
            <div className="stat-top">
              <span>SYSTEM STATUS</span>
              <div className="stat-icon green-icon">✓</div>
            </div>
            <strong className="status-value">Monitoring</strong>
            <small>Active on all 5 cities →</small>
          </div>
        </section>

        {/* DETECTION LIST */}
        <section className="anomaly-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-label">DETECTIONS</span>
              <h2>Weather Anomaly Candidates</h2>
              <p className="panel-description">
                Observations isolated by the multi-variable Isolation Forest detector.
              </p>
            </div>

            <div className="candidate-badge">
              {filteredAnomalies.length} of {anomalyCount} candidates shown
            </div>
          </div>

          {/* Interactive Filter Bar */}
          <div className="anomaly-filter-controls">
            <div className="a-filter-group">
              <label>CITY:</label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
              >
                {availableCities.map((c) => (
                  <option key={c} value={c}>
                    {c === "all" ? "All Monitored Cities" : c}
                  </option>
                ))}
              </select>
            </div>

            <div className="a-filter-group">
              <label>SEVERITY:</label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
              >
                <option value="all">All Severity Levels</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Candidate">Candidate</option>
              </select>
            </div>
          </div>

          {filteredAnomalies.length === 0 ? (
            <div className="empty-anomalies">
              <div className="empty-icon">✓</div>
              <h3>No anomaly candidates matching filter</h3>
              <p>Try clearing your city or severity filters to see all flagged observations.</p>
            </div>
          ) : (
            <div className="anomaly-list">
              {filteredAnomalies.map((item, index) => {
                const city =
                  getValue(item, [
                    "city",
                    "location",
                    "city_name",
                    "cityName"
                  ]) || "Unknown city";

                const temperature = getValue(item, ["temperature", "temp"]);
                const humidity = getValue(item, ["humidity"]);
                const pressure = getValue(item, ["pressure"]);
                const windSpeed = getValue(item, ["wind_speed", "windSpeed"]);
                const rain = getValue(item, ["rain1h", "rain", "rain_1h"]);
                const observedAt = getValue(item, ["observed_at", "observedAt", "timestamp"]);
                const score = getValue(item, ["anomaly_score", "anomalyScore", "score"]);
                const severity = getSeverity(score);

                return (
                  <div className="anomaly-row" key={item?.id ?? index}>
                    <div className="anomaly-indicator">
                      <span>!</span>
                    </div>

                    <div className="anomaly-main-info">
                      <div className="anomaly-city">{city}</div>
                      <div className="anomaly-time">{formatDate(observedAt)}</div>
                    </div>

                    <div className="anomaly-metrics">
                      <div className="metric">
                        <span>Temperature</span>
                        <strong>
                          {temperature !== null ? `${formatNumber(temperature, 1)}°C` : "--"}
                        </strong>
                      </div>

                      <div className="metric">
                        <span>Humidity</span>
                        <strong>
                          {humidity !== null ? `${formatNumber(humidity, 0)}%` : "--"}
                        </strong>
                      </div>

                      <div className="metric">
                        <span>Pressure</span>
                        <strong>
                          {pressure !== null ? `${formatNumber(pressure, 0)} hPa` : "--"}
                        </strong>
                      </div>

                      <div className="metric">
                        <span>Wind</span>
                        <strong>
                          {windSpeed !== null ? `${formatNumber(windSpeed, 1)} m/s` : "--"}
                        </strong>
                      </div>

                      <div className="metric">
                        <span>Rain</span>
                        <strong>
                          {rain !== null ? `${formatNumber(rain, 1)} mm` : "--"}
                        </strong>
                      </div>
                    </div>

                    <div className="anomaly-score">
                      <span>Score</span>
                      <strong>
                        {score !== null ? formatNumber(score, 4) : "--"}
                      </strong>
                      <div className={`severity-badge ${getSeverityClass(severity)}`}>
                        {severity}
                      </div>
                    </div>

                    {/* Interactive Action Button to inspect city in Weather Monitor */}
                    <button
                      className="inspect-weather-action"
                      onClick={() => navigate(`/weather?city=${encodeURIComponent(city)}`)}
                      type="button"
                      title={`Inspect ${city} in live Weather monitor`}
                    >
                      Inspect →
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* EXPLANATION */}
        <section className="anomaly-info">
          <div className="info-icon">i</div>
          <div>
            <h3>How to interpret anomaly candidates</h3>
            <p>
              An anomaly candidate is an observation that the Isolation Forest model considers unusual compared with historical observations in the dataset. Clicking &quot;Inspect&quot; on any candidate will open the Weather Monitor filtered for that specific city.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}