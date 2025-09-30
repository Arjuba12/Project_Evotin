FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy semua kode backend
COPY . .

# Jalankan server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
