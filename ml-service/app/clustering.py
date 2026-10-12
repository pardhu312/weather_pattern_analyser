import numpy as np
import pandas as pd

from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler


CLUSTER_FEATURES = [
    "avg_temperature",
    "temperature_std",
    "avg_humidity",
    "avg_pressure",
    "avg_wind_speed",
    "avg_cloud_percent",
    "avg_rain_1h",
]

MIN_ROWS_PER_CITY = 10
DEFAULT_MIN_CLUSTERS = 2
DEFAULT_MAX_CLUSTERS = 4


def numpy_kmeans(
    X: np.ndarray,
    n_clusters: int,
    random_state: int = 42,
    max_iter: int = 300,
    n_init: int = 10,
):
    """
    NumPy implementation of K-Means clustering.

    Multiple initializations are used to reduce the chance
    of getting a poor result from a single random starting point.

    Returns:
        best_labels:
            Cluster assignment for each observation.

        best_centroids:
            Final cluster centers.
    """

    if len(X) < n_clusters:
        raise ValueError(
            "Number of observations must be >= number of clusters."
        )

    best_labels = None
    best_centroids = None
    best_inertia = float("inf")

    for init in range(n_init):

        rng = np.random.default_rng(
            random_state + init
        )

        # Choose initial centroids from existing observations.
        indices = rng.choice(
            len(X),
            size=n_clusters,
            replace=False,
        )

        centroids = X[indices].copy()

        for _ in range(max_iter):

            # Distance from each point to each centroid.
            distances = np.linalg.norm(
                X[:, None, :] - centroids[None, :, :],
                axis=2,
            )

            # Assign each point to the nearest centroid.
            labels = np.argmin(
                distances,
                axis=1,
            )

            new_centroids = np.zeros_like(
                centroids
            )

            for cluster_id in range(n_clusters):

                members = X[
                    labels == cluster_id
                ]

                if len(members) == 0:
                    # Reinitialize an empty cluster.
                    new_centroids[cluster_id] = X[
                        rng.integers(len(X))
                    ]
                else:
                    new_centroids[cluster_id] = (
                        members.mean(axis=0)
                    )

            # Stop if centroids have converged.
            if np.allclose(
                centroids,
                new_centroids,
                atol=1e-6,
            ):
                centroids = new_centroids
                break

            centroids = new_centroids

        # Calculate inertia:
        # sum of squared distances to assigned centroid.
        final_distances = np.linalg.norm(
            X - centroids[labels],
            axis=1,
        )

        inertia = np.sum(
            final_distances ** 2
        )

        # Keep the best initialization.
        if inertia < best_inertia:
            best_inertia = inertia
            best_labels = labels.copy()
            best_centroids = centroids.copy()

    return best_labels, best_centroids


def find_best_k(
    X: np.ndarray,
    min_k: int = DEFAULT_MIN_CLUSTERS,
    max_k: int = DEFAULT_MAX_CLUSTERS,
) -> dict:
    """
    Evaluate several K-Means cluster counts using
    silhouette score and select the best one.
    """

    max_allowed = min(
        max_k,
        len(X) - 1,
    )

    if max_allowed < min_k:
        return {
            "ready": False,
            "message": (
                "Not enough cities to evaluate "
                "multiple cluster configurations."
            ),
        }

    evaluations = []

    for k in range(
        min_k,
        max_allowed + 1,
    ):

        labels, centers = numpy_kmeans(
            X,
            n_clusters=k,
            random_state=42,
            n_init=10,
        )

        unique_labels = len(
            np.unique(labels)
        )

        # Silhouette score requires at least two
        # actual clusters.
        if unique_labels < 2:
            continue

        score = silhouette_score(
            X,
            labels,
        )

        evaluations.append({
            "k": k,
            "silhouette_score": float(score),
            "labels": labels,
            "centers": centers,
        })

    if not evaluations:
        return {
            "ready": False,
            "message": (
                "Unable to evaluate cluster "
                "configurations."
            ),
        }

    best = max(
        evaluations,
        key=lambda item: item["silhouette_score"],
    )

    return {
        "ready": True,
        "best_k": int(best["k"]),
        "best_score": float(
            best["silhouette_score"]
        ),
        "evaluations": [
            {
                "k": int(item["k"]),
                "silhouette_score": round(
                    float(
                        item["silhouette_score"]
                    ),
                    4,
                ),
            }
            for item in evaluations
        ],
        "labels": best["labels"],
        "centers": best["centers"],
    }


