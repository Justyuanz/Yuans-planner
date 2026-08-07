FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    YUAN_PLANNER_HOST=0.0.0.0 \
    YUAN_PLANNER_PORT=8765 \
    YUAN_PLANNER_DB_PATH=/app/persist/planner.db

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./backend
COPY frontend ./frontend

RUN mkdir -p /app/persist

EXPOSE 8765

CMD ["python", "backend/app.py"]
