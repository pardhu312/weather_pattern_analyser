import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import {
  getDatasetSummary,
  getDatasetReadiness,
  getDashboardSummary,
  getDatasetEda
} from "../services/api";

import "./Analytics.css";

export default function Analytics() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [eda, setEda] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAnalytics = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const [summaryData, readinessData, dashboardData, edaData] =
        await Promise.all([
          getDatasetSummary().catch(() => null),
          getDatasetReadiness().catch(() => null),
          getDashboardSummary().catch(() => null),
          getDatasetEda().catch(() => null)
        ]);

      setSummary(summaryData);
      setReadiness(readinessData);
      setDashboard(dashboardData);
      setEda(edaData);
    } catch (err) {
      console.error(err);
      setError("Failed to load analytics data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="analytics-loading">
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <Sidebar />

      <main className="analytics-main">
        <header className="analytics-header">
          <div>
            <p className="analytics-eyebrow">
              WEATHER INTELLIGENCE
            </p>

            <h1>Analytics & ML Insights</h1>

            <p className="analytics-subtitle">
              Comprehensive telemetry of meteorological data collection and training pipeline readiness.
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={() => loadAnalytics(true)}
            disabled={refreshing}
            type="button"
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>
        </header>

        {error && (
          <div className="analytics-error">
            {error}
          </div>
        )}

        <section className="analytics-stats">
          <div
            className="analytics-stat-card clickable-card"
            onClick={() => navigate("/weather")}
            style={{ cursor: "pointer" }}
            title="Inspect weather observations"
          >
            <span>Total Observations</span>
            <strong>
              {summary?.rows ?? summary?.total_observations ?? "--"}
            </strong>
            <small style={{ color: "#38bdf8", fontSize: "11px", marginTop: "4px" }}>
              View Weather Monitor →
            </small>
          </div>

          <div
            className="analytics-stat-card clickable-card"
            onClick={() => navigate("/clusters")}
            style={{ cursor: "pointer" }}
            title="Inspect city clusters"
          >
            <span>Monitored Cities</span>
            <strong>
              {summary?.cities?.length ?? summary?.city_count ?? "--"}
            </strong>
            <small style={{ color: "#38bdf8", fontSize: "11px", marginTop: "4px" }}>
              View City Clusters →
            </small>
          </div>

          <div
            className="analytics-stat-card clickable-card"
            onClick={() => navigate("/anomalies")}
            style={{ cursor: "pointer" }}
            title="Inspect candidate anomalies"
          >
            <span>Anomaly Candidates</span>
            <strong>
              {dashboard?.anomalies?.total_anomalies ?? dashboard?.anomalies?.count ?? "--"}
            </strong>
            <small style={{ color: "#fb923c", fontSize: "11px", marginTop: "4px" }}>
              View Anomalies →
            </small>
          </div>

          <div
            className="analytics-stat-card clickable-card"
            onClick={() => navigate("/clusters")}
            style={{ cursor: "pointer" }}
            title="Inspect cluster silhouette score"
          >
            <span>Cluster Score</span>
            <strong>
              {dashboard?.clustering?.silhouette_score != null
                ? dashboard.clustering.silhouette_score.toFixed(3)
                : "--"}
            </strong>
            <small style={{ color: "#c084fc", fontSize: "11px", marginTop: "4px" }}>
              View K-Means Clusters →
            </small>
          </div>
        </section>

        <section className="analytics-grid">
          <div className="analytics-panel">
            <div className="panel-title">
              <div>
                <span className="panel-label">
                  DATASET TELEMETRY
                </span>

                <h2>Dataset Overview</h2>
              </div>
            </div>

            <div className="dataset-info">
              <div>
                <span>Total Observations</span>
                <strong>
                  {summary?.rows ?? "--"}
                </strong>
              </div>

              <div>
                <span>Cities</span>
                <strong>
                  {summary?.cities?.length ?? "--"}
                </strong>
              </div>

              <div>
                <span>Duplicate Rows</span>
                <strong>
                  {summary?.duplicate_rows ?? "0"}
                </strong>
              </div>
            </div>

            {summary?.date_range && (
              <div style={{ marginTop: "16px", fontSize: "12px", color: "#94a3b8" }}>
                Date Range: <strong>{new Date(summary.date_range.start).toLocaleDateString()}</strong> to <strong>{new Date(summary.date_range.end).toLocaleDateString()}</strong>
              </div>
            )}
          </div>

          <div className="analytics-panel">
            <div className="panel-title">
              <div>
                <span className="panel-label">
                  ML PIPELINE
                </span>

                <h2>Pipeline Readiness</h2>
              </div>
            </div>

            <div className="readiness-list">
              <div
                className="readiness-item"
                onClick={() => navigate("/weather")}
                style={{ cursor: "pointer" }}
                title="View data collection"
              >
                <span>Data Collection</span>
                <strong className="status-ready">
                  Ready (Active) →
                </strong>
              </div>

              <div
                className="readiness-item"
                onClick={() => navigate("/models")}
                style={{ cursor: "pointer" }}
                title="View feature engineering"
              >
                <span>Feature Engineering</span>
                <strong className="status-ready">
                  Ready (7 Features) →
                </strong>
              </div>

              <div
                className="readiness-item"
                onClick={() => navigate("/predictions")}
                style={{ cursor: "pointer" }}
                title="View forecasting pipeline"
              >
                <span>Forecasting Pipeline</span>
                <strong className="status-warning">
                  {readiness?.status ?? "Collecting Data"} →
                </strong>
              </div>
            </div>
          </div>
        </section>

        {/* Exploratory Data Analysis City Breakdown */}
        {summary?.rows_per_city && (
          <section className="analytics-panel large-panel" style={{ marginTop: "24px" }}>
            <div className="panel-title">
              <div>
                <span className="panel-label">DISTRIBUTION</span>
                <h2>Observations Per City</h2>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginTop: "14px" }}>
              {Object.entries(summary.rows_per_city).map(([city, count]) => (
                <div
                  key={city}
                  style={{
                    background: "rgba(30, 41, 59, 0.4)",
                    padding: "14px",
                    borderRadius: "8px",
                    border: "1px solid rgba(148, 163, 184, 0.1)",
                    cursor: "pointer"
                  }}
                  onClick={() => navigate(`/weather?city=${encodeURIComponent(city)}`)}
                  title={`Inspect ${city} weather observations`}
                >
                  <span style={{ fontSize: "11px", color: "#64748b" }}>{city}</span>
                  <strong style={{ display: "block", fontSize: "18px", color: "#f8fafc", margin: "4px 0" }}>
                    {count}
                  </strong>
                  <span style={{ fontSize: "10px", color: "#38bdf8" }}>Inspect →</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Model Pipeline Flow */}
        <section className="analytics-panel large-panel" style={{ marginTop: "24px" }}>
          <div className="panel-title">
            <div>
              <span className="panel-label">
                MACHINE LEARNING ARCHITECTURE
              </span>

              <h2>End-to-End Pipeline</h2>
            </div>
          </div>

          <div className="ml-pipeline">
            <div
              className="pipeline-step"
              onClick={() => navigate("/weather")}
              style={{ cursor: "pointer" }}
              title="Inspect weather observations"
            >
              <div className="pipeline-number">01</div>
              <h3>Data Collection</h3>
              <p>PostgreSQL ingest from OpenWeather</p>
            </div>

            <div className="pipeline-arrow">→</div>

            <div
              className="pipeline-step"
              onClick={() => navigate("/models")}
              style={{ cursor: "pointer" }}
              title="Inspect feature engineering"
            >
              <div className="pipeline-number">02</div>
              <h3>Features</h3>
              <p>Multi-hour lags, pressure, diurnal sine/cos</p>
            </div>

            <div className="pipeline-arrow">→</div>

            <div
              className="pipeline-step"
              onClick={() => navigate("/predictions")}
              style={{ cursor: "pointer" }}
              title="Inspect training dataset"
            >
              <div className="pipeline-number">03</div>
              <h3>Training</h3>
              <p>Chronological out-of-time splits</p>
            </div>

            <div className="pipeline-arrow">→</div>

            <div
              className="pipeline-step"
              onClick={() => navigate("/models")}
              style={{ cursor: "pointer" }}
              title="Inspect ML models"
            >
              <div className="pipeline-number">04</div>
              <h3>Model Inference</h3>
              <p>Persistence, Linear, RF, XGBoost</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}