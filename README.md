# CropYield AI
## AI-Based Agriculture Prediction and Decision-Support Platform

CropYield AI is a presentation-ready full-stack agricultural intelligence platform built around the requirements in the supplied project document. The document specifies an AI-based crop-yield prediction system using selected agricultural parameters, validation and preprocessing, a machine-learning prediction model, evaluation, deployment and understandable decision support. This implementation covers those requirements and adds operational features needed for a complete demonstrable product.

> **Academic/data note:** the bundled ML workflow generates a controlled synthetic demonstration dataset during initialization. This is intentionally transparent. Do not present the generated demo data as official field observations. Replace `data/training_data.csv` with the approved research dataset and retrain before making empirical claims about real farms.

## Included capabilities

### Core academic requirements
- Agricultural input collection
- Crop type selection
- Soil type selection
- Rainfall input
- Temperature input
- Humidity as an additional environmental signal
- Input validation and preprocessing
- Random Forest regression model
- Yield prediction in tonnes/hectare
- Model evaluation using R², MAE and RMSE
- CRISP-DM model workflow page
- Prediction result and understandable decision support
- Retraining path when better data becomes available
- Scalable web/API/database/ML separation

### User platform
- Modern responsive AgriTech SaaS interface
- Immersive agriculture video hero with image fallback
- Glassmorphism/dark agricultural visual system
- Registration, login, logout and password hashing
- Personal dashboard
- Live-refresh KPI cards
- Real-time polling for prediction activity and crop distribution
- Live yield trend chart
- Crop distribution chart
- Environmental signal cards
- Prediction Studio
- Yield range
- Risk score and risk band
- Field condition score
- AI recommendations
- Prediction history
- CSV export
- PDF prediction reports
- Analytics workspace
- Profile settings

### Administration
- Admin-only command center
- User management
- Activate/suspend accounts
- Prediction monitoring
- Model metrics
- System health endpoint
- Model retraining action
- Training dataset generated/managed by the ML training pipeline

### API
- `GET /api/health`
- `GET /api/live`
- `GET /api/analytics`
- `POST /api/predict`

## Technology
- Python 3.11–3.13
- Flask 3.1
- Flask-SQLAlchemy
- Flask-Login
- Flask-WTF / CSRF protection
- SQLite for demo, PostgreSQL-ready through `DATABASE_URL`
- scikit-learn Random Forest Regressor
- pandas / NumPy
- Joblib model artifact
- ReportLab PDF generation
- Chart.js
- Gunicorn

## Project structure

```text
CropYieldAI_Complete/
├── app/
│   ├── __init__.py
│   ├── auth.py
│   ├── main.py
│   ├── models.py
│   ├── templates/
│   └── static/
├── data/
├── ml/
│   ├── train.py
│   ├── predict.py
│   └── artifacts/
├── instance/
├── tests/
├── manage.py
├── run.py
├── requirements.txt
├── Procfile
├── render.yaml
├── runtime.txt
└── README.md
```

## Windows setup

Open PowerShell inside the project folder.

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python manage.py
python run.py
```

Open:

```text
http://127.0.0.1:5000
```

### Demo accounts

**Farmer/User**

```text
Email: demo@cropyield.ai
Password: Demo@12345
```

**Administrator**

```text
Email: admin@cropyield.ai
Password: Admin@12345
```

Change the demo credentials and `SECRET_KEY` before public deployment.

## Presentation flow

1. Open the landing page and show the agricultural video hero.
2. Sign in as the demo farmer.
3. Show the dashboard and live-updating charts.
4. Open Prediction Studio.
5. Enter crop, soil, rainfall, temperature and humidity.
6. Run the prediction.
7. Explain predicted yield, expected range, risk, condition score and recommendations.
8. Open Prediction History.
9. Export CSV and a PDF report.
10. Open Analytics and explain environmental relationships.
11. Open Model Lab and explain CRISP-DM, Random Forest and evaluation metrics.
12. Sign out and enter the admin account.
13. Demonstrate user management, system activity and model metrics.
14. Demonstrate the retrain button.

## Deployment

### Render-style deployment

The repository includes `Procfile`, `render.yaml` and `runtime.txt`.

1. Create a GitHub repository.
2. Push this project folder to GitHub.
3. Create a web service from the repository on your hosting provider.
4. Use:

```text
Build command: pip install -r requirements.txt && python manage.py
Start command: gunicorn run:app
```

5. Set a secure `SECRET_KEY` environment variable.
6. For persistent production data, use PostgreSQL and set `DATABASE_URL` to the provider's PostgreSQL connection string. SQLite is intended for demonstration/local use.

## Replacing the demo dataset

Place the approved dataset at:

```text
data/training_data.csv
```

The training pipeline expects these columns:

```text
crop_type,soil_type,rainfall,temperature,humidity,yield_tph
```

Then run:

```powershell
python manage.py
```

The model will be evaluated and saved to:

```text
ml/artifacts/crop_yield_model.joblib
ml/artifacts/metrics.json
```

## Agriculture background video

The landing and authentication screens contain an HTML5 video background with an agricultural image poster/fallback. The video source is a configurable remote MP4 in the templates. For a fully self-contained offline deployment, download a properly licensed agriculture video and place it at:

```text
app/static/img/agriculture-hero.mp4
```

Then replace the remote `<source>` URL in `landing.html`, `login.html`, and `register.html` with that local file.

## Security notes

- Passwords are hashed with Werkzeug.
- CSRF protection is enabled for forms.
- Admin routes are role restricted.
- User prediction records are scoped to the logged-in user.
- PDF reports verify ownership unless the requester is an administrator.
- Production deployments should use a strong secret key and PostgreSQL.

## Academic limitation to explain during presentation

The source document itself identifies data availability and data quality as limitations and notes that predictions depend on the datasets and assumptions used. This implementation therefore makes the demo dataset transparent and should be retrained on the approved research data before any real-world agricultural claims are made.
