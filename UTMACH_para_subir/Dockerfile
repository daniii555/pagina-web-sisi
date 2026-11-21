FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /project
COPY src ./src
RUN javac -encoding UTF-8 -d /out src/Main.java

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /out/ /app/
COPY web/ /app/web/
EXPOSE 8080
ENV PORT=8080
CMD ["java","-cp","/app","Main"]
