import pandas as pd


FEATURES = [
    "city",
    "temperature",
    "humidity",
    "pressure",
    "wind_speed",
    "cloud_percent",
    "rain1h",
    "hour",
    "day_of_week",
    "temperature_10m_ago",
    "temperature_30m_ago",
]

TARGET = "target_temperature_1h"

MIN_TOTAL_ROWS = 100
MIN_ROWS_PER_CITY = 20
TEST_SIZE = 0.20


def prepare_training_data(df: pd.DataFrame) -> dict:

    data = df.copy()

    data["observed_at"] = pd.to_datetime(
        data["observed_at"],
        utc=True
    )

    # Only valid 1-hour targets
    data = data[
        data["target_valid"] == True
    ].copy()

    # Only rows containing every feature and the target
    data = data.dropna(
        subset=FEATURES + [TARGET]
    )

    data = data.sort_values(
        ["city", "observed_at"]
    ).reset_index(drop=True)

    if data.empty:
        return {
            "ready": False,
            "message": "No usable training rows."
        }

    rows_per_city = (
        data["city"]
        .value_counts()
        .sort_index()
        .to_dict()
    )

    if len(data) < MIN_TOTAL_ROWS:
        return {
            "ready": False,
            "message": (
                f"Only {len(data)} usable training rows. "
                f"At least {MIN_TOTAL_ROWS} are required."
            ),
            "usable_rows": int(len(data)),
            "rows_per_city": {
                city: int(count)
                for city, count in rows_per_city.items()
            }
        }

    cities_below_minimum = [
        city
        for city, count in rows_per_city.items()
        if count < MIN_ROWS_PER_CITY
    ]

    if cities_below_minimum:
        return {
            "ready": False,
            "message": (
                "Some cities do not have enough training rows."
            ),
            "usable_rows": int(len(data)),
            "rows_per_city": {
                city: int(count)
                for city, count in rows_per_city.items()
            },
            "cities_below_minimum": cities_below_minimum
        }

    # ------------------------------------------------
    # Chronological split PER CITY
    # This guarantees every city contributes to
    # both training and testing.
    # ------------------------------------------------
    train_parts = []
    test_parts = []

    for city, city_df in data.groupby(
        "city",
        sort=True
    ):

        city_df = city_df.sort_values(
            "observed_at"
        ).reset_index(drop=True)

        split_index = int(
            len(city_df) * (1 - TEST_SIZE)
        )

        train_parts.append(
            city_df.iloc[:split_index]
        )

        test_parts.append(
            city_df.iloc[split_index:]
        )

    train_df = pd.concat(
        train_parts,
        ignore_index=True
    )

    test_df = pd.concat(
        test_parts,
        ignore_index=True
    )

    train_df = train_df.sort_values(
        "observed_at"
    ).reset_index(drop=True)

    test_df = test_df.sort_values(
        "observed_at"
    ).reset_index(drop=True)

    return {
        "ready": True,
        "data": data,
        "train": train_df,
        "test": test_df,
        "rows_per_city": {
            city: int(count)
            for city, count in rows_per_city.items()
        }
    }