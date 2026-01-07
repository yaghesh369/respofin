# Customer Segmentation for Cross-Selling Financial Products

A full-stack web application that performs customer segmentation using machine learning
and generates personalized financial product recommendations for cross-selling.
This project simulates a real-world banking decision support system.

--------------------------------------------------

FEATURES

• Secure authentication using JWT
• Customer data management (CRUD + CSV upload)
• Customer segmentation using K-Means clustering
• Rule-based financial product recommendations
• Email notifications for personalized offers
• Analytics dashboards and insights
• Monorepo architecture (Backend + Frontend)

--------------------------------------------------

TECH STACK

Backend:
• Django
• Django REST Framework
• JWT Authentication
• NumPy, Pandas, Scikit-learn
• SQLite (Development)
• PostgreSQL (Production)

Frontend:
• React
• Vite
• Axios
• Chart.js / Recharts

--------------------------------------------------

PROJECT STRUCTURE (MONOREPO)

respofin/
│
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── config/
│   ├── apps/
│   └── venv/        (not committed)
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── node_modules/ (not committed)
│
├── .gitignore
└── README.md

--------------------------------------------------

PREREQUISITES

• Python 3.11 or higher
• Node.js 18 or higher
• npm 9 or higher
• Git

Check versions:

python --version
node --version
npm --version

--------------------------------------------------

SETUP INSTRUCTIONS (START FROM SCRATCH)

STEP 1: CLONE THE REPOSITORY

git clone https://github.com/yaghesh369/respofin.git
cd respofin

--------------------------------------------------

BACKEND SETUP (DJANGO)

STEP 2: CREATE VIRTUAL ENVIRONMENT

cd backend

Remove old virtual environment if it exists:

Windows:
rmdir /s /q venv

Linux / macOS:
rm -rf venv

Create virtual environment:
python -m venv venv

--------------------------------------------------

STEP 3: ACTIVATE VIRTUAL ENVIRONMENT

Windows:
venv\Scripts\activate

Linux / macOS:
source venv/bin/activate

--------------------------------------------------

STEP 4: INSTALL BACKEND DEPENDENCIES

Upgrade pip tools:
python -m pip install --upgrade pip setuptools wheel

Install dependencies:
pip install -r requirements.txt

If errors occur (Windows users):
pip install --only-binary=:all: -r requirements.txt

--------------------------------------------------

STEP 5: RUN DATABASE MIGRATIONS

python manage.py migrate

--------------------------------------------------

STEP 6: START DJANGO SERVER

python manage.py runserver

Backend will run at:
http://127.0.0.1:8000

--------------------------------------------------

FRONTEND SETUP (REACT + VITE)

STEP 7: INSTALL FRONTEND DEPENDENCIES

cd ../frontend
npm install

--------------------------------------------------

STEP 8: START FRONTEND SERVER

npm run dev

Frontend will run at:
http://localhost:5173

--------------------------------------------------

ENVIRONMENT VARIABLES

Create a .env file inside backend folder:

SECRET_KEY=your-django-secret-key
DEBUG=True
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

IMPORTANT:
Do NOT commit .env files to GitHub.

--------------------------------------------------

APPLICATION WORKFLOW

1. Admin logs in
2. Customer data is added or uploaded
3. Machine learning segmentation is executed
4. Customers are grouped into segments
5. Product recommendations are generated
6. Analytics dashboards are displayed
7. Personalized emails are sent

--------------------------------------------------

CONTRIBUTION GUIDELINES

1. Fork the repository
2. Clone your fork
3. Create a new branch

git checkout -b feature/your-feature-name

4. Make changes and test locally
5. Commit changes
6. Push and create a Pull Request

--------------------------------------------------

BACKEND DEPENDENCY VERSIONS

• Django: 6.0.1
• Django REST Framework: 3.16.1
• NumPy: 2.4.0
• Pandas: 2.3.3
• Scikit-learn: 1.8.0
• SciPy: 1.16.3
• JWT: SimpleJWT

--------------------------------------------------

IMPORTANT NOTES

• Always activate the virtual environment before backend work
• Use Python 3.11 or higher
• Do not commit venv or node_modules
• Start backend before frontend

--------------------------------------------------

FUTURE ENHANCEMENTS

• Real-time transaction streaming
• Automated email and SMS notifications
• Advanced ML and deep learning models
• Mobile application
• Banking system integrations

--------------------------------------------------

MAINTAINER

Yaghesh
GitHub: https://github.com/yaghesh369

--------------------------------------------------

REFERENCES

Django: https://docs.djangoproject.com/
Django REST Framework: https://www.django-rest-framework.org/
React: https://react.dev/
Vite: https://vitejs.dev/
Scikit-learn: https://scikit-learn.org/
