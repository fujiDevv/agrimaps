"""Database connection for the forecasting microservice."""

import psycopg2
import psycopg2.extras
from ..config import DATABASE_URL


def get_connection():
    """Get a psycopg2 connection to PostgreSQL."""
    return psycopg2.connect(DATABASE_URL)


def fetch_commodity_data(commodity_id: str) -> list:
    """Fetch historical price data for a commodity from PostgreSQL."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT week_start_date, retail_price, is_imputed, is_outlier
                FROM historical_prices
                WHERE commodity_id = %s
                ORDER BY week_start_date ASC
                """,
                (commodity_id,),
            )
            return cur.fetchall()
    finally:
        conn.close()


def fetch_all_forecastable_commodities() -> list:
    """Fetch all commodities marked as forecastable."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, canonical_name, category, fill_rate,
                       coefficient_of_variation
                FROM commodities
                WHERE is_forecastable = true
                ORDER BY category, canonical_name
                """,
            )
            return cur.fetchall()
    finally:
        conn.close()