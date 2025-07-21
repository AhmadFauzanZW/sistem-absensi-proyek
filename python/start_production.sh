#!/bin/bash

# Production startup script for Face Recognition Service
echo "Starting Face Recognition Service in Production Mode..."

# Set environment variables
export FLASK_ENV=production
export FLASK_PORT=${FLASK_PORT:-5001}
export FLASK_HOST=${FLASK_HOST:-127.0.0.1}

# Activate virtual environment if it exists
if [ -d "~/face_recognition_env" ]; then
    source ~/face_recognition_env/bin/activate
    echo "Virtual environment activated"
fi

# Create logs directory
mkdir -p logs

# Start the service with logging
echo "Starting service on ${FLASK_HOST}:${FLASK_PORT}..."
python face_recognition_server.py >> logs/face_service.log 2>&1 &

# Store PID for later management
echo $! > face_service.pid

echo "Face Recognition Service started with PID: $(cat face_service.pid)"
echo "Logs available at: logs/face_service.log"
echo "To stop: kill \$(cat face_service.pid)"
