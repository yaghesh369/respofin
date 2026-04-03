# RespoFin

Customer segmentation and cross-sell recommendation platform for financial products.

RespoFin is a full-stack monorepo with:
- Django REST API backend
- React + Vite frontend
- ML-powered segmentation (K-Means)
- Recommendation, notification, and analytics workflows

This README is designed so a new contributor can clone the repo and run the full project end-to-end.

## Table of Contents

- Overview
- Tech Stack
- Repository Structure
- Prerequisites
- Quick Start (Local Development)
- Environment Variables
- End-to-End Usage Flow
- API Reference (High Level)
- Development Commands
- Troubleshooting
- Security and Production Notes
- Deployment (Vercel + Render)
- Contributing

## Overview

Core capabilities:
- JWT authentication with refresh-token flow
- Customer CRUD and CSV bulk upload
- K-Means segmentation for customer cohorts
- Rule-based product recommendations per segment
- Draft and sent email notification management
- Analytics dashboard data + PDF export

Business flow:
1. User signs up and logs in.
2. Customer data is added manually or uploaded via CSV.
3. Segmentation groups customers into clusters.
4. Recommendations are generated per customer.
5. Draft notifications are created and sent.
6. Analytics summarize customer, recommendation, and notification outcomes.

## Tech Stack

Backend:
- Python
- Django 6
- Django REST Framework
- SimpleJWT
- scikit-learn, NumPy
- PostgreSQL via DATABASE_URL
- ReportLab (PDF export)

Frontend:
- React 19
- Vite 7
- Axios
- React Query
- Chart.js
- Framer Motion
- Tailwind CSS

## Repository Structure

```text
respofin/
|-- backend/
|   |-- manage.py
|   |-- requirements.txt
|   |-- config/
|   |-- accounts/
|   |-- customers/
|   |-- segmentation/
|   |-- recommendations/
|   |-- notifications/
|   \-- analytics/
|-- frontend/
|   |-- package.json
|   |-- vite.config.js
|   \-- src/
|-- customers_test_data.csv
\-- README.md
```

## Prerequisites

- Git
- Python 3.12+
- Node.js 20+
- npm 10+
- A PostgreSQL database URL (SSL-enabled is recommended and aligns with current settings)

Check versions:

```bash
python --version
node --version
npm --version
```

## Quick Start (Local Development)

### 1. Clone repository

```bash
git clone https://github.com/yaghesh369/respofin.git
cd respofin
```

### 2. Setup backend

```bash
cd backend
python -m venv venv
```

Activate virtual environment:

PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Command Prompt:

```bat
venv\Scripts\activate
```

Install dependencies:

```bash
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

### 3. Configure backend environment

Create file: backend/.env

```env
SECRET_KEY=replace-with-a-strong-secret
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost

# Example: postgresql://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/respofin?sslmode=require

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@example.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_TIMEOUT=8

