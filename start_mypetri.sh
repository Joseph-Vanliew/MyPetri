#!/bin/bash
#
# MyPetri Development Environment Script
# 
# Purpose: Starts the full-stack development environment
# Usage: ./start_mypetri.sh
# 
# Dependencies:
#   - Node.js 18+ and npm
#   - Java 21
#   - Git (for version control)
#
# Author: PATS Development Team
# Date: 2025-07-28
# Version: 1.0.0

# Configuration
PROJECT_NAME="MyPetri"
FRONTEND_PORT=5173
BACKEND_PORT=8080
FRONTEND_DIR="source/client"
BACKEND_DIR="source/server"
LOGS_DIR="source/server/logs"

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Logging functions
log() {
  echo -e "${WHITE}\033[1m==== $1 ====\033[0m${NC}"
}

warn() {
  echo -e "${YELLOW}WARNING: $1${NC}"
}

error() {
  echo -e "${RED}ERROR: $1${NC}"
}

info() {
  echo -e "${WHITE}$1${NC}"
}

success() {
  echo -e "${GREEN}SUCCESS: $1${NC}"
}

test_info() {
  echo -e "${CYAN}TEST: $1${NC}"
}

coverage_info() {
  echo -e "${BLUE}COVERAGE: $1${NC}"
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        error "npm is not installed."
        echo "Please install Node.js and npm by following these instructions:"
        echo "- For Windows/Mac: Download and install from https://nodejs.org/"
        echo "- For Ubuntu/Debian: Run: \$ sudo apt update && sudo apt install nodejs npm"
        echo "- For macOS with Homebrew: Run: \$ brew install node"
        echo "- For Fedora: Run: \$ sudo dnf install nodejs"
        echo "After installation, try running this script again."
        exit 1
    fi

    # Check if Java is installed and is the correct version
    if ! command -v java &> /dev/null; then
        error "Java is not installed."
        echo "Please install Java 21 and try again."
        echo "- For Windows/Mac: Download and install from https://adoptium.net/"
        echo "- For Ubuntu/Debian: Run: \$ sudo apt update && sudo apt install openjdk-21-jdk"
        echo "- For macOS with Homebrew: Run: \$ brew install openjdk@21"
        echo "- For Fedora: Run: \$ sudo dnf install java-21-openjdk-devel"
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
    
    success "All dependencies found"
}

# Check for port conflicts
check_ports() {
    log "Checking port availability..."
    
    # Check for port conflicts
    if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null; then
        error "Backend port $BACKEND_PORT is in use. Cannot start Spring Boot application."
        exit 1
    fi

    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null; then
        warn "Frontend dev server port $FRONTEND_PORT is in use. Vite will try to use another port automatically."
    fi
    
    success "Ports available"
}

# Setup development environment
setup_environment() {
    log "Setting up development environment..."
    
    # Create necessary directories
    mkdir -p $LOGS_DIR
    
    # Ensure Gradle wrapper exists
    if [ ! -f "$BACKEND_DIR/gradlew" ]; then
        info "Gradle wrapper not found. Creating it..."
        if command -v gradle &> /dev/null; then
            cd $BACKEND_DIR
            gradle wrapper
            cd ../..
        else
            warn "Cannot create Gradle wrapper as Gradle is not installed."
            warn "This might cause issues if you don't have Gradle installed globally."
        fi
    fi

    # Set up Gradle command
    GRADLE_CMD="./gradlew"
    if [ ! -f "$BACKEND_DIR/gradlew" ] && command -v gradle &> /dev/null; then
        GRADLE_CMD="gradle"
    fi
    
    # Install frontend dependencies if needed
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        info "Installing frontend dependencies..."
        cd $FRONTEND_DIR
        npm install
        if [ $? -ne 0 ]; then
            error "Failed to install frontend dependencies"
            exit 1
        fi
        cd ../..
    else
        info "Frontend dependencies already installed. Skipping npm install."
    fi
    
    success "Environment setup complete"
}

# Build backend
build_backend() {
    log "Building backend application..."
    cd $BACKEND_DIR
    $GRADLE_CMD build -x test
    if [ $? -ne 0 ]; then
        error "Failed to build the backend application"
        exit 1
    fi
    cd ../..
    success "Backend build complete"
}

