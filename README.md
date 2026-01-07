# Customer Segmentation for Cross-Selling Financial Products

This repository contains a **full-stack web application** for **customer segmentation and cross-selling of financial products**.  
It includes:

- **Backend:** Django + Django REST Framework + Machine Learning (K-Means clustering)  
- **Frontend:** React + Vite + Chart.js / Recharts  
- **Notifications:** Email via SMTP  
- **Database:** SQLite (development) / PostgreSQL (production-ready)  

---

## 🗂 Repository Structure

# Customer Segmentation for Cross-Selling Financial Products

This repository contains a **full-stack web application** for **customer segmentation and cross-selling of financial products**.  
It includes:

- **Backend:** Django + Django REST Framework + Machine Learning (K-Means clustering)  
- **Frontend:** React + Vite + Chart.js / Recharts  
- **Notifications:** Email via SMTP  
- **Database:** SQLite (development) / PostgreSQL (production-ready)  

---

## 🗂 Repository Structure

cd backend
# Delete old virtual environment if exists
rmdir /s /q venv        # Windows
# OR
rm -rf venv             # macOS/Linux

# Create a new virtual environment
python -m venv venv

# Activate venv
venv\Scripts\activate    # Windows
# OR
source venv/bin/activate # macOS/Linux

# Upgrade pip, setuptools, wheel
python -m pip install --upgrade pip setuptools wheel

# Install dependencies from requirements.txt
pip install -r requirements.txt
python manage.py migrate   # Create database tables
python manage.py runserver


frontend setup

cd ../frontend
# Install frontend dependencies
npm install
npm run dev


Create .env files in backend and frontend as needed. Example for backend:

# backend/.env
SECRET_KEY=your-django-secret-key
DEBUG=True
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=youremail@gmail.com
EMAIL_HOST_PASSWORD=yourpassword


The frontend vite.config.js already proxies /api to Django backend:

server: {
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
      secure: false,
    }
  }
}

🛠 Usage

Add or upload customer data via backend API / frontend UI

Run customer segmentation (K-Means clustering)

View recommendations for cross-selling

Send personalized email notifications

Visualize analytics dashboards

✅ Contribution Guidelines

Fork the repo

Clone your fork

Follow setup instructions above

Create a branch for new features:

git checkout -b feature/your-feature-name


Make changes → Test → Commit → Push → Create Pull Request

⚡ Notes / Tips

Python 3.11+ recommended

Backend dependencies are pinned to your current requirements.txt

Frontend uses Vite for fast dev server and easy builds

Always activate backend venv before running Django commands

📝 Versions
Component	Version
Python	3.11+
Django	6.0.1
DRF	3.16.1
NumPy	2.4.0
scikit-learn	1.8.0
Node.js	18+
npm	9+
React	18.2
Vite	5+
📧 Contact / Maintainers

Project Owner: Yaghesh (GitHub: yaghesh369
)
