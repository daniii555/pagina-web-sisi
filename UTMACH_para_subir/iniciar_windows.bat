@echo off
cd /d "%~dp0"
where javac >nul 2>nul
if errorlevel 1 (
  echo Necesitas instalar JDK 17 o superior. Java 21 recomendado.
  pause
  exit /b 1
)
if not exist out mkdir out
javac -encoding UTF-8 -d out src\Main.java
if errorlevel 1 (
  echo Error al compilar Java.
  pause
  exit /b 1
)
echo.
echo Abre http://localhost:8080 en tu laptop.
echo En el telefono usa http://IP-DE-TU-LAPTOP:8080
java -cp out Main
pause
