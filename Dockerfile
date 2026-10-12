FROM node:24-alpine AS react-builder

WORKDIR /build

COPY frontend-react/package.json frontend-react/package-lock.json ./
RUN npm ci

COPY frontend-react ./
RUN npm run build

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    YUAN_PLANNER_HOST=0.0.0.0 \
    YUAN_PLANNER_PORT=8765 \
    YUAN_PLANNER_DB_PATH=/app/persist/planner.db \
    YUAN_PLANNER_TIMEZONE=Europe/Helsinki

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends tzdata \
    && rm -rf /var/lib/apt/lists/*

COPY backend ./backend
COPY --from=react-builder /build/dist ./frontend-react/dist

RUN mkdir -p /app/persist

EXPOSE 8765

CMD ["python", "backend/app.py"]
