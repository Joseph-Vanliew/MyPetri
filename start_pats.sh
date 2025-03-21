#!/bin/bash

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# colored messages
log() {
  echo -e "${GREEN}==== $1 ====${NC}"
}

warn() {
  echo -e "${YELLOW}WARNING: $1${NC}"
}

error() {
  echo -e "${RED}ERROR: $1${NC}"
}

info() {
  echo -e "${BLUE}INFO: $1${NC}"
}

log "Starting PATS Full-Stack Development Environment"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    error "npm is not installed."
    echo "Please install Node.js and npm by following these instructions:"
    echo "- For Windows/Mac: Download and install from https://nodejs.org/"
    echo "- For Ubuntu/Debian: Run 'sudo apt update && sudo apt install nodejs npm'"
    echo "- For macOS with Homebrew: Run 'brew install node'"
    echo "- For Fedora: Run 'sudo dnf install nodejs'"
    echo "After installation, try running this script again."
    exit 1
fi

# Check if Java is installed and is the correct version
if ! command -v java &> /dev/null; then
    error "Java is not installed."
    echo "Please install Java 21 and try again."
    echo "- For Windows/Mac: Download and install from https://adoptium.net/"
    echo "- For Ubuntu/Debian: Run 'sudo apt update && sudo apt install openjdk-21-jdk'"
    echo "- For macOS with Homebrew: Run 'brew install openjdk@21'"
    echo "- For Fedora: Run 'sudo dnf install java-21-openjdk-devel'"
    echo "After installation, try running this script again."
    exit 1
fi

# Check Java version for compatibility
JAVA_VERSION=$(java -version 2>&1 | head -1 | cut -d'"' -f2 | sed 's/^1\.//' | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 21 ]; then
    warn "You're using Java $JAVA_VERSION, but the project requires Java 21."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Function to clean up processes and ensure ports are freed
cleanup() {
    # Set a flag to avoid running cleanup twice
    if [ -n "$CLEANUP_DONE" ]; then
        return
    fi
    CLEANUP_DONE=1
    
    log "Shutting down PATS services"
    
    # Kill the main processes we started
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Brief pause to allow normal termination
    sleep 1
    
    # For the Spring Boot backend, find and kill any process still using port 8080
    local SPRING_PID=$(lsof -ti:8080 2>/dev/null)
    if [ ! -z "$SPRING_PID" ]; then
        # Silently terminate
        kill -9 $SPRING_PID 2>/dev/null || true
    fi
    
    # For the Vite dev server, find and kill any process still using port 5173
    local VITE_PID=$(lsof -ti:5173 2>/dev/null)
    if [ ! -z "$VITE_PID" ]; then
        # Silently terminate
        kill -9 $VITE_PID 2>/dev/null || true
    fi
    
    info "Services stopped successfully"
}

# Register cleanup for specific signals
trap 'cleanup; exit 0' INT TERM

# Register a simplified cleanup for EXIT to avoid duplicate messages
trap 'exit 0' EXIT

# Check for port conflicts
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null; then
        error "Port $1 is already in use. Please free this port and try again."
        return 1
    fi
    return 0
}

# Check for port conflicts
if ! check_port 8080; then
    error "Backend port 8080 is in use. Cannot start Spring Boot application."
    exit 1
fi

if ! check_port 5173; then
    warn "Frontend dev server port 5173 is in use. Vite will try to use another port automatically."
fi

# Ensure Gradle wrapper exists
if [ ! -f "./gradlew" ]; then
    info "Gradle wrapper not found. Creating it..."
    if command -v gradle &> /dev/null; then
        gradle wrapper
    else
        warn "Cannot create Gradle wrapper as Gradle is not installed."
        warn "This might cause issues if you don't have Gradle installed globally."
    fi
fi

# Set up Gradle command
GRADLE_CMD="./gradlew"
if [ ! -f "./gradlew" ] && command -v gradle &> /dev/null; then
    GRADLE_CMD="gradle"
fi

# Install frontend dependencies if node_modules doesn't exist
if [ ! -d "frontend/node_modules" ]; then
    log "Installing frontend dependencies"
    cd frontend
    npm install
    if [ $? -ne 0 ]; then
        error "Failed to install frontend dependencies"
        exit 1
    fi
    cd ..
else
    info "Frontend dependencies already installed. Skipping npm install."
fi

# Build the backend first (without tests)
log "Building the application"
$GRADLE_CMD build -x test
if [ $? -ne 0 ]; then
    error "Failed to build the application"
    exit 1
fi

# Run backend tests after successful build
log "Running backend tests"
mkdir -p logs
$GRADLE_CMD test --quiet > logs/tests.log 2>&1
TEST_RESULT=$?
if [ $TEST_RESULT -eq 0 ]; then
    info "✅ All tests passed!"
else
    error "❌ Tests failed! Check logs/tests.log for details."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Start the backend and frontend in parallel
log "Starting services"
(
    info "Starting Spring Boot backend on port 8080..."
    $GRADLE_CMD bootRun > logs/backend.log 2>&1
) &

BACKEND_PID=$!

(
    info "Starting React frontend dev server (default port 5173)..."
    cd frontend
    npm run dev > ../logs/frontend.log 2>&1
) &

FRONTEND_PID=$!

info "Services are starting. Check logs/backend.log and logs/frontend.log for details."
info "Your application will be available at:"
info "  - Backend: http://localhost:8080"
info "  - Frontend Dev Server: http://localhost:5173"
info "Press Ctrl+C to stop all services."

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID