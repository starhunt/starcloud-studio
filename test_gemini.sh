#!/bin/bash
API_KEY="AIzaSyDPQ2Zzvw8jGWrPZ7EWtVttum8xA4PsmxA"
MODEL="gemini-2.5-flash"

echo "Testing model: $MODEL with system_instruction"
curl -s -X POST "https://generativelanguage.googleapis.com/v1beta/models/$MODEL:generateContent?key=$API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "system_instruction": {
        "parts": [{ "text": "You are a helpful assistant." }]
      },
      "contents": [{
        "parts": [{
          "text": "Hello, world!"
        }]
      }]
    }'
