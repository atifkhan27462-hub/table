#!/usr/bin/env bash

# ===============================================================================
#       ATIF & ABDULLAH FOODS - SMART RESTAURANT POS & DINING SUITE
# ===============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR" || exit 1

echo "==============================================================================="
echo "      ATIF & ABDULLAH FOODS - SMART RESTAURANT POS & DINING SUITE"
echo "==============================================================================="
echo ""
echo "[*] Initializing restaurant services..."
echo ""

# Determine Python command
PYTHON_BIN=""
if [ -f "$ROOT_DIR/backend/.venv/Scripts/python.exe" ]; then
    PYTHON_BIN="$ROOT_DIR/backend/.venv/Scripts/python.exe"
elif [ -f "$ROOT_DIR/backend/.venv/bin/python" ]; then
    PYTHON_BIN="$ROOT_DIR/backend/.venv/bin/python"
elif command -v python3 &>/dev/null; then
    PYTHON_BIN="python3"
elif command -v python &>/dev/null; then
    PYTHON_BIN="python"
else
    echo "[ERROR] Python interpreter not found."
    exit 1
fi

# Detect Local IP
LOCAL_IP="127.0.0.1"
if command -v ip &>/dev/null; then
    LOCAL_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}')
elif command -v ifconfig &>/dev/null; then
    LOCAL_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n1)
fi

echo "[OK] Project Directory: $ROOT_DIR"
echo "[OK] Local LAN IP:      $LOCAL_IP"
echo ""

# Array to track child PIDs for cleanup on exit
PIDS=()

cleanup() {
    echo ""
    echo "[*] Shutting down restaurant services cleanly..."
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
        fi
    done
    echo "[OK] All services stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 1. Start Backend API (Port 8080)
echo "[*] Starting FastAPI Backend on 0.0.0.0:8080..."
cd "$ROOT_DIR/backend" && "$PYTHON_BIN" -m uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload &
PIDS+=($!)

# 2. Start Admin Dashboard (Port 3000)
echo "[*] Starting Admin Dashboard on 0.0.0.0:3000..."
cd "$ROOT_DIR/apps/admin-dashboard" && npx next dev -H 0.0.0.0 -p 3000 &
PIDS+=($!)

# 3. Start Customer Dining App (Port 3001)
echo "[*] Starting Customer Dining App on 0.0.0.0:3001..."
cd "$ROOT_DIR/apps/customer-app" && npx next dev -H 0.0.0.0 -p 3001 &
PIDS+=($!)

# 4. Start Kitchen Display System (Port 3002)
echo "[*] Starting Kitchen Display Screen on 0.0.0.0:3002..."
cd "$ROOT_DIR/apps/kds-app" && npx next dev -H 0.0.0.0 -p 3002 &
PIDS+=($!)

sleep 4

echo ""
echo "==============================================================================="
echo "      ATIF & ABDULLAH FOODS - ALL SYSTEMS RUNNING SUCCESSFULLY!"
echo "==============================================================================="
echo ""
echo " PC / LOCAL ACCESS LINKS:"
echo " -----------------------------------------------------------------------------"
echo " [1] Admin Dashboard:       http://localhost:3000"
echo " [2] Customer Table 01:     http://localhost:3001/?table=1"
echo " [3] Kitchen Screen (KDS):  http://localhost:3002"
echo " [4] Backend API Docs:      http://localhost:8080/api/v1/docs"
echo ""
echo " MOBILE / TABLET ON WI-FI:"
echo " -----------------------------------------------------------------------------"
echo " - Table 01 on Tablet:      http://$LOCAL_IP:3001/?table=1"
echo " - Table 02 on Tablet:      http://$LOCAL_IP:3001/?table=2"
echo " - Kitchen Display on Tab:  http://$LOCAL_IP:3002"
echo " - Admin Dashboard on Tab:  http://$LOCAL_IP:3000"
echo ""
echo "==============================================================================="
echo " Press [CTRL + C] anytime to stop all servers."
echo "==============================================================================="
echo ""

# Keep running in foreground
wait
