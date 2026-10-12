import pandas as pd
def add_time_lag(
    df: pd.DataFrame,
    column: str,
    minutes: int,
    tolerance_minutes: int,
) -> pd.DataFrame:

    results = []

    for city, city_df in df.groupby("city"):

        city_df = city_df.sort_values("observed_at").copy()

        current = city_df[
            ["observed_at"]
        ].copy()

        current["lookup_time"] = (
            current["observed_at"]
            - pd.Timedelta(minutes=minutes)
        )

        history = city_df[
            ["observed_at", column]
        ].rename(
            columns={
                "observed_at": "history_time",
                column: f"{column}_{minutes}m_ago",
            }
        )

        merged = pd.merge_asof(
            current.sort_values("lookup_time"),
            history.sort_values("history_time"),
            left_on="lookup_time",
            right_on="history_time",
            direction="backward",
            tolerance=pd.Timedelta(
                minutes=tolerance_minutes
            ),
        )

        merged["city"] = city

        results.append(merged)

    return pd.concat(
        results,
        ignore_index=True
    )

def build_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df["observed_at"] = pd.to_datetime(
        df["observed_at"],
        utc=True
    )

    df = df.sort_values(
        ["city", "observed_at"]
    ).reset_index(drop=True)

    # -----------------------------
    # Time features
    temp_10 = add_time_lag(
    df,
    "temperature",
    minutes=10,
    tolerance_minutes=7,
)

    temp_30 = add_time_lag(
        df,
        "temperature",
        minutes=30,
        tolerance_minutes=12,
    )

    temp_60 = add_time_lag(
        df,
        "temperature",
        minutes=60,
        tolerance_minutes=15,
    )

    humidity_60 = add_time_lag(
        df,
        "humidity",
        minutes=60,
        tolerance_minutes=15,
    )

    pressure_60 = add_time_lag(
        df,
        "pressure",
        minutes=60,
        tolerance_minutes=15,
    )
    # -----------------------------
        # Merge true time-based lag features back into the main dataframe
    lag_frames = [
        temp_10,
        temp_30,
        temp_60,
        humidity_60,
        pressure_60,
    ]

    for lag_df in lag_frames:
        lag_columns = [
            column
            for column in lag_df.columns
            if column.endswith("_ago")
        ]

        df = df.merge(
            lag_df[
                ["city", "observed_at"] + lag_columns
            ],
            on=["city", "observed_at"],
            how="left",
        )
    df["hour"] = df["observed_at"].dt.hour
    df["day_of_week"] = df["observed_at"].dt.dayofweek

    # -----------------------------
    # Row-based historical features
    # We will NOT interpret these as
    # exact time intervals yet.
    # -----------------------------
    grouped_temperature = df.groupby("city")["temperature"]
    grouped_humidity = df.groupby("city")["humidity"]
    grouped_pressure = df.groupby("city")["pressure"]

    df["temperature_lag_1"] = (
        grouped_temperature.shift(1)
    )

    df["temperature_lag_3"] = (
        grouped_temperature.shift(3)
    )

    df["temperature_lag_6"] = (
        grouped_temperature.shift(6)
    )

    df["humidity_lag_1"] = (
        grouped_humidity.shift(1)
    )

    df["pressure_lag_1"] = (
        grouped_pressure.shift(1)
    )

    # -----------------------------
    # Change features
    # -----------------------------
    df["temperature_change"] = (
        df["temperature"]
        - df["temperature_lag_1"]
    )

    df["pressure_change"] = (
        df["pressure"]
        - df["pressure_lag_1"]
    )

    # -----------------------------
    # Rolling features
    # -----------------------------
    df["temperature_rolling_mean_3"] = (
        df.groupby("city")["temperature"]
        .transform(lambda s: s.rolling(3).mean())
    )

    df["humidity_rolling_mean_3"] = (
        df.groupby("city")["humidity"]
        .transform(lambda s: s.rolling(3).mean())
    )

    # -----------------------------
    # Time-aware 1-hour target
    # -----------------------------
    target_parts = []

    for city, city_df in df.groupby("city"):
        city_df = city_df.sort_values("observed_at").copy()

        # Desired future timestamp
        city_df["target_time"] = (
            city_df["observed_at"]
            + pd.Timedelta(hours=1)
        )

        future = city_df[
            ["observed_at", "temperature"]
        ].rename(
            columns={
                "observed_at": "future_observed_at",
                "temperature": "target_temperature_1h",
            }
        )

        # Find the nearest future observation
        merged = pd.merge_asof(
            city_df.sort_values("target_time"),
            future.sort_values("future_observed_at"),
            left_on="target_time",
            right_on="future_observed_at",
            direction="nearest",
            tolerance=pd.Timedelta(minutes=15),
        )

        # How far the matched observation actually is
        merged["target_offset_minutes"] = (
            (
                merged["future_observed_at"]
                - merged["observed_at"]
            )
            .dt.total_seconds()
            / 60
        )
        merged["target_valid"] = (
            merged["target_temperature_1h"].notna()
            & (merged["target_offset_minutes"] >= 45)
            & (merged["target_offset_minutes"] <= 75)
        )

        target_parts.append(merged)

    result = pd.concat(
        target_parts,
        ignore_index=True
    )

    result = result.sort_values(
        ["city", "observed_at"]
    ).reset_index(drop=True)

    return result