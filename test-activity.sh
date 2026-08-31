#!/bin/bash
# Test creating activity
curl -s -X POST http://localhost:3002/api/activities \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "test123",
    "agentName": "Frontend",
    "action": "completed authentication module",
    "type": "task-completed"
  }' | jq '.'
