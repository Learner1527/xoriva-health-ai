# Xoriva OptiPulse HealthOps

Full-stack healthcare operations demo app.

- Frontend: React + Vite
- Backend: FastAPI
- Local DB: SQLite
- Deployment: Render backend + Vercel frontend

## 1. Open in VS Code

Download and unzip this folder, then open the main folder in VS Code.

```bash
cd xoriva-health-ai
code .
```

## 2. Run backend locally

Open a VS Code terminal:

```bash
cd backend
python -m venv venv
```

Activate virtual environment:

Windows:

```bash
venv\Scripts\activate
```

Mac/Linux:

```bash
source venv/bin/activate
```

Install packages:

```bash
pip install -r requirements.txt
```

Start backend:

```bash
uvicorn main:app --reload
```

Backend URL:

```text
http://127.0.0.1:8000
```

API docs:

```text
http://127.0.0.1:8000/docs
```

## 3. Run frontend locally

Open a second VS Code terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

Click **Load demo data** on the homepage.

## 4. Useful agent chat prompts

```text
show low stock
what is inventory value?
how many items?
recommend reorder
```

## 5. Deploy backend to Render

1. Push this project to GitHub.
2. Go to Render.com.
3. Create New Web Service.
4. Select your GitHub repo.
5. Use these settings:

```text
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

After deployment, Render will give a URL like:

```text
https://xoriva-health-ai-backend.onrender.com
```

## 6. Deploy frontend to Vercel

1. Go to Vercel.com.
2. Import the same GitHub repo.
3. Use these settings:

```text
Root Directory: frontend
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

4. Add Environment Variable in Vercel:

```text
VITE_API_URL=https://your-render-backend-url.onrender.com
```

5. Deploy.

## 7. Production upgrade ideas

- Replace SQLite with PostgreSQL.
- Add login/authentication.
- Add real LLM API for the agent.
- Add PDF/SOP upload and RAG chatbot.
- Add forecasting model for inventory demand.
- Add Docker and CI/CD.

