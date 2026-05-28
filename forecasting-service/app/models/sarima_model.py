"""SARIMA model fitting and forecasting for seasonal commodity price series."""

import numpy as np
import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX


class SARIMAModel:
    def __init__(
        self,
        max_p: int = 3,
        max_d: int = 2,
        max_q: int = 3,
        max_P: int = 2,
        max_D: int = 1,
        max_Q: int = 2,
        seasonal_period: int = 52,
    ):
        self.max_p = max_p
        self.max_d = max_d
        self.max_q = max_q
        self.max_P = max_P
        self.max_D = max_D
        self.max_Q = max_Q
        self.seasonal_period = seasonal_period
        self.model = None
        self.fitted = None
        self.best_params = None

    def fit(self, series: pd.Series, d: int = 1, D: int = 1, criterion: str = "aic") -> dict:
        """
        Fit SARIMA model with automatic order selection.
        Uses reduced parameter space for seasonal components
        to manage computational cost with weekly data (period=52).
        """
        best_score = np.inf
        best_order = None
        best_seasonal_order = None
        best_model = None
        candidates_tested = 0

        # Reduced search space for seasonality=52
        # Full grid search would be too expensive
        for p in range(0, self.max_p + 1):
            for q in range(0, self.max_q + 1):
                for P in range(0, self.max_P + 1):
                    for Q in range(0, self.max_Q + 1):
                        if p == 0 and q == 0 and P == 0 and Q == 0:
                            continue
                        try:
                            model = SARIMAX(
                                series,
                                order=(p, d, q),
                                seasonal_order=(P, D, Q, self.seasonal_period),
                                enforce_stationarity=False,
                                enforce_invertibility=False,
                            )
                            fitted_model = model.fit(disp=False, maxiter=200)
                            score = (
                                fitted_model.aic
                                if criterion == "aic"
                                else fitted_model.bic
                            )
                            candidates_tested += 1

                            if score < best_score:
                                best_score = score
                                best_order = (p, d, q)
                                best_seasonal_order = (P, D, Q, self.seasonal_period)
                                best_model = fitted_model
                        except Exception:
                            continue

        if best_model is None:
            raise ValueError("No valid SARIMA model could be fitted to the data")

        self.model = best_model
        self.fitted = best_model
        self.best_params = {
            "order": best_order,
            "seasonal_order": best_seasonal_order,
            "aic": round(best_model.aic, 4),
            "bic": round(best_model.bic, 4),
            "candidates_tested": candidates_tested,
        }

        return self.best_params

    def forecast(self, steps: int, alpha: float = 0.05) -> dict:
        """Generate forecast with confidence intervals."""
        if self.fitted is None:
            raise ValueError("Model must be fitted before forecasting")

        forecast_result = self.fitted.get_forecast(steps=steps)
        mean = forecast_result.predicted_mean
        ci = forecast_result.conf_int(alpha=alpha)

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
            "model_type": "SARIMA",
            "parameters": self.best_params,
            "forecast_values": forecast_values,
        }