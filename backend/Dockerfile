# Backend Dockerfile - Build Trigger: 1
FROM python:3.11-slim

# Install system dependencies for Pillow, ReportLab, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libjpeg-dev \
    zlib1g-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libopenjp2-7-dev \
    libtiff5-dev \
    tk-dev \
    tcl-dev \
    libharfbuzz-dev \
    libfribidi-dev \
    libxcb1-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Create directories for uploads and QR codes if they don't exist
RUN mkdir -p uploads/profile_photos qr_codes

# Expose port (Render uses 10000 by default, but we'll handle both)
EXPOSE 8000

# Use a shell form for CMD to allow environment variable expansion for the port
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
