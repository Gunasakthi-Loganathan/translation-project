# React Translation App

This project contains a React frontend and a Flask backend.

## Setup

1. Backend
   - `cd backend`
   - `python -m venv venv`
   - `venv\Scripts\activate`
   - `pip install -r requirements.txt`
   - `python app.py`

2. Frontend
   - `cd frontend`
   - `npm install`
   - `npm run dev`

The frontend expects the backend at `http://localhost:5000` and proxies `/api` requests.
