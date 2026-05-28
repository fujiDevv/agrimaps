# Agrimaps Backend (Powered by Bun)

This directory contains the Node.js API for Agrimaps. It has been migrated to use [Bun](https://bun.sh/) for blazing-fast execution, dependency management, and hot-reloading.

## Prerequisites
- **Bun**: Replaces Node.js, `npm`, and `nodemon`. Supported on Windows (v1.1+), macOS, and Linux.
- **PostgreSQL**: Relational database (v15 or higher recommended).
- **PostGIS**: Spatial database extension for PostgreSQL.
- **Python 3.9+**: For the forecasting microservice.

---

## 1. System-Specific Installations

### 🍏 macOS (Homebrew)
*Note: Homebrew has specific quirks with PostGIS linking and Python `expat` libraries.*
```bash
# 1. Install latest PostgreSQL (PostGIS requires the latest version on Homebrew)
brew install postgresql postgis
brew services start postgresql

# 2. Force link the PostgreSQL tools to your terminal
brew link postgresql@18 --force
```
*For Python:* Use the built-in macOS Python (`/usr/bin/python3`) for the forecasting service to avoid `pip` errors with Homebrew Python installations.

### 🐧 Linux (Ubuntu / Debian)
```bash
# 1. Install PostgreSQL and PostGIS
sudo apt update
sudo apt install postgresql postgresql-contrib postgis python3-venv python3-pip

# 2. Start and enable the service
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 🪟 Windows
1. **PostgreSQL**: Download and run the official Windows installer from [EnterpriseDB](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads). 
2. **PostGIS**: At the end of the PostgreSQL installation, check the box to launch **Stack Builder**. Use Stack Builder to download and install the **PostGIS** extension.
3. **Add to PATH**: Ensure `C:\Program Files\PostgreSQL\<version>\bin` is added to your Windows Environment Variables so you can use the `psql` command.

---

## 2. Database Setup

Once PostgreSQL and PostGIS are installed, open your terminal (or Command Prompt) and run the following. 

*(On Linux, you may need to switch to the postgres user first: `sudo -i -u postgres`)*

```bash
# 1. Create the database user and database
psql -d postgres -c "CREATE USER agrimaps_admin WITH PASSWORD 'agrimaps_secure_2025';"
psql -d postgres -c "CREATE DATABASE agrimaps OWNER agrimaps_admin;"
psql -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE agrimaps TO agrimaps_admin;"

# 2. Install PostGIS on the agrimaps database
# (Must be done as a PostgreSQL superuser)
psql -d agrimaps -c "CREATE EXTENSION postgis;"

# 3. Apply the database schema (Run from the project root)
cd agrimaps
psql -U agrimaps_admin -d agrimaps -h localhost -f database/init.sql
```

---

## 3. Seeding the Database

Once the schema is applied, populate the database with the provided seed script using Bun. This creates 19 markets, 38 commodities, 3 test users, and 520 historical price records.

```bash
cd backend
bun run seeds/run.js
```

---

## 4. Forecasting Service Setup

The forecasting service uses Python and FastAPI. Set up the virtual environment in its directory.

**macOS / Linux:**
```bash
cd forecasting-service
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Windows:**
```cmd
cd forecasting-service
python -m venv venv
venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## 5. Running the Backend API

First, ensure you have copied the environment variables:

**macOS / Linux:** `cp .env.example .env`
**Windows:** `copy .env.example .env`

Install the dependencies with Bun:
```bash
cd backend
bun install
```

Start the backend:
```bash
# For development with live-reloading:
bun run dev

# For production/standard execution:
bun start
```

## Available Scripts
- `bun start`: Runs the server normally.
- `bun run dev`: Runs the server in watch mode (auto-restarts on changes).
- `bun test`: Runs Jest tests.
- `bun run lint`: Lints the codebase using ESLint.
