#!/bin/bash

# Start Firebase emulator with OpenAI API key from secret
# This script ensures the emulator has access to the secret

echo "🔑 Getting OpenAI API key from Firebase Secret Manager..."
export OPENAI_API_KEY=$(firebase functions:secrets:access OPENAI_API_KEY)

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Failed to get OPENAI_API_KEY from secret manager"
    echo "   Make sure you've set it with: firebase functions:secrets:set OPENAI_API_KEY"
    exit 1
fi

echo "✅ OpenAI API key loaded successfully"
echo "🚀 Starting Firebase emulator..."

firebase emulators:start --only functions
