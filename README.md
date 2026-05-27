# Admin Panel Ties

A full-stack application structure containing a Django backend API and a React (Vite) frontend.

## Project Structure

This repository contains two main parts:
1. **Root Directory**: The Django backend (`manage.py`, `config/`), acting purely as an API.
2. **`frontend/`**: The React Vite project.

## Integrations Prepared
*   **Django REST Framework (`djangorestframework`)**: For building the backend API.
*   **CORS Headers (`django-cors-headers`)**: Configured to allow requests from the React development server.
*   **Supabase (`supabase`, `psycopg2-binary`)**: PostgreSQL and Auth ready.
*   **MongoDB (`pymongo`)**: Direct MongoDB connections.
*   **Cloudinary (`cloudinary`, `django-cloudinary-storage`)**: Media file storage.

## How to Run the Application

You will need two terminal windows to run both servers simultaneously.

### 1. Start the Django Backend Server

Open your first terminal window:

```powershell
# Activate virtual environment (Windows)
.\venv\Scripts\Activate.ps1

# (Optional) Install dependencies if you haven't
pip install -r requirements.txt

# Start the Django API server (runs on http://localhost:8000)
python manage.py runserver
```

### 2. Start the React Frontend Server

Open your second terminal window:

```powershell
# Navigate to the frontend directory
cd frontend

# (Optional) Install dependencies if you haven't
npm install

# Start the Vite React development server (runs on http://localhost:5173)
npm run dev
```

Your React app will automatically open in the browser and is ready to fetch data from the Django API!