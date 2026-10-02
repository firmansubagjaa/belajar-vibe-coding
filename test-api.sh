#!/bin/bash

# Test script untuk API endpoints
# Pastikan server sudah berjalan di http://localhost:3000

BASE_URL="http://localhost:3000"

echo "🧪 Testing Health Check..."
curl -X GET "$BASE_URL/health"
echo -e "\n"

echo "🧪 Testing Create User..."
curl -X POST "$BASE_URL/users" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com"
  }'
echo -e "\n"

echo "🧪 Testing Get All Users..."
curl -X GET "$BASE_URL/users"
echo -e "\n"

echo "✅ Tests completed"
