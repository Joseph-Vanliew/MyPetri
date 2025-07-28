#!/bin/bash

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

success() {
  echo -e "${GREEN}SUCCESS: $1${NC}"
}

test_info() {
  echo -e "${PURPLE}TEST: $1${NC}"
}

coverage_info() {
  echo -e "${CYAN}COVERAGE: $1${NC}"
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
    
    log "Shutting down PATS development environment"
    
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
    
    # Prompt for environment cleanup
    read -p "Clean build artifacts? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Cleaning build artifacts"
        
        # Clean backend build artifacts
        cd source/server && ./gradlew clean && cd ../..
        
        # Clean frontend build artifacts
        cd source/client && rm -rf dist && cd ../..
        
        success "All clean"
    else
        info "Skipping cleanup"
    fi
}

# Cleanup for specific signals
trap 'cleanup; exit 0' INT TERM

# A simplified cleanup for EXIT to avoid duplicate messages
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
if [ ! -f "source/server/gradlew" ]; then
    info "Gradle wrapper not found. Creating it..."
    if command -v gradle &> /dev/null; then
        cd source/server
        gradle wrapper
        cd ../..
    else
        warn "Cannot create Gradle wrapper as Gradle is not installed."
        warn "This might cause issues if you don't have Gradle installed globally."
    fi
fi

# Set up Gradle command
GRADLE_CMD="./gradlew"
if [ ! -f "source/server/gradlew" ] && command -v gradle &> /dev/null; then
    GRADLE_CMD="gradle"
fi

# Install frontend dependencies if node_modules doesn't exist
if [ ! -d "source/client/node_modules" ]; then
    log "Installing frontend dependencies"
    cd source/client
    npm install
    if [ $? -ne 0 ]; then
        error "Failed to install frontend dependencies"
        exit 1
    fi
    cd ../..
else
    info "Frontend dependencies already installed. Skipping npm install."
fi



# Function to run tests with comprehensive reporting
run_tests() {
    local test_type=$1
    local test_command=$2
    
    test_info "Running $test_type tests..."
    
    # Check if we're in the right directory structure
    if [ ! -d "source/server" ]; then
        error "Server directory not found. Please run this script from the PATS root directory."
        return 1
    fi
    
    cd source/server
    $GRADLE_CMD $test_command 2>&1 | tee ../../logs/${test_type}_tests.log
    cd ../..
    
    local test_result=${PIPESTATUS[0]}
    
    if [ $test_result -eq 0 ]; then
        success "$test_type tests passed!"
        return 0
    else
        error "$test_type tests failed! Check logs/${test_type}_tests.log for details."
        return 1
    fi
}

# Function to check specific test results
check_test_results() {
    local log_file=$1
    local test_name=$2
    
    if grep -q "$test_name.*FAILED" $log_file; then
        error "   - ❌ $test_name failed."
        return 1
    else
        success "   - ✅ $test_name passed."
        return 0
    fi
}

# Run comprehensive test suite
log "Running comprehensive test suite"
mkdir -p logs

# Run all tests and generate coverage in one build
run_tests "full" "test jacocoTestReport"
FULL_TEST_RESULT=$?

# Check the overall result and provide detailed summary
if [ $FULL_TEST_RESULT -eq 0 ]; then
    
    echo
    test_info "Individual Test Results:"
    
    # Check specific test files and report their status
    check_test_results "logs/full_tests.log" "org\.petrinet\.ServiceTest"
    check_test_results "logs/full_tests.log" "org\.petrinet\.ValidatorServiceTest"
    check_test_results "logs/full_tests.log" "org\.petrinet\.MapperTest"
    check_test_results "logs/full_tests.log" "org\.petrinet\.ControllerTest"
    check_test_results "logs/full_tests.log" "org\.petrinet\.IntegrationTest"
    check_test_results "logs/full_tests.log" "org\.petrinet\.PatsApplicationTests"
    check_test_results "logs/full_tests.log" "org\.petrinet\.AnalysisServiceTest"

    echo
    test_info "Test Results:"
    success "   - ✅ All tests passed successfully"
    echo
    coverage_info "Coverage Report:"
    
    # Check coverage thresholds
    if grep -q "BUILD SUCCESSFUL" logs/coverage.log; then
        success "   - ✅ Coverage thresholds met (>80% line, >60% branch)"
        info "      - 📊 View detailed coverage report: open source/server/build/reports/jacoco/test/html/index.html"
        info "      - 📊 Or run: open source/server/build/reports/jacoco/test/html/index.html"
    else
        warn "   - ⚠️  Coverage thresholds not met - check report for details"
        info "   - 📊 View detailed coverage report: open source/server/build/reports/jacoco/test/html/index.html"
        info "   - 📊 Or run: - open source/server/build/reports/jacoco/test/html/index.html"
    fi
    
else
    echo
    error "❌ Some tests failed!"
    echo
    test_info "Individual Test Results:"
    
    # Check specific test files
    check_test_results "logs/full_tests.log" "org\.petrinet\.ServiceTest"
    check_test_results "logs/full_tests.log" "org\.petrinet\.ValidatorServiceTest"
    check_test_results "logs/full_tests.log" "org\.petrinet\.MapperTest"
    check_test_results "logs/full_tests.log" "org\.petrinet\.ControllerTest"
    check_test_results "logs/full_tests.log" "org\.petrinet\.IntegrationTest"
    check_test_results "logs/full_tests.log" "org\.petrinet\.PatsApplicationTests"
    check_test_results "logs/full_tests.log" "org\.petrinet\.AnalysisServiceTest"
    
    echo
    info "Available test commands:"
    info "   - ./gradlew test                    # Run all tests"
    info "   - ./gradlew jacocoTestReport       # Generate coverage report"
    info "   - ./gradlew jacocoTestCoverageVerification  # Verify coverage thresholds"
    
    # Original prompt to continue
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Start the frontend first, then backend
echo
log "Starting services"
(
    info "Starting React frontend dev server (default port 5173)..."
    cd source/client
    npm run dev > ../../logs/frontend.log 2>&1
) &

FRONTEND_PID=$!

sleep 2

(
    info "Starting Spring Boot backend on port 8080..."
    $GRADLE_CMD bootRun > logs/backend.log 2>&1
) &

BACKEND_PID=$!

sleep 2

info "  - Backend: http://localhost:8080"
info "Your application is available at:"
echo -e "${YELLOW}  - Frontend Dev Server: http://localhost:5173${NC}"
info "Press Ctrl+C to stop all services."

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID