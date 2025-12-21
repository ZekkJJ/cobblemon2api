#!/bin/bash

# CORS Testing Script
# Tests CORS configuration for the backend API

API_URL="https://api.playadoradarp.xyz/port/25617"
FRONTEND_ORIGIN="https://cobblemon-los-pitufos.vercel.app"

echo "🧪 Testing CORS Configuration"
echo "================================"
echo ""
echo "API URL: $API_URL"
echo "Frontend Origin: $FRONTEND_ORIGIN"
echo ""

# Test 1: Health Check (no CORS)
echo "📋 Test 1: Health Check (no CORS)"
echo "-----------------------------------"
curl -s "$API_URL/health" | jq '.'
echo ""

# Test 2: OPTIONS Preflight Request
echo "📋 Test 2: OPTIONS Preflight Request"
echo "-----------------------------------"
curl -X OPTIONS \
  -H "Origin: $FRONTEND_ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v \
  "$API_URL/api/gacha/roll" 2>&1 | grep -i "access-control"
echo ""

# Test 3: GET Request with Origin
echo "📋 Test 3: GET Request with Origin"
echo "-----------------------------------"
curl -X GET \
  -H "Origin: $FRONTEND_ORIGIN" \
  -v \
  "$API_URL/api/starters" 2>&1 | grep -i "access-control"
echo ""

# Test 4: Check specific headers
echo "📋 Test 4: Checking Required CORS Headers"
echo "-----------------------------------"
RESPONSE=$(curl -X OPTIONS \
  -H "Origin: $FRONTEND_ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -s -D - \
  "$API_URL/api/gacha/roll" 2>&1)

echo "Checking for required headers:"
echo ""

if echo "$RESPONSE" | grep -q "access-control-allow-origin: $FRONTEND_ORIGIN"; then
  echo "✅ Access-Control-Allow-Origin: $FRONTEND_ORIGIN"
else
  echo "❌ Access-Control-Allow-Origin header missing or incorrect"
fi

if echo "$RESPONSE" | grep -q "access-control-allow-credentials: true"; then
  echo "✅ Access-Control-Allow-Credentials: true"
else
  echo "❌ Access-Control-Allow-Credentials header missing"
fi

if echo "$RESPONSE" | grep -q "access-control-allow-methods"; then
  echo "✅ Access-Control-Allow-Methods present"
else
  echo "❌ Access-Control-Allow-Methods header missing"
fi

if echo "$RESPONSE" | grep -q "access-control-allow-headers"; then
  echo "✅ Access-Control-Allow-Headers present"
else
  echo "❌ Access-Control-Allow-Headers header missing"
fi

echo ""
echo "================================"
echo "✅ CORS Test Complete"