# Function to extract and display test results from Gradle output
extract_test_results() {
    local log_file=$1
    
    echo
    test_info "Test Results:"
    
    # Check if build was successful
    if grep -q "BUILD SUCCESSFUL" $log_file; then
        echo -e "   - ${GREEN}All tests PASSED successfully${NC}"
        
        # List all test classes that were executed
        echo
        test_info "Test Classes Executed:"
        echo -e "   - ServiceTest ${GREEN}\033[1mPASSED\033[0m${NC}"
        echo -e "   - ValidatorServiceTest ${GREEN}\033[1mPASSED\033[0m${NC}"
        echo -e "   - MapperTest ${GREEN}\033[1mPASSED\033[0m${NC}"
        echo -e "   - ControllerTest ${GREEN}\033[1mPASSED\033[0m${NC}"
        echo -e "   - IntegrationTest ${GREEN}\033[1mPASSED\033[0m${NC}"
        echo -e "   - PatsApplicationTests ${GREEN}\033[1mPASSED\033[0m${NC}"
        echo -e "   - AnalysisServiceTest ${GREEN}\033[1mPASSED\033[0m${NC}"
    else
        error "   - Some tests failed"
        
        # Check individual test results
        echo
        test_info "Test Classes Status:"
        
        # Check each test class individually
        if grep -q "ServiceTest.*FAILED" $log_file; then
            echo -e "   - ServiceTest ${RED}\033[1mFAILED\033[0m${NC}"
        else
            echo -e "   - ServiceTest ${GREEN}\033[1mPASSED\033[0m${NC}"
        fi
        
        if grep -q "ValidatorServiceTest.*FAILED" $log_file; then
            echo -e "   - ValidatorServiceTest ${RED}\033[1mFAILED\033[0m${NC}"
        else
            echo -e "   - ValidatorServiceTest ${GREEN}\033[1mPASSED\033[0m${NC}"
        fi
        
        if grep -q "MapperTest.*FAILED" $log_file; then
            echo -e "   - MapperTest ${RED}\033[1mFAILED\033[0m${NC}"
        else
            echo -e "   - MapperTest ${GREEN}\033[1mPASSED\033[0m${NC}"
        fi
        
        if grep -q "ControllerTest.*FAILED" $log_file; then
            echo -e "   - ControllerTest ${RED}\033[1mFAILED\033[0m${NC}"
        else
            echo -e "   - ControllerTest ${GREEN}\033[1mPASSED\033[0m${NC}"
        fi
        
        if grep -q "IntegrationTest.*FAILED" $log_file; then
            echo -e "   - IntegrationTest ${RED}\033[1mFAILED\033[0m${NC}"
        else
            echo -e "   - IntegrationTest ${GREEN}\033[1mPASSED\033[0m${NC}"
        fi
        
        if grep -q "PatsApplicationTests.*FAILED" $log_file; then
            echo -e "   - PatsApplicationTests ${RED}\033[1mFAILED\033[0m${NC}"
        else
            echo -e "   - PatsApplicationTests ${GREEN}\033[1mPASSED\033[0m${NC}"
        fi
        
        if grep -q "AnalysisServiceTest.*FAILED" $log_file; then
            echo -e "   - AnalysisServiceTest ${RED}\033[1mFAILED\033[0m${NC}"
        else
            echo -e "   - AnalysisServiceTest ${GREEN}\033[1mPASSED\033[0m${NC}"
        fi
    fi
}

# Function to run tests with comprehensive reporting
run_tests() {
    local test_type=$1
    local test_command=$2
    
    test_info "Running test suite..."
    
    # Create logs directory
    mkdir -p $LOGS_DIR
    
    # Check if we're in the right directory structure
    if [ ! -d "$BACKEND_DIR" ]; then
        error "Server directory not found. Please run this script from the PATS root directory."
        return 1
    fi
    
    cd $BACKEND_DIR
    $GRADLE_CMD $test_command 2>&1 | tee ../logs/${test_type}_tests.log
    cd ../..
    
    local test_result=${PIPESTATUS[0]}
    
    if [ $test_result -eq 0 ]; then
        # Extract and display test results
        extract_test_results "$LOGS_DIR/${test_type}_tests.log"
        
        return 0
    else
        error "$test_type tests failed! Check $LOGS_DIR/${test_type}_tests.log for details."
        
        # Extract and display test results even for failed tests
        extract_test_results "$LOGS_DIR/${test_type}_tests.log"
        
        return 1
    fi
}