NOTIFICATION_SEND_WORKERS=2
NOTIFICATION_PARALLEL_THRESHOLD=30
```

If your local PostgreSQL instance does not support SSL, either use a managed SSL-enabled database for development, or temporarily relax SSL enforcement in backend/config/settings.py for local-only usage.

Generate a Django secret key (optional helper):

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 4. Run migrations and start backend

```bash
python manage.py migrate
python manage.py runserver
```

Backend base URL:
- http://127.0.0.1:8000

API base URL:
- http://127.0.0.1:8000/api/

Admin:
- http://127.0.0.1:8000/admin/

### 5. Setup frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:
- http://localhost:5173

Note: frontend requests to /api are proxied to http://127.0.0.1:8000 using frontend/vite.config.js.

## Environment Variables

Backend variables used by code:

| Variable | Required | Description |
|---|---|---|
| SECRET_KEY | Yes | Django secret key |
| DEBUG | Yes | True/False |
| ALLOWED_HOSTS | Yes | Comma-separated hosts |
| DATABASE_URL | Yes | Database connection URL |
| EMAIL_HOST | Yes (for sending emails) | SMTP host |
| EMAIL_PORT | Yes (for sending emails) | SMTP port |
| EMAIL_USE_TLS | Yes (for sending emails) | True/False |
| EMAIL_HOST_USER | Yes (for sending emails) | SMTP username/from address |
| EMAIL_HOST_PASSWORD | Yes (for sending emails) | SMTP password/app password |
| EMAIL_TIMEOUT | No | SMTP timeout in seconds (default: 8) |
| NOTIFICATION_SEND_WORKERS | No | Parallel sender workers (default: 2) |
| NOTIFICATION_PARALLEL_THRESHOLD | No | Batch size threshold for parallel sending (default: 30) |

Frontend currently does not require a .env for local development because Vite proxy handles API routing.

For production frontend deployment, set:

| Variable | Required | Description |
|---|---|---|
| VITE_API_BASE_URL | Yes | Backend API base URL, e.g. https://respofin-backend.onrender.com/api/ |

## Deployment (Vercel + Render)

### Backend on Render

This repo includes a Render blueprint file at:
- render.yaml

Steps:
1. Push your repo to GitHub.
2. In Render, choose New + Blueprint and select this repository.
3. Render reads render.yaml and creates the `respofin-backend` service.
4. Update env values in Render dashboard:
	- DATABASE_URL
	- EMAIL_HOST
	- EMAIL_HOST_USER
	- EMAIL_HOST_PASSWORD
	- CORS_ALLOWED_ORIGINS (set to your Vercel URL)
	- CSRF_TRUSTED_ORIGINS (set to your Vercel URL)
5. Deploy and verify backend is reachable at:
	- https://<your-render-service>.onrender.com/api/

### Frontend on Vercel

Frontend includes SPA rewrite config at:
- frontend/vercel.json

Steps:
1. In Vercel, import this repository.
2. Set project root to:
	- frontend
3. Build settings:
	- Build Command: npm run build
	- Output Directory: dist
4. Add environment variable in Vercel:
	- VITE_API_BASE_URL=https://<your-render-service>.onrender.com/api/
5. Deploy and verify frontend login + API requests.

### Final cross-origin checklist

After both deployments:
1. In Render backend env, set ALLOWED_HOSTS to include render host.
2. In Render backend env, set CORS_ALLOWED_ORIGINS to your Vercel URL.
3. In Render backend env, set CSRF_TRUSTED_ORIGINS to your Vercel URL.
4. Keep CORS_ALLOW_ALL_ORIGINS=False in production.

## End-to-End Usage Flow

After both servers are running:

1. Register a new user from the UI.
2. Log in to obtain JWT session.
3. Add customers manually or upload CSV.
4. Run segmentation.
5. Generate recommendations.
6. Review and send notifications.
7. Open analytics and optionally download PDF report.

Sample CSV file is included at repository root:
- customers_test_data.csv

Expected CSV headers:

```csv
name,email,age,income,credit_score,active_product,is_active
```

Notes:
- age, income, and credit_score are required for segmentation.
- At least 3 customers with complete numeric fields are needed to run segmentation.

## API Reference (High Level)

Base path: /api/

Authentication:
- POST auth/register/
- POST auth/login/
- POST auth/logout/
- POST auth/token/refresh/
- GET auth/profile/
- PATCH auth/profile/

Customers:
- GET customers/
- POST customers/
- PATCH customers/{id}/
- DELETE customers/{id}/
- POST customers/bulk-upload/
- DELETE customers/delete-all/

Segmentation:
- POST segmentation/run/
- GET segmentation/stats/

Recommendations:
- GET recommendations/list/
- POST recommendations/customer/{customer_id}/
- POST recommendations/bulk/
- POST recommendations/all/

Notifications:
- GET notifications/drafts/
- GET notifications/sent/
- PATCH notifications/edit/{notification_id}/
- PATCH notifications/sent/edit/{notification_id}/
- POST notifications/send/{notification_id}/
- POST notifications/send-all/
- POST notifications/sent/resend/{notification_id}/
- DELETE notifications/delete/{notification_id}/
- POST notifications/delete-many/
- DELETE notifications/delete-all/

Analytics:
- GET analytics/
- GET analytics/download-pdf/

Auth behavior:
- Most endpoints require Bearer access token.
- Access token is refreshed through auth/token/refresh/.
- Password policy on registration: at least 6 characters, with uppercase, lowercase, number, and special character.
- Logout endpoint expects a refresh token in the request body.

## API Smoke Test (Optional)

Use these commands after backend is running to verify auth quickly:

```bash
# Register
curl -X POST http://127.0.0.1:8000/api/auth/register/ \
	-H "Content-Type: application/json" \
	-d '{"username":"demo_user","email":"demo_user@example.com","password":"Demo@123"}'

# Login
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
	-H "Content-Type: application/json" \
	-d '{"username":"demo_user","password":"Demo@123"}'
```

Use the returned access token as:

```text
Authorization: Bearer <access_token>
```

## Development Commands

Backend (from backend/):

```bash
python manage.py migrate
python manage.py runserver
python manage.py test
python manage.py createsuperuser
```

Frontend (from frontend/):

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## Troubleshooting

### 1) Database connection fails on startup

Symptoms:
- Backend crashes during startup/migrate.

Checks:
- Confirm DATABASE_URL is present in backend/.env.
- Confirm credentials/host/port/db name are correct.
- Confirm your DB accepts SSL if using sslmode=require.

### 2) 401 Unauthorized on API calls

Checks:
- Log in again and confirm tokens are stored.
- Ensure Authorization header is Bearer <access_token>.
- Refresh token via auth/token/refresh/ when access token expires.

### 3) Frontend cannot reach API

Checks:
- Backend is running on 127.0.0.1:8000.
- Frontend is running with npm run dev.
- Do not change /api base path unless you update proxy and API client.

### 4) Email sending fails

Checks:
- Verify SMTP credentials and port.
- For Gmail, use App Password (not normal account password).
- Inspect failed notifications in the notifications module.

### 5) Segmentation does not run

Checks:
- Ensure at least 3 customers exist with age, income, and credit_score values.

## Security and Production Notes

Before production deployment:
- Set DEBUG=False
- Use a strong SECRET_KEY
- Configure ALLOWED_HOSTS for your domain(s)
- Use production-grade PostgreSQL
- Secure SMTP credentials with secret management
- Enable HTTPS at reverse proxy/load balancer level

Do not commit:
- backend/.env
- frontend/.env
- backend/venv
- frontend/node_modules

## Contributing

1. Fork the repository.
2. Create a branch.

```bash
git checkout -b feature/your-feature-name
```

3. Make changes and test locally.
4. Commit and push.
5. Open a Pull Request.

## Maintainer

- GitHub: https://github.com/yaghesh369
