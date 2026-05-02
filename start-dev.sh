#!/bin/bash

# Aegis Swarm Development Startup Script
# Starts both backend and frontend servers

echo "🚀 Starting Aegis Swarm Development Environment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if backend dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
    cd backend && npm install && cd ..
fi

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
fi

# Check if backend .env exists
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}❌ backend/.env not found!${NC}"
    echo "Please copy backend/.env.example to backend/.env and configure it."
    exit 1
fi

# Check if gcloud is authenticated
if ! gcloud auth print-access-token &> /dev/null; then
    echo -e "${RED}❌ gcloud not authenticated!${NC}"
    echo "Please run: gcloud auth login"
    exit 1
fi

echo -e "${GREEN}✅ All checks passed!${NC}"
echo ""
echo -e "${BLUE}🔧 Starting Backend (http://localhost:3000)...${NC}"
echo -e "${BLUE}🎨 Starting Frontend (http://localhost:5173)...${NC}"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start backend and frontend in parallel
trap 'kill 0' EXIT

cd backend && npm start &
BACKEND_PID=$!

cd frontend && npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

# Made with Bob