# Run test suite
run_test_suite() {
    log "Running test suite..."
    run_tests "full" "test jacocoTestReport"
    FULL_TEST_RESULT=$?
    
    # Check the overall result and provide detailed summary
    if [ $FULL_TEST_RESULT -eq 0 ]; then
        echo
        coverage_info "Coverage Report:"
        
        # Check coverage thresholds
        if grep -q "BUILD SUCCESSFUL" $LOGS_DIR/coverage.log; then
            success "   - ✅ Coverage thresholds met (>80% line, >60% branch)"
            echo "      - 📊 View detailed coverage report: source/server/build/reports/jacoco/test/html/index.html"
            echo "      - 📊 Or run: \$ open source/server/build/reports/jacoco/test/html/index.html"
        else
            warn "   - ⚠️  Coverage thresholds not met - check report for details"
            echo "   - 📊 View detailed coverage report: source/server/build/reports/jacoco/test/html/index.html"
            echo "   - 📊 Or run: \$ open source/server/build/reports/jacoco/test/html/index.html"
        fi
        
    else
        echo
        error "❌ Some tests failed!"
        
        echo
        info "Available test commands:"
        info "   \$ ./gradlew test                    # Run all tests"
        info "   \$ ./gradlew jacocoTestReport       # Generate coverage report"
        info "   \$ ./gradlew jacocoTestCoverageVerification  # Verify coverage thresholds"
        
        # Prompt to continue
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Wait for services to be ready
wait_for_services() {
    echo "Waiting for services to start..."
    sleep 2

    # Check if backend is ready
    while ! lsof -ti:$BACKEND_PORT > /dev/null 2>&1; do
        sleep 0.5
    done

    success "Services started!"
}

# Display status
display_status() {
    echo "Your application is available at:"
    echo -e "  - Backend Server: ${CYAN}http://localhost:$BACKEND_PORT${NC}"
    echo -e "  - Frontend Dev Server: ${CYAN}http://localhost:$FRONTEND_PORT${NC}"
    echo "Press Ctrl+C to stop all services."
}

# Start services
start_services() {
    log "Starting development services..."
    
    # Start frontend
    echo "Starting frontend development server..."
    cd $FRONTEND_DIR
    npm run dev &
    FRONTEND_PID=$!
    cd ../..
    
    # Start backend
    echo "Starting backend development server..."
    cd $BACKEND_DIR
    $GRADLE_CMD bootRun > logs/backend.log 2>&1 &
    BACKEND_PID=$!
    cd ../..
    
    # Wait for services to be ready
    wait_for_services
}

# Function to clean up processes and ensure ports are freed
cleanup() {
    # Set a flag to avoid running cleanup twice
    if [ -n "$CLEANUP_DONE" ]; then
        return
    fi
    CLEANUP_DONE=1
    
    log "Shutting down $PROJECT_NAME development environment"
    
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
    local SPRING_PID=$(lsof -ti:$BACKEND_PORT 2>/dev/null)
    if [ ! -z "$SPRING_PID" ]; then
        # Silently terminate
        kill -9 $SPRING_PID 2>/dev/null || true
    fi
    
    # For the Vite dev server, find and kill any process still using port 5173
    local VITE_PID=$(lsof -ti:$FRONTEND_PORT 2>/dev/null)
    if [ ! -z "$VITE_PID" ]; then
        # Silently terminate
        kill -9 $VITE_PID 2>/dev/null || true
    fi
    
    info "Services stopped successfully"
    
    # Prompt for environment cleanup
    read -p "Clean build artifacts to free disk space? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Cleaning build artifacts"
        
        # Clean backend build artifacts
        cd $BACKEND_DIR && $GRADLE_CMD clean && cd ../..
        
        # Clean frontend build artifacts
        cd $FRONTEND_DIR && rm -rf dist && cd ../..
        
        success "Build artifacts cleaned successfully"
    else
        info "Skipping cleanup"
    fi
}

# Wait for interrupt
wait_for_interrupt() {
    # Cleanup for specific signals
    trap 'cleanup; exit 0' INT TERM

    # A simplified cleanup for EXIT to avoid duplicate messages
    trap 'exit 0' EXIT

    # Wait for both processes
    wait $BACKEND_PID $FRONTEND_PID
}

# Main execution
main() {
    log "Starting $PROJECT_NAME Full-Stack Development Environment"
    
    check_dependencies
    check_ports
    setup_environment
    build_backend
    run_test_suite
    start_services
    display_status
    wait_for_interrupt
}

# Run main function
main "$@"