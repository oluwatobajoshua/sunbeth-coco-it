#!/bin/bash

# COCO Issue Tracker - React Start Script

echo "🚀 Starting COCO Issue Tracker React App..."
echo "📱 Sunbeth Energies - COCO Station Issue Tracking System"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the development server
echo "🌟 Starting React development server..."
echo "🌐 App will open at: http://localhost:3000"
echo ""

npm start