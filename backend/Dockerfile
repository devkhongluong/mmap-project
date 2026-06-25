# Stage 1: Build
FROM maven:3.9.8-eclipse-temurin-21-alpine AS build
WORKDIR /app
# Copy pom.xml and source code
COPY pom.xml .
COPY src ./src
# Build the application
RUN mvn clean package -DskipTests

# Stage 2: Run
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
# Copy the built jar from the build stage
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
# Run the jar with memory limits suitable for Free tier
ENTRYPOINT ["java", "-Xmx256m", "-jar", "app.jar"]