def build_city_profiles(
    df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Convert observation-level weather data into
    one aggregated weather profile per city.
    """

    data = df.copy()

    data["observed_at"] = pd.to_datetime(
        data["observed_at"],
        utc=True,
    )

    profiles = (
        data.groupby("city")
        .agg(
            observations=("temperature", "count"),
            avg_temperature=(
                "temperature",
                "mean",
            ),
            temperature_std=(
                "temperature",
                "std",
            ),
            avg_humidity=(
                "humidity",
                "mean",
            ),
            avg_pressure=(
                "pressure",
                "mean",
            ),
            avg_wind_speed=(
                "wind_speed",
                "mean",
            ),
            avg_cloud_percent=(
                "cloud_percent",
                "mean",
            ),
            avg_rain_1h=(
                "rain1h",
                "mean",
            ),
        )
        .reset_index()
    )

    # If a city has only one observation,
    # standard deviation becomes NaN.
    profiles["temperature_std"] = (
        profiles["temperature_std"]
        .fillna(0.0)
    )

    return profiles


def cluster_cities(
    df: pd.DataFrame,
) -> dict:
    """
    Cluster cities according to their overall
    weather characteristics.
    """

    profiles = build_city_profiles(df)

    # Only use cities with enough observations.
    profiles = profiles[
        profiles["observations"] >= MIN_ROWS_PER_CITY
    ].copy()

    if len(profiles) < 2:
        return {
            "ready": False,
            "message": (
                "At least 2 cities with sufficient "
                "weather observations are required."
            ),
        }

    # Select the weather-profile features.
    features = profiles[
        CLUSTER_FEATURES
    ]

    # Standardize because the features have
    # very different numeric scales.
    scaler = StandardScaler()

    X_scaled = scaler.fit_transform(
        features
    )

    # Automatically choose the best number
    # of clusters using silhouette score.
    cluster_search = find_best_k(
        X_scaled,
        min_k=DEFAULT_MIN_CLUSTERS,
        max_k=DEFAULT_MAX_CLUSTERS,
    )

    if not cluster_search["ready"]:
        return cluster_search

    n_clusters = cluster_search["best_k"]

    labels = cluster_search["labels"]
    centers = cluster_search["centers"]

    profiles["cluster"] = labels

    silhouette = cluster_search["best_score"]

    # Convert standardized centroids back
    # into the original weather units.
    centers = scaler.inverse_transform(
        centers
    )

    cluster_centers = []

    for cluster_id, center in enumerate(
        centers
    ):

        cluster_centers.append({
            "cluster": int(cluster_id),

            "avg_temperature": round(
                float(center[0]),
                2,
            ),

            "temperature_std": round(
                float(center[1]),
                2,
            ),

            "avg_humidity": round(
                float(center[2]),
                2,
            ),

            "avg_pressure": round(
                float(center[3]),
                2,
            ),

            "avg_wind_speed": round(
                float(center[4]),
                2,
            ),

            "avg_cloud_percent": round(
                float(center[5]),
                2,
            ),

            "avg_rain_1h": round(
                float(center[6]),
                2,
            ),
        })

    cities = []

    for _, row in profiles.iterrows():

        cities.append({
            "city": row["city"],

            "observations": int(
                row["observations"]
            ),

            "cluster": int(
                row["cluster"]
            ),

            "avg_temperature": round(
                float(
                    row["avg_temperature"]
                ),
                2,
            ),

            "temperature_std": round(
                float(
                    row["temperature_std"]
                ),
                2,
            ),

            "avg_humidity": round(
                float(
                    row["avg_humidity"]
                ),
                2,
            ),

            "avg_pressure": round(
                float(
                    row["avg_pressure"]
                ),
                2,
            ),

            "avg_wind_speed": round(
                float(
                    row["avg_wind_speed"]
                ),
                2,
            ),

            "avg_cloud_percent": round(
                float(
                    row["avg_cloud_percent"]
                ),
                2,
            ),

            "avg_rain_1h": round(
                float(
                    row["avg_rain_1h"]
                ),
                2,
            ),
        })

    return {
        "ready": True,

        "method": "K-Means",

        "implementation": "NumPy",

        "clusters": int(
            n_clusters
        ),

        "features": CLUSTER_FEATURES,

        "silhouette_score": round(
            float(silhouette),
            4,
        ),

        "cluster_evaluation": (
            cluster_search[
                "evaluations"
            ]
        ),

        "cities": cities,

        "cluster_centers": cluster_centers,
    }
