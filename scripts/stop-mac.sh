#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Stopping Prelegal..."

if [ -f "$SCRIPT_DIR/.backend.pid" ]; then
    kill "$(cat "$SCRIPT_DIR/.backend.pid")" 2>/dev/null || true
    rm "$SCRIPT_DIR/.backend.pid"
    echo "Backend stopped."
fi

if [ -f "$SCRIPT_DIR/.frontend.pid" ]; then
    kill "$(cat "$SCRIPT_DIR/.frontend.pid")" 2>/dev/null || true
    rm "$SCRIPT_DIR/.frontend.pid"
    echo "Frontend stopped."
fi

echo "All services stopped."
