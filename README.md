# PATS (Petri Net Place and Transition Simulator) 

# Brief Description
PATS is intended to be an open source web-application and educational tool meant for students and educators to teach and learn about the basic concepts of distributed systems.

# Images


# Build and Run Instructions

## Prerequisites
- Java 21 or newer
- Node.js and npm
- Git
- Gradle

No IDE is required - PATS can be built and run entirely from the command line.

## Getting Started

### Clone the Repository
```bash
git clone https://github.com/Joseph-Vanliew/PATS
cd pats
```

### Running the Application
There are two options to start the application:

#### Option 1: Using the start script (Recommended)
```bash
# Make the script executable (one-time setup)
chmod +x start_pats.sh
# You will then be able to run the command below on subsequent executions without 'chmod +x' command.
./start_pats.sh
```
```bash
# OR run with bash directly (no chmod needed)
bash start_pats.sh
```

This script will:
- Check for required dependencies
- Install frontend dependencies if needed
- Build the application
- Start both the backend server and frontend development server
- Create log files in the `logs` directory

#### Option 2: Manual setup (Command-line)

1. Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

2. Build and run the application:
```bash
./gradlew build -x test
```

3. Start the backend:
```bash
./gradlew bootRun
```

4. In a separate terminal, start the frontend development server:
```bash
cd frontend
npm run dev
```

### Accessing the Application
- Backend API: http://localhost:8080
- Frontend Development Server: http://localhost:5173

### Stopping the Application
- If using the start script: Press `Ctrl+C` in the terminal where the script is running
- If running manually: Press `Ctrl+C` in each terminal window

## Development

### Project Structure
- `/src/main/java` - Backend Java code
- `/frontend` - React TypeScript frontend
- `/src/main/resources/static` - Build output for frontend (generated)

### Command-Line Development Workflow
PATS is designed to support a complete command-line workflow:
- Use your preferred text editor for code changes
- Run tests with `./gradlew test`
- Check test coverage with `./gradlew jacocoTestReport`
- Run mutation testing with `./gradlew pitest`

### Building for Production
To build the complete application for production:
```bash
./gradlew build
```

The production-ready application will be packaged as a JAR file in the `build/libs` directory. Run it with:
```bash
java -jar build/libs/pats-0.0.1-SNAPSHOT.jar
```