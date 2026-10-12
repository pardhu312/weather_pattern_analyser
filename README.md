# Weather Pattern Analyzer

An end-to-end full-stack weather observation, machine learning analysis, and visualization platform.

## Architecture

- **`weather-api/`**: Spring Boot 4 / Java 17 backend API connected to PostgreSQL, OpenWeather API scheduled data collection, and JWT authentication.
- **`ml-service/`**: Python / FastAPI microservice for weather data analysis, clustering (K-Means), anomaly detection (Isolation Forest), regression models (Linear Regression, Random Forest, XGBoost), and explainability.
- **`frontend/`**: Interactive React 19 + Vite dashboard featuring 3D Three.js Earth visualizations, Recharts weather analytics, anomaly exploration, and machine learning model metrics.

## Deployment on Render

This project is fully configured for deployment on [Render](https://render.com/) with a 1-click Blueprint (`render.yaml`).

For complete deployment instructions, see [**`RENDER_DEPLOYMENT.md`**](./RENDER_DEPLOYMENT.md).

## Local Development

### Prerequisites
- Java 17+ & Maven
- Python 3.10+
- Node.js 18+
- PostgreSQL database

### 1. Database
Create a PostgreSQL database named `weather_db`.

### 2. Weather API
```bash
cd weather-api
# Copy environment template
cp .env.example .env
# Run with Maven
./mvnw spring-boot:run
```

### 3. ML Service
```bash
cd ml-service
# Setup virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
# Run service
uvicorn app.main:app --port 8001 --reload
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
```

## License

This project is licensed under the [MIT License](./LICENSE).
