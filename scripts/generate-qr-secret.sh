#!/bin/bash

# Generate a secure QR_TOKEN_SECRET for .env

echo "======================================"
echo "QR Token Secret Generator"
echo "======================================"
echo ""

# Generate a secure random secret
SECRET=$(openssl rand -base64 32)

echo "✅ Generated secure QR_TOKEN_SECRET:"
echo ""
echo "QR_TOKEN_SECRET=\"$SECRET\""
echo ""
echo "📋 Add this to your .env file:"
echo ""
echo "  1. Open .env in your editor"
echo "  2. Add the line above"
echo "  3. Restart your development server"
echo ""
echo "💡 This will be used to cryptographically sign QR code access tokens"
echo "   for open house registration security."
