# MyPetri (Petri Net Place and Transition Simulator) 

# A Brief Description
MyPetri is intended to be an open source web-application and educational tool meant for students and educators to teach and learn about the basic concepts of distributed systems.

# Technologies
- Java 21 - backend API for next state and conflict detection/resolution and validation, analysis.
- Typescript 5.6 - core logic for elements and structuring of the client.
- CSS
- Vite/REACT - Frontend Build
- Springboot - Backend API Framework and testing and build tool
- Gradle - Backend build tool
- Docker - For packaging the backend with the frontend for deployment
- GCP (Google Cloud Platform) Cloud Run Instance for deployment

# Project Structure
```
PATS/
├── source/
│   ├── client/          # React frontend application
│   │   ├── src/         # Source code
│   │   ├── public/      # Static assets
│   │   └── package.json # Frontend dependencies
│   └── server/          # Spring Boot backend application
│       ├── src/         # Java source code
│       ├── build.gradle # Backend dependencies
│       └── gradlew      # Gradle wrapper
├── examples/            # Example Petri net files
├── screenshots/         # Application screenshots
├── logs/               # Application logs
├── Dockerfile          # Container configuration
├── .dockerignore       # Docker ignore rules
└── start_mypetri.sh    # Development startup script
```


## The App
<img src="screenshots/Dining%20Philosophers%20Whole%20View.png" alt="Dining Philosophers Whole View" width="500"/> <br>
## Basic Token Movement<br>
<img src="screenshots/Basic%20Input.png" alt="Basic Input" width="200"/><br>
<img src="screenshots/Basic%20Output.png" alt="Basic Output" width="200"/><br>
## Token Animation<br/>
<img src="screenshots/TOKEN_ANIMATION.gif" alt="Token Animation" width="500"/><br/>
## Transition Conflict<br>
<img src="screenshots/Transition%20Conflict.png" alt="Transition Conflict" width="200"/><br>
## Solving Transition Conflict<br>
<img src="screenshots/Locking%20Inhibitor%20Example.png" alt="Locking Inhibitor Example" width="300"/><br>
## An example net to validate<br>
<img src="screenshots/Validator%20Output.png" alt="Validator Output" width="300"/><br>
## Validating with expected inputs and outputs<br>
<img src="screenshots/Validator%20Parameters.png" alt="Validator Parameters" width="300"/><br>
## Validation Result (proving the net)<br>
<img src="screenshots/Validation%20Result.png" alt="Validation Result" width="300"/><br>

# Build and Run Instructions

## Prerequisites
- Java 21 or newer
- Node.js and npm
- Git
- Gradle

No IDE is required - MyPetri can be built and run entirely from the command line.

## Getting Started

### Clone the Repository
```bash
git clone https://github.com/Joseph-Vanliew/MyPetri
cd MyPetri
```

### Running the Application
There are two options to start the application:

### Option 1: Using the start script (Recommended)

#### Make the script executable (one-time setup)
```bash
chmod +x start_mypetri.sh
```
#### You will then be able to run the command below on subsequent executions without 'chmod +x' command.
```bash
./start_mypetri.sh
```
#### OR run with bash directly (no chmod needed)
```bash
bash start_mypetri.sh
```

This script will:
- Check for required dependencies.
- Prompt the user to install tools needed to run application
- Install frontend dependencies if needed
- Build the application
- Start both the backend server and frontend development server
- Create log files in the `logs` directory

### Option 2: Manual setup (Command-line)

1. Install frontend dependencies:
```bash
cd source/client
npm install
cd ../..
```

2. Build and run the application:
```bash
cd source/server
./gradlew build -x test
cd ../..
```

3. Start the backend:
```bash
cd source/server
./gradlew bootRun
cd ../..
```

4. In a separate terminal, start the frontend development server:
```bash
cd source/client
npm run dev
```

### Accessing the Application
- Backend API: http://localhost:8080
- Frontend Development Server: http://localhost:5173

### Stopping the Application
- If using the start script: Press `Ctrl+C` in the terminal where the script is running
- If running manually: Press `Ctrl+C` in each terminal window

## Docker Deployment

### Building the Docker Image
```bash
docker build -t pats-app .
```

### Running the Docker Container
```bash
docker run -p 8080:8080 pats-app
```

The application will be available at http://localhost:8080

### Cloud Deployment
The project includes Google Cloud Build configuration for automated deployment to Cloud Run.

## Development

### Project Structure
- `source/server/src/main/java` - Backend Java code
- `source/client` - React TypeScript frontend
- `source/server/src/main/resources/static` - Build output for frontend (generated)

### Command-Line Development Workflow for Interested Devs
- Use your preferred text editor for code changes
- Run tests with `source/server/./gradlew test`
- Check test coverage with `./gradlew jacocoTestReport`
- Run mutation testing with `./gradlew pitest`
- Please feel free to incorporate playwright or Cucumber or Selenium for end to end testing.

### Building for Production
To build the complete application for production:
```bash
./gradlew build
```

The production-ready application will be packaged as a JAR file in the `build/libs` directory. Run it with:
```bash
java -jar build/libs/pats-0.0.1-SNAPSHOT.jar
```

## Future Enhancements / Roadmap

We are continuously working to improve MyPetri. Planned future developments include:

| Feature Area                    | Description                                                                                                                                                             |
| :------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Project Management✅**          | ~~Refine existing save/import mechanisms and implement robust project export functionality.~~                                                                               |
| **Analysis & Simulation**       | Develop and connect backend services for comprehensive Petri net analysis capabilities (e.g., reachability graphs, boundedness checks, liveness properties).                |
| **Petri Net Core**              | Implement variable arc weights to allow for the consumption and production of multiple tokens per transition firing without the need to add multiple arcs of the same type.            |
| **User Interface / User Experience✅** | ~~Explore options for multi-document or tabbed views to improve the management of multiple Petri nets or complex models.~~                                                |
| **SVG Icons** | Creation of additional SVG Icons that can be used as place and transition nodes to represent common industry components.                                                |


# Find a Bug?
Please submit an issue using the issues tab above! We'll do our best to respond promptly. 