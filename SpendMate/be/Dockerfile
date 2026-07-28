FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./
COPY src src
RUN chmod +x gradlew && ./gradlew build -x test --no-daemon
# Gradle의 bootJar 태스크는 실행 가능한 jar와 "-plain.jar"(의존성 없는 클래스만) 두 개를 만든다 —
# 다음 stage에서 *.jar로 한 번에 COPY하면 두 파일이 걸려 실패하므로 실행 가능한 쪽만 골라 고정된 이름으로 옮겨둔다.
RUN find build/libs -maxdepth 1 -name '*.jar' ! -name '*-plain.jar' -exec cp {} /app/app.jar \;

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/app.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
