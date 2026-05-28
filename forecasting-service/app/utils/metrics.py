"""Forecast accuracy metrics: RMSE, MAE, MAPE."""

import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error


def calculate_rmse(actual: np.ndarray, predicted: np.ndarray) -> float:
    return round(float(np.sqrt(mean_squared_error(actual, predicted))), 4)


def calculate_mae(actual: np.ndarray, predicted: np.ndarray) -> float:
    return round(float(mean_absolute_error(actual, predicted)), 4)


def calculate_mape(actual: np.ndarray, predicted: np.ndarray) -> float:
    """Mean Absolute Percentage Error — guards against division by zero."""
    mask = actual != 0
    if not mask.any():
        return float("inf")
    return round(
        float(np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100),
        2,
    )


def calculate_all(actual: np.ndarray, predicted: np.ndarray) -> dict:
    return {
        "rmse": calculate_rmse(actual, predicted),
        "mae": calculate_mae(actual, predicted),
        "mape": calculate_mape(actual, predicted),
    }