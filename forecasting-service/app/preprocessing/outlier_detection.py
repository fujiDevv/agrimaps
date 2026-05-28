"""
IQR-Based Outlier Detection for Weekly Price Series
Uses a 2.5x multiplier as specified in the study scope.
"""

import numpy as np
import pandas as pd


class OutlierDetector:
    def __init__(self, multiplier: float = 2.5):
        self.multiplier = multiplier

    def detect(
        self, df: pd.DataFrame, price_col: str = "retail_price"
    ) -> pd.DataFrame:
        """
        Flag outliers using IQR method with configurable multiplier.
        Does NOT remove outliers — flags them for downstream filtering.
        """
        df = df.copy()
        df["is_outlier"] = False

        prices = df[price_col].dropna()
        if len(prices) < 4:
            return df

        q1 = prices.quantile(0.25)
        q3 = prices.quantile(0.75)
        iqr = q3 - q1

        lower_bound = q1 - self.multiplier * iqr
        upper_bound = q3 + self.multiplier * iqr

        df.loc[
            (df[price_col] < lower_bound) | (df[price_col] > upper_bound),
            "is_outlier",
        ] = True

        return df

    def get_bounds(
        self, prices: pd.Series
    ) -> tuple:
        """Return (lower_bound, upper_bound) for a price series."""
        q1 = prices.quantile(0.25)
        q3 = prices.quantile(0.75)
        iqr = q3 - q1
        return (q1 - self.multiplier * iqr, q3 + self.multiplier * iqr)

    def get_report(self, df: pd.DataFrame, price_col: str = "retail_price") -> dict:
        """Generate outlier detection summary."""
        total = len(df)
        outliers = df["is_outlier"].sum()
        return {
            "total_observations": total,
            "outliers_detected": int(outliers),
            "outlier_percentage": round(outliers / total * 100, 2) if total > 0 else 0,
        }