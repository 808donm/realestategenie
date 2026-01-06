#!/bin/bash
# Script to configure GHL lease template ID for an agent

AGENT_ID="b80d448f-d58a-4cb6-bb13-f5a6d38b30ae"
TEMPLATE_ID="$1"

if [ -z "$TEMPLATE_ID" ]; then
  echo "❌ Error: Template ID required"
  echo ""
  echo "Usage: ./scripts/set-ghl-lease-template.sh <template-id>"
  echo ""
  echo "Example: ./scripts/set-ghl-lease-template.sh abc123xyz"
  echo ""
  echo "To find your template ID:"
  echo "1. Go to GHL → Marketing → Documents & Contracts"
  echo "2. Click on your lease template"
  echo "3. Copy the ID from the URL"
  exit 1
fi

echo "📄 Configuring GHL lease template..."
echo "Agent ID: $AGENT_ID"
echo "Template ID: $TEMPLATE_ID"
echo ""

# Call the API endpoint
curl -X POST http://localhost:3000/api/debug/set-ghl-template \
  -H "Content-Type: application/json" \
  -d "{
    \"agentId\": \"$AGENT_ID\",
    \"templateId\": \"$TEMPLATE_ID\"
  }" | jq .

echo ""
echo "✅ Done! Next time you create a lease, it will use direct document creation."
