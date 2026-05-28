"""ARIMA model fitting and forecasting for non-seasonal commodity price series."""

import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from itertools import product


class ARIMAModel:
    def __init__(self, max_p: int = 5, max_d: int = 2, max_q: int = 5):
        self.max_p = max_p
        self.max_d = max_d
        self.max_q = max_q
        self.model = None
        self.fitted = None
        self.best_params = None

    def fit(self, series: pd.Series, d: int = 1, criterion: str = "aic") -> dict:
        """
        Fit ARIMA model with automatic order selection using AIC/BIC.

        Parameters:
            series: Price time series
            d: Order of differencing (from stationarity tests)
            criterion: 'aic' or 'bic' for model selection
        """
        best_score = np.inf
        best_order = None
        best_model = None
        candidates_tested = 0

        for p in range(0, self.max_p + 1):
            for q in range(0, self.max_q + 1):
                if p == 0 and q == 0:
                    continue
                try:
                    model = ARIMA(series, order=(p, d, q))
                    fitted = model.fit()
                    score = fitted.aic if criterion == "aic" else fitted.bic
                    candidates_tested += 1

                    if score < best_score:
                        best_score = score
                        best_order = (p, d, q)
                        best_model = fitted
                except Exception:
                    continue

        if best_model is None:
            raise ValueError("No valid ARIMA model could be fitted to the data")

        self.model = best_model
        self.fitted = best_model
        self.best_params = {
            "order": best_order,
            "aic": round(best_model.aic, 4),
            "bic": round(best_model.bic, 4),
            "candidates_tested": candidates_tested,
        }

        return self.best_params

    def forecast(self, steps: int, alpha: float = 0.05) -> dict:
        """
        Generate forecast with confidence intervals.

        Parameters:
            steps: Number of weeks to forecast
            alpha: Significance level (0.05 for 95% CI)
        """
        if self.fitted is None:
            raise ValueError("Model must be fitted before forecasting")

        forecast_result = self.fitted.get_forecast(steps=steps)
        mean = forecast_result.predicted_mean
        ci = forecast_result.conf_int(alpha=alpha)

        # Ensure no negative prices
        mean = mean.clip(lower=0)
        ci = ci.clip(lower=0)

        forecast_values = []
        for i in range(steps):
            forecast_values.append({
                "week": i + 1,
                "predicted_price": round(float(mean.iloc[i]), 2),
                "lower_ci": round(float(ci.iloc[i, 0]), 2),
                "upper_ci": round(float(ci.iloc[i, 1]), 2),
            })

        return {
            "model_type": "ARIMA",
            "parameters": self.best_params,
            "forecast_values": forecast_values,
        }