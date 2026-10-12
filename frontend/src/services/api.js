const ML_API_URL = import.meta.env.VITE_ML_API_URL || "http://localhost:8001";
const WEATHER_API_URL = import.meta.env.VITE_WEATHER_API_URL || "http://localhost:8080";

function getAuthHeaders() {
    const token = sessionStorage.getItem("weather_token");

    return token
        ? { Authorization: `Bearer ${token}` }
        : {};
}

async function request(
    baseUrl,
    endpoint,
    options = {}
) {
    const response = await fetch(
        `${baseUrl}${endpoint}`,
        {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
                ...(options.headers || {})
            }
        }
    );

    if (response.status === 401) {
        sessionStorage.clear();
        window.location.href = "/login";
        return null;
    }

    if (!response.ok) {
        throw new Error(
            `API request failed: ${response.status}`
        );
    }

    return response.json();
}

export async function getDashboardSummary() {
  return request(ML_API_URL, "/ml/dashboard-summary");
}

export async function getWeatherData() {
  return request(WEATHER_API_URL, "/api/weather");
}

export async function getDatasetSummary() {
  return request(ML_API_URL, "/dataset/summary");
}

export async function getDatasetReadiness() {
  return request(ML_API_URL, "/dataset/readiness");
}

export async function getDatasetEda() {
  return request(ML_API_URL, "/dataset/eda");
}

export async function getAnomalies() {
  return request(ML_API_URL, "/ml/anomalies");
}

export async function getClusters() {
  return request(ML_API_URL, "/ml/clusters");
}

export async function getMlReadiness() {
  return request(ML_API_URL, "/ml/readiness");
}

export async function getModelComparison() {
  return request(ML_API_URL, "/ml/compare");
}

export async function getExplainability() {
  return request(ML_API_URL, "/ml/explainability/random-forest");
}

export async function getEvaluationSummary() {
  return request(ML_API_URL, "/ml/evaluation/summary");
}

export async function fetchLiveWeather(city, lat, lon) {
  const url = `${WEATHER_API_URL}/api/weather/fetch?city=${encodeURIComponent(city)}&lat=${lat}&lon=${lon}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...getAuthHeaders()
    }
  });

  if (response.status === 401) {
    sessionStorage.clear();
    window.location.href = "/login";
    return null;
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to fetch live weather: ${response.status}`);
  }

  return response.json();
}