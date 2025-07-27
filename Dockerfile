# Use a base image with both Java and Node.js
FROM gradle:jdk21 AS build

# Install Node.js and npm
RUN apt-get update && \
    apt-get install -y curl && \
    curl -sL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app
COPY . .

# Build frontend with explicit output to the dist directory
RUN cd source/client && npm install && npm run build

# Copying frontend build to main java location
RUN mkdir -p source/server/src/main/resources/static
RUN if [ -d "source/client/dist" ]; then cp -r source/client/dist/* source/server/src/main/resources/static/; fi

# Build backend
RUN cd source/server && ./gradlew build -x test

# Runtime image
FROM openjdk:21-slim
WORKDIR /app
COPY --from=build /app/source/server/build/libs/PATS-0.0.1-SNAPSHOT.jar ./app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"] 