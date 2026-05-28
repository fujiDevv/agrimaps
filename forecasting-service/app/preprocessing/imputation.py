"""
Forward-Fill Imputation for Missing Weekly Price Data
Handles gaps of up to MAX_IMPUTE_GAP consecutive missing weeks.
"""

import numpy as np
import pandas as pd


class PriceImputer:
    def __init__(self, max_gap: int = 2):
        self.max_gap = max_gap

    def impute(self, df: pd.DataFrame, price_col: str = "retail_price") -> pd.DataFrame:
        """
        Forward-fill imputation for gaps up to max_gap consecutive weeks.
        Returns DataFrame with 'is_imputed' flag column.

        Parameters:
            df: DataFrame with datetime index and price column
            price_col: name of the price column

        Returns:
            DataFrame with imputed values and is_imputed boolean column
        """
        df = df.copy()
        df["is_imputed"] = False

        # Identify runs of missing values
        is_null = df[price_col].isnull()
        group = (is_null != is_null.shift()).cumsum()

        for _, grp in df.groupby(group):
            if grp[price_col].isnull().all():
                gap_length = len(grp)
                if gap_length <= self.max_gap:
                    # Forward-fill this gap
                    indices = grp.index
                    df.loc[indices, price_col] = df[price_col].ffill().loc[indices]
                    df.loc[indices, "is_imputed"] = True
                # else: leave as NaN — gap too large for reliable imputation

        return df

    def get_imputation_report(self, original: pd.Series, imputed: pd.Series) -> dict:
        """Generate imputation statistics."""
        total = len(original)
        missing_before = original.isnull().sum()
        missing_after = imputed.isnull().sum()
        imputed_count = missing_before - missing_after

        return {
            "total_observations": total,
            "missing_before": int(missing_before),
            "missing_after": int(missing_after),
            "imputed_count": int(imputed_count),
            "imputed_percentage": round(imputed_count / total * 100, 2) if total > 0 else 0,
            "remaining_gaps": int(missing_after),
        }