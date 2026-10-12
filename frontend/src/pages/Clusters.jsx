import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { getClusters } from "../services/api";
import "./Clusters.css";

export default function Clusters() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedClusterFilter, setSelectedClusterFilter] = useState("all");

  const loadClusters = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const result = await getClusters();
      setData(result);
    } catch (err) {
      console.error("Cluster API error:", err);
      setError(err?.message || "Failed to load clustering analysis.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadClusters();
  }, []);

  const cities = useMemo(() => data?.cities || [], [data]);
  const clusterCenters = useMemo(() => data?.cluster_centers || [], [data]);
  const clusterEvaluation = useMemo(() => data?.cluster_evaluation || [], [data]);

  const clusterColors = ["#38bdf8", "#4ade80", "#fb923c", "#c084fc"];

  const filteredCities = useMemo(() => {
    if (selectedClusterFilter === "all") return cities;
    return cities.filter((c) => String(c.cluster) === selectedClusterFilter);
  }, [cities, selectedClusterFilter]);

  return (
    <div className="clusters-page">
      <Sidebar />

      <main className="clusters-main">
        <header className="clusters-header">
          <div>
            <div className="header-eyebrow">UNSUPERVISED LEARNING</div>
            <h1>City Weather Clusters</h1>
            <p>
              K-Means algorithmic grouping based on multi-dimensional environmental patterns.
            </p>
          </div>

          <button
            className="refresh-btn"
            onClick={() => loadClusters(true)}
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
            <button onClick={() => loadClusters()} type="button">
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Running K-Means cluster analysis...</p>
          </div>
        ) : (
          <>
            {/* Top Stat Cards */}
            <section className="cluster-stats">
              <div className="c-stat-card">
                <span className="c-stat-label">OPTIMAL CLUSTERS</span>
                <strong className="c-stat-val">{data?.clusters ?? "—"}</strong>
                <span className="c-stat-sub">K parameter selected</span>
              </div>

              <div className="c-stat-card">
                <span className="c-stat-label">SILHOUETTE SCORE</span>
                <strong className="c-stat-val">
                  {data?.silhouette_score != null
                    ? Number(data.silhouette_score).toFixed(3)
                    : "—"}
                </strong>
                <span className="c-stat-sub">Cluster cohesion metric</span>
              </div>

              <div className="c-stat-card">
                <span className="c-stat-label">MONITORED CITIES</span>
                <strong className="c-stat-val">{cities.length}</strong>
                <span className="c-stat-sub">Classified locations</span>
              </div>

              <div className="c-stat-card">
                <span className="c-stat-label">ALGORITHM</span>
                <strong className="c-stat-val">{data?.method || "K-Means"}</strong>
                <span className="c-stat-sub">{data?.implementation || "NumPy Engine"}</span>
              </div>
            </section>

            {/* Silhouette Evaluation Grid */}
            {clusterEvaluation.length > 0 && (
              <section className="evaluation-panel">
                <div className="panel-title">
                  <h3>K-Evaluation Comparison (Elbow / Silhouette)</h3>
                  <span>Multi-cluster quality evaluation</span>
                </div>
                <div className="k-eval-grid">
                  {clusterEvaluation.map((item) => (
                    <div
                      key={item.k}
                      className={`k-eval-card ${item.k === data?.clusters ? "best-k" : ""}`}
                    >
                      <div className="k-label">
                        K = {item.k} {item.k === data?.clusters && <span className="best-tag">Optimal</span>}
                      </div>
                      <div className="k-score">
                        Silhouette: <strong>{Number(item.silhouette_score).toFixed(4)}</strong>
                      </div>
                      <div className="k-bar-bg">
                        <div
                          className="k-bar-fill"
                          style={{
                            width: `${Math.max(5, item.silhouette_score * 300)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Filter Toolbar */}
            <div className="cluster-filter-bar">
              <div className="filter-title">Filter by Cluster:</div>
              <div className="filter-buttons">
                <button
                  className={`filter-btn ${selectedClusterFilter === "all" ? "active" : ""}`}
                  onClick={() => setSelectedClusterFilter("all")}
                  type="button"
                >
                  All ({cities.length})
                </button>
                {Array.from(new Set(cities.map((c) => c.cluster))).sort().map((clust) => (
                  <button
                    key={clust}
                    className={`filter-btn ${selectedClusterFilter === String(clust) ? "active" : ""}`}
                    onClick={() => setSelectedClusterFilter(String(clust))}
                    type="button"
                  >
                    <span
                      className="cluster-dot"
                      style={{ background: clusterColors[clust % clusterColors.length] }}
                    ></span>
                    Cluster {clust} ({cities.filter((c) => c.cluster === clust).length})
                  </button>
                ))}
              </div>
            </div>

            {/* City Clusters Grid */}
            <section className="city-clusters-grid">
              {filteredCities.map((city) => {
                const color = clusterColors[city.cluster % clusterColors.length];
                return (
                  <div key={city.city} className="city-cluster-card">
                    <div className="card-top">
                      <div>
                        <h3>{city.city}</h3>
                        <span className="obs-count">{city.observations} observations</span>
                      </div>
                      <span
                        className="cluster-pill"
                        style={{
                          backgroundColor: `${color}18`,
                          borderColor: `${color}40`,
                          color
                        }}
                      >
                        Cluster {city.cluster}
                      </span>
                    </div>

                    <div className="city-metrics-grid">
                      <div className="metric-box">
                        <span>Avg Temp</span>
                        <strong>{city.avg_temperature}°C</strong>
                      </div>
                      <div className="metric-box">
                        <span>Humidity</span>
                        <strong>{city.avg_humidity}%</strong>
                      </div>
                      <div className="metric-box">
                        <span>Pressure</span>
                        <strong>{city.avg_pressure} hPa</strong>
                      </div>
                      <div className="metric-box">
                        <span>Wind Speed</span>
                        <strong>{city.avg_wind_speed} m/s</strong>
                      </div>
                      <div className="metric-box">
                        <span>Cloud Cover</span>
                        <strong>{city.avg_cloud_percent}%</strong>
                      </div>
                      <div className="metric-box">
                        <span>Rainfall</span>
                        <strong>{city.avg_rain_1h ?? 0} mm</strong>
                      </div>
                    </div>

                    <button
                      className="view-weather-btn"
                      onClick={() => navigate(`/weather?city=${encodeURIComponent(city.city)}`)}
                      type="button"
                    >
                      <span>Inspect Live Data</span>
                      <span>→</span>
                    </button>
                  </div>
                );
              })}
            </section>

            {/* Cluster Centers Reference Table */}
            {clusterCenters.length > 0 && (
              <section className="cluster-centers-panel">
                <div className="panel-title">
                  <h3>Cluster Centers (Centroid Profiles)</h3>
                  <span>Average environmental feature values per cluster centroid</span>
                </div>
                <div className="table-responsive">
                  <table className="centers-table">
                    <thead>
                      <tr>
                        <th>Cluster</th>
                        <th>Avg Temp</th>
                        <th>Temp Std</th>
                        <th>Avg Humidity</th>
                        <th>Avg Pressure</th>
                        <th>Avg Wind</th>
                        <th>Cloud Cover</th>
                        <th>Rainfall</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clusterCenters.map((cc) => (
                        <tr key={cc.cluster}>
                          <td>
                            <span
                              className="cluster-pill"
                              style={{
                                color: clusterColors[cc.cluster % clusterColors.length]
                              }}
                            >
                              Cluster {cc.cluster}
                            </span>
                          </td>
                          <td>{cc.avg_temperature}°C</td>
                          <td>±{cc.temperature_std}°C</td>
                          <td>{cc.avg_humidity}%</td>
                          <td>{cc.avg_pressure} hPa</td>
                          <td>{cc.avg_wind_speed} m/s</td>
                          <td>{cc.avg_cloud_percent}%</td>
                          <td>{cc.avg_rain_1h ?? 0} mm</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
