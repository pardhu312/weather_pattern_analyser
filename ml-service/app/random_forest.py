import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (
    mean_absolute_error,
    root_mean_squared_error,
    r2_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from .training_data import (
    FEATURES,
    TARGET,
    prepare_training_data,
)


def train_random_forest(
    df: pd.DataFrame,
) -> dict:

    prepared = prepare_training_data(df)

    if not prepared["ready"]:
        return {
            "ready": False,
            "message": prepared["message"],
            "usable_training_rows": prepared.get(
                "usable_rows",
                0,
            ),
            "rows_per_city": prepared.get(
                "rows_per_city",
                {},
            ),
        }

    train = prepared["train"]
    test = prepared["test"]

    X_train = train[FEATURES]
    y_train = train[TARGET]

    X_test = test[FEATURES]
    y_test = test[TARGET]

    categorical_features = ["city"]

    numerical_features = [
        feature
        for feature in FEATURES
        if feature != "city"
    ]

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "city",
                OneHotEncoder(
                    handle_unknown="ignore"
                ),
                categorical_features,
            ),
            (
                "numeric",
                "passthrough",
                numerical_features,
            ),
        ]
    )

    model = Pipeline(
        steps=[
            (
                "preprocessor",
                preprocessor,
            ),
            (
                "model",
                RandomForestRegressor(
                    n_estimators=300,
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )

    model.fit(
        X_train,
        y_train,
    )

    predictions = model.predict(X_test)

    mae = mean_absolute_error(
        y_test,
        predictions,
    )

    rmse = root_mean_squared_error(
        y_test,
        predictions,
    )

    r2 = r2_score(
        y_test,
        predictions,
    )

    return {
        "ready": True,
        "model": "Random Forest",
        "total_usable_rows": int(
            len(prepared["data"])
        ),
        "train_rows": int(len(train)),
        "test_rows": int(len(test)),
        "rows_per_city": prepared[
            "rows_per_city"
        ],
        "features": FEATURES,
        "metrics": {
            "MAE": round(float(mae), 4),
            "RMSE": round(float(rmse), 4),
            "R2": round(float(r2), 4),
        },
    }