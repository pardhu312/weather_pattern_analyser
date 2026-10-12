import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { getMlReadiness, getModelComparison } from "../services/api";
import "./Predictions.css";

export default function Predictions() {
  const navigate = useNavigate();
  const [readiness, setReadiness] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const [readinessData, compData] = await Promise.all([
        getMlReadiness().catch((err) => ({ error: err.message })),
        getModelComparison().catch((err) => ({ error: err.message }))
      ]);

      setReadiness(readinessData);
      setComparison(compData);
    } catch (err) {
      console.error(err);
      setError("Failed to load forecasting readiness data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const usableRows = readiness?.usable_training_rows ?? 33;
  const targetRequired = 100;
  const progressPercent = Math.min(100, Math.round((usableRows / targetRequired) * 100));

  const cityStats = readiness?.city_statistics || {};

  return (
    <div className="predictions-page">
      <Sidebar />

      <main className="predictions-main">
        <header className="predictions-header">
          <div>
            <div className="header-eyebrow">TIME-SERIES FORECASTING</div>
            <h1>Temperature Forecasting</h1>
            <p>
              Machine-learning models trained to forecast future temperatures using multi-hour lag observations.
            </p>
          </div>

          <button
            className="refresh-btn"
            onClick={() => loadData(true)}
            disabled={refreshing}
            type="button"
          >
            <span className={refreshing ? "spin" : ""}>↻</span>
            {refreshing ? "Checking..." : "Check Readiness"}
          </button>
        </header>

        {error && (
          <div className="error-alert">
            <span>!</span>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading forecasting models and training pipeline status...</p>
          </div>
        ) : (
          <>
            {/* Pipeline Status Banner */}
            <section className="pipeline-status-banner">
              <div className="banner-icon">
                {readiness?.ready_for_training ? "✓" : "◷"}
              </div>
              <div className="banner-content">
                <div className="banner-badge">
                  {readiness?.ready_for_training ? "PIPELINE READY" : "COLLECTING TRAINING DATA"}
                </div>
                <h2>
                  {readiness?.ready_for_training
                    ? "Models Trained & Ready for Real-Time Inference"
                    : "Building Continuous Time-Aware Training Dataset"}
                </h2>
                <p>
                  Forecasting models require a continuous stream of time-indexed observations (at least {targetRequired} usable lag pairs) across monitored cities to ensure statistical validity and prevent overfitting.
                </p>

                {/* Progress bar */}
                <div className="progress-container">
                  <div className="progress-label-row">
                    <span>Dataset Progress</span>
                    <strong>
                      {usableRows} / {targetRequired} Usable Observations ({progressPercent}%)
                    </strong>
                  </div>
                  <div className="progress-bar-bg">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Metrics */}
            <section className="pred-stats-grid">
              <div className="pred-stat-card">
                <span>TOTAL OBSERVATIONS</span>
                <strong>{readiness?.total_rows ?? "—"}</strong>
                <small>Weather records collected</small>
              </div>

              <div className="pred-stat-card">
                <span>TARGET COVERAGE</span>
                <strong>
                  {readiness?.target_coverage_percent != null
                    ? `${Number(readiness.target_coverage_percent).toFixed(1)}%`
                    : "—"}
                </strong>
                <small>Valid future target pairs</small>
              </div>

              <div className="pred-stat-card">
                <span>USABLE LAG ROWS</span>
                <strong>{usableRows}</strong>
                <small>Clean lag-feature rows</small>
              </div>

              <div className="pred-stat-card">
                <span>FORECAST HORIZON</span>
                <strong>+1h / +3h</strong>
                <small>Forward prediction window</small>
              </div>
            </section>

            {/* City Data Readiness Breakdown */}
            <section className="city-readiness-panel">
              <div className="panel-title">
                <h3>City Training Data Status</h3>
                <span>Observations collected per monitored location</span>
              </div>

              <div className="city-progress-grid">
                {Object.entries(cityStats).map(([city, stats]) => {
                  const cityRows = stats.usable_training_rows ?? 0;
                  const minReq = readiness?.minimum_training_rows_per_city || 20;
                  const cityPct = Math.min(100, Math.round((cityRows / minReq) * 100));

                  return (
                    <div key={city} className="city-progress-card">
                      <div className="c-head">
                        <strong>{city}</strong>
                        <span className="c-badge">
                          {cityRows >= minReq ? "Ready" : "Collecting"}
                        </span>
                      </div>

                      <div className="c-progress-row">
                        <span>Usable: {cityRows} / {minReq} req</span>
                        <span>{cityPct}%</span>
                      </div>
                      <div className="c-bar-bg">
                        <div
                          className="c-bar-fill"
                          style={{ width: `${cityPct}%` }}
                        ></div>
                      </div>

                      <div className="c-meta">
                        <span>Total Records: {stats.total_rows}</span>
                        <span>Recent: {stats.rows_last_2h} in last 2h</span>
                      </div>

                      <button
                        className="c-action-btn"
                        onClick={() => navigate(`/weather?city=${encodeURIComponent(city)}`)}
                        type="button"
                      >
                        Inspect {city} Records →
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Model Architecture Grid */}
            <section className="models-architecture-panel">
              <div className="panel-title">
                <h3>Forecasting Model Candidates</h3>
                <span>Models evaluated in the comparative benchmarking pipeline</span>
              </div>

              <div className="arch-cards-grid">
                <div className="arch-card">
                  <div className="arch-badge">BENCHMARK</div>
                  <h4>Persistence Baseline</h4>
                  <p>
                    Predicts future temperature as current temperature \(T(t+1) = T(t)\). Serves as the minimal sanity threshold for all ML algorithms.
                  </p>
                  <div className="arch-status">
                    Status: <span>{comparison?.models?.persistence?.ready ? "Ready" : "Waiting for Data"}</span>
                  </div>
                </div>

                <div className="arch-card">
                  <div className="arch-badge">LINEAR</div>
                  <h4>Linear Regression</h4>
                  <p>
                    Linear regression on 1h/2h/3h lag temperatures, cyclical hour sin/cos features, and barometric pressure trends.
                  </p>
                  <div className="arch-status">
                    Status: <span>{comparison?.models?.linear_regression?.ready ? "Ready" : "Waiting for Data"}</span>
                  </div>
                </div>

                <div className="arch-card">
                  <div className="arch-badge">TREE ENSEMBLE</div>
                  <h4>Random Forest Regressor</h4>
                  <p>
                    Non-linear ensemble of 100 decision trees capable of capturing non-linear weather interactions and sudden diurnal shifts.
                  </p>
                  <div className="arch-status">
                    Status: <span>{comparison?.models?.random_forest?.ready ? "Ready" : "Waiting for Data"}</span>
                  </div>
                </div>

                <div className="arch-card">
                  <div className="arch-badge">GRADIENT BOOSTED</div>
                  <h4>XGBoost Regressor</h4>
                  <p>
                    High-performance gradient boosting with regularization to prevent overfitting on microclimatic variance.
                  </p>
                  <div className="arch-status">
                    Status: <span>{comparison?.models?.xgboost?.ready ? "Ready" : "Waiting for Data"}</span>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
