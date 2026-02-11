#!/bin/bash

# Check and Set GHL Lease Template ID
# This script helps you configure the GHL template ID for lease document creation

AGENT_ID="b80d448f-d58a-4cb6-bb13-f5a6d38b30ae"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

echo "================================"
echo "GHL Lease Template Configuration"
echo "================================"
echo ""

# Check current configuration
echo "📋 Checking current template configuration..."
RESPONSE=$(curl -s "${APP_URL}/api/debug/set-ghl-template?agentId=${AGENT_ID}")

echo "$RESPONSE" | jq '.'

HAS_TEMPLATE=$(echo "$RESPONSE" | jq -r '.hasTemplate')

if [ "$HAS_TEMPLATE" = "true" ]; then
  TEMPLATE_ID=$(echo "$RESPONSE" | jq -r '.templateId')
  echo ""
  echo "✅ Template ID is configured: $TEMPLATE_ID"
  echo ""
  echo "If you need to update it, run:"
  echo "  $0 set <new-template-id>"
else
  echo ""
  echo "❌ No template ID configured"
  echo ""
  echo "To set the template ID, run:"
  echo "  $0 set <your-template-id>"
  echo ""
  echo "📍 How to find your template ID:"
  echo "  1. Log into GoHighLevel"
  echo "  2. Go to Marketing → Documents & Contracts"
  echo "  3. Click on your lease template"
  echo "  4. Copy the ID from the URL"
  echo "     Example URL: /location/xxx/documents/templates/abc123xyz"
  echo "     Template ID: abc123xyz"
fi

# Set template if provided
if [ "$1" = "set" ] && [ -n "$2" ]; then
  NEW_TEMPLATE_ID="$2"
  echo ""
  echo "🔧 Setting template ID to: $NEW_TEMPLATE_ID"

  curl -X POST "${APP_URL}/api/debug/set-ghl-template" \
    -H "Content-Type: application/json" \
    -d "{\"agentId\":\"${AGENT_ID}\",\"templateId\":\"${NEW_TEMPLATE_ID}\"}" \
    | jq '.'

  echo ""
  echo "✅ Template ID updated!"
fi
