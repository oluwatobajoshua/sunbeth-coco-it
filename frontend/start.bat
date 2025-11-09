@echo off
REM COCO Issue Tracker - React Start Script for Windows

echo 🚀 Starting COCO Issue Tracker React App...
echo 📱 Sunbeth Energies - COCO Station Issue Tracking System
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Start the development server
echo 🌟 Starting React development server...
echo 🌐 App will open at: http://localhost:3000
echo.

npm start