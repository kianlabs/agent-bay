#!/bin/bash

# Simulator for Agent Ops Dashboard
# Simulates random agent status changes and creates activities

API_BASE="http://localhost:3002/api"

echo "🤖 Agent Ops Simulator Started"
echo "================================"

while true; do
  # Get current agents
  AGENTS=$(curl -s "$API_BASE/agents")
  
  if [ -z "$AGENTS" ]; then
    echo "❌ Failed to fetch agents"
    sleep 5
    continue
  fi
  
  # Pick random agent (0-3)
  AGENT_INDEX=$((RANDOM % 4))
  
  # Get agent details
  AGENT_ID=$(echo "$AGENTS" | jq -r ".[$AGENT_INDEX].id")
  AGENT_NAME=$(echo "$AGENTS" | jq -r ".[$AGENT_INDEX].name")
  CURRENT_STATUS=$(echo "$AGENTS" | jq -r ".[$AGENT_INDEX].status")
  
  # Random new status (50% working, 30% idle, 20% error)
  RAND=$((RANDOM % 100))
  if [ $RAND -lt 50 ]; then
    NEW_STATUS="working"
  elif [ $RAND -lt 80 ]; then
    NEW_STATUS="idle"
  else
    NEW_STATUS="error"
  fi
  
  # Skip if status unchanged
  if [ "$NEW_STATUS" = "$CURRENT_STATUS" ]; then
    echo "⏭️  $AGENT_NAME already $CURRENT_STATUS, skipping..."
    sleep 5
    continue
  fi
  
  echo "🔄 Updating $AGENT_NAME: $CURRENT_STATUS → $NEW_STATUS"
  
  # Trigger simulate endpoint
  RESULT=$(curl -s -X GET "$API_BASE/simulate")
  
  if echo "$RESULT" | jq -e '.message' > /dev/null 2>&1; then
    echo "✅ $RESULT"
    
    # Create activity based on new status
    if [ "$NEW_STATUS" = "working" ]; then
      ACTIVITY_TYPE="task-completed"
      ACTION="started working on a new task"
    elif [ "$NEW_STATUS" = "idle" ]; then
      ACTIVITY_TYPE="task-completed"
      ACTION="completed their task"
    else
      ACTIVITY_TYPE="error"
      ACTION="encountered an error"
    fi
    
    # Post activity
    ACTIVITY_PAYLOAD=$(cat <<EOF
{
  "agentId": "$AGENT_ID",
  "agentName": "$AGENT_NAME",
  "action": "$ACTION",
  "type": "$ACTIVITY_TYPE"
}
EOF
)
    
    ACTIVITY_RESULT=$(curl -s -X POST "$API_BASE/activities" \
      -H "Content-Type: application/json" \
      -d "$ACTIVITY_PAYLOAD")
    
    if echo "$ACTIVITY_RESULT" | jq -e '.id' > /dev/null 2>&1; then
      echo "📝 Activity logged: $AGENT_NAME $ACTION"
    fi
  else
    echo "❌ Error: $RESULT"
  fi
  
  # Random delay between 5-15 seconds
  DELAY=$((5 + RANDOM % 11))
  echo "⏳ Waiting ${DELAY}s..."
  echo ""
  sleep $DELAY
done
