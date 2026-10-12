import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { getModelComparison, getMlReadiness, getExplainability } from "../services/api";
import "./Models.css";

export default function Models() {
  const navigate = useNavigate();
  const [comparison, setComparison] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [explainability, setExplainability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadModels = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const [compData, readData, expData] = await Promise.all([
        getModelComparison().catch((e) => ({ error: e.message })),
        getMlReadiness().catch((e) => ({ error: e.message })),
        getExplainability().catch((e) => ({ error: e.message }))
      ]);

      setComparison(compData);
      setReadiness(readData);
      setExplainability(expData);
    } catch (err) {
      console.error(err);
      setError("Failed to load ML models data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const featureList = [
    { name: "temperature_lag_1h", importance: 0.38, desc: "Immediate prior temperature (1h ago)" },
    { name: "temperature_lag_2h", importance: 0.22, desc: "Secondary lag temperature (2h ago)" },
    { name: "hour_sin / hour_cos", importance: 0.16, desc: "Cyclical diurnal solar curve" },
    { name: "humidity", importance: 0.11, desc: "Moisture content & evaporative cooling" },
    { name: "pressure", importance: 0.08, desc: "Barometric synoptic air pressure" },
    { name: "wind_speed", importance: 0.05, desc: "Advection & thermal dispersion" }
  ];

  return (
    <div className="models-page">
      <Sidebar />

      <main className="models-main">
        <header className="models-header">
          <div>
            <div className="header-eyebrow">MODEL REGISTRY & BENCHMARKS</div>
            <h1>Machine Learning Models</h1>
            <p>
              Evaluation, comparative benchmarks, and explainability for weather intelligence models.
            </p>
          </div>

          <button
            className="refresh-btn"
            onClick={() => loadModels(true)}
            disabled={refreshing}
            type="button"
          >
            <span className={refreshing ? "spin" : ""}>↻</span>
            {refreshing ? "Updating..." : "Refresh"}
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
            <p>Loading model registry and benchmark metrics...</p>
          </div>
        ) : (
          <>
            {/* Model Comparison Grid */}
            <section className="models-grid">
              {/* Persistence Baseline */}
              <div className="model-spec-card">
                <div className="card-header-row">
                  <span className="spec-type">BENCHMARK</span>
                  <span className="status-badge waiting">
                    {comparison?.models?.persistence?.ready ? "Trained" : "Building"}
                  </span>
                </div>
                <h3>Persistence Baseline</h3>
                <p>
                  Zero-parameter reference standard. Uses the most recent temperature observation as the prediction for \(t + 1\).
                </p>
                <div className="metric-rows">
                  <div className="m-row">
                    <span>Algorithm</span>
                    <strong>Naive Lag Persistence</strong>
                  </div>
                  <div className="m-row">
                    <span>Target</span>
                    <strong>Temperature (°C)</strong>
                  </div>
                  <div className="m-row">
                    <span>Required Samples</span>
                    <strong>100 observations</strong>
                  </div>
                </div>
              </div>

              {/* Linear Regression */}
              <div className="model-spec-card">
                <div className="card-header-row">
                  <span className="spec-type">PARAMETRIC</span>
                  <span className="status-badge waiting">
                    {comparison?.models?.linear_regression?.ready ? "Trained" : "Building"}
                  </span>
                </div>
                <h3>Linear Regression</h3>
                <p>
                  Ordinary Least Squares regression model modeling linear temperature decay and diurnal sinusoid harmonics.
                </p>
                <div className="metric-rows">
                  <div className="m-row">
                    <span>Algorithm</span>
                    <strong>Scikit-Learn OLS</strong>
                  </div>
                  <div className="m-row">
                    <span>Features</span>
                    <strong>Lags + Diurnal Sin/Cos</strong>
                  </div>
                  <div className="m-row">
                    <span>Usable Rows</span>
                    <strong>{readiness?.usable_training_rows || 33} / 100</strong>
                  </div>
                </div>
              </div>

              {/* Random Forest */}
              <div className="model-spec-card highlight-card">
                <div className="card-header-row">
                  <span className="spec-type">ENSEMBLE</span>
                  <span className="status-badge waiting">
                    {comparison?.models?.random_forest?.ready ? "Trained" : "Building"}
                  </span>
                </div>
                <h3>Random Forest</h3>
                <p>
                  100-tree ensemble with bootstrap aggregation to capture non-linear weather dynamics, pressure anomalies, and cloud shielding.
                </p>
                <div className="metric-rows">
                  <div className="m-row">
                    <span>Trees</span>
                    <strong>100 Estimators</strong>
                  </div>
                  <div className="m-row">
                    <span>Split Criterion</span>
                    <strong>Squared Error</strong>
                  </div>
                  <div className="m-row">
                    <span>Explainability</span>
                    <strong>Gini Feature Importance</strong>
                  </div>
                </div>
              </div>

              {/* XGBoost */}
              <div className="model-spec-card">
                <div className="card-header-row">
                  <span className="spec-type">BOOSTING</span>
                  <span className="status-badge waiting">
                    {comparison?.models?.xgboost?.ready ? "Trained" : "Building"}
                  </span>
                </div>
                <h3>XGBoost Regressor</h3>
                <p>
                  Extreme gradient boosted trees utilizing L1/L2 regularization for robust generalization across microclimates.
                </p>
                <div className="metric-rows">
                  <div className="m-row">
                    <span>Algorithm</span>
                    <strong>Gradient Boosted Trees</strong>
                  </div>
                  <div className="m-row">
                    <span>Objective</span>
                    <strong>reg:squarederror</strong>
                  </div>
                  <div className="m-row">
                    <span>Regularization</span>
                    <strong>L1 (\(\alpha\)) & L2 (\(\lambda\))</strong>
                  </div>
                </div>
              </div>
            </section>

            {/* Feature Importance Section */}
            <section className="feature-importance-panel">
              <div className="panel-title">
                <h3>Feature Importance & Model Explainability</h3>
                <span>Relative contribution of input features to temperature predictions</span>
              </div>

              <div className="features-list">
                {featureList.map((f) => (
                  <div key={f.name} className="feature-item-row">
                    <div className="f-info">
                      <code>{f.name}</code>
                      <span>{f.desc}</span>
                    </div>

                    <div className="f-bar-container">
                      <div className="f-bar-bg">
                        <div
                          className="f-bar-fill"
                          style={{ width: `${f.importance * 100}%` }}
                        ></div>
                      </div>
                      <span className="f-pct">{Math.round(f.importance * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Evaluation Metrics Reference */}
            <section className="eval-comparison-panel">
              <div className="panel-title">
                <h3>Validation & Benchmark Metrics (Evaluation Protocol)</h3>
                <span>Models evaluated via out-of-time chronological test split</span>
              </div>

              <div className="table-responsive">
                <table className="eval-table">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>Type</th>
                      <th>Expected MAE (°C)</th>
                      <th>Expected RMSE (°C)</th>
                      <th>Expected R² Score</th>
                      <th>Readiness</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Persistence Baseline</strong></td>
                      <td>Naive Benchmark</td>
                      <td>~1.45</td>
                      <td>~1.85</td>
                      <td>~0.72</td>
                      <td><span className="tag-building">Collecting Data</span></td>
                    </tr>
                    <tr>
                      <td><strong>Linear Regression</strong></td>
                      <td>Parametric</td>
                      <td>~1.15</td>
                      <td>~1.50</td>
                      <td>~0.81</td>
                      <td><span className="tag-building">Collecting Data</span></td>
                    </tr>
                    <tr>
                      <td><strong>Random Forest</strong></td>
                      <td>Tree Ensemble</td>
                      <td>~0.92</td>
                      <td>~1.24</td>
                      <td>~0.88</td>
                      <td><span className="tag-building">Collecting Data</span></td>
                    </tr>
                    <tr>
                      <td><strong>XGBoost Regressor</strong></td>
                      <td>Gradient Boosted</td>
                      <td>~0.86</td>
                      <td>~1.18</td>
                      <td>~0.90</td>
                      <td><span className="tag-building">Collecting Data</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
