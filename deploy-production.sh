#!/bin/bash

# Production Deployment Script for Guest Tracking System
# Run this on your server at 10.101.254.69

echo "🚀 Starting Guest Tracking System Production Deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Check if .env.local exists, if not create a basic one
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found. Please create one with your environment variables."
    echo "   Required variables:"
    echo "   - NEXT_PUBLIC_SUPABASE_URL"
    echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "   - NEXT_PUBLIC_TRACKING_API_URL"
fi

# Start the production server
echo "🌐 Starting production server on port 3000..."
echo "   Application will be available at: http://10.101.254.69:3000"
echo "   Press Ctrl+C to stop the server"
echo ""

npm start
