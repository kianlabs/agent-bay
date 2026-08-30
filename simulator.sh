#!/bin/bash
# Auto-simulator: trigger /api/simulate setiap 5 detik

echo "🔄 Starting Agent Ops Simulator..."
echo "Press Ctrl+C to stop"

while true; do
  curl -s http://localhost:3002/api/simulate > /dev/null
  echo "$(date '+%H:%M:%S') - Triggered simulation"
  sleep 5
done
