import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
MODEL_CACHE_DIR = os.getenv("MODEL_CACHE_DIR", "./model_cache")
LOG_LEVEL = os.getenv("LOG_LEVEL", "info")
WORKERS = int(os.getenv("WORKERS", "2"))

# Forecasting parameters
MIN_HISTORICAL_WEEKS = 52  # Minimum 1 year
MIN_FILL_RATE = 0.80
MAX_CV = 0.50
CONFIDENCE_LEVEL = 0.95
MAX_IMPUTE_GAP = 2  # Maximum consecutive missing weeks for forward-fill
IQR_MULTIPLIER = 2.5  # Outlier detection threshold
AIC_BIC_PREFERENCE = "aic"  # Primary model selection criterion

# Forecast horizons
HORIZON_WEEKS = [4, 13]