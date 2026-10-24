@echo off
echo =========================================================================
echo Starting Singly Linked List Visualizer Local HTTP Server
echo =========================================================================
echo Opening browser at http://localhost:8000 ...
start http://localhost:8000
echo Running Python HTTP Server on port 8000. Press Ctrl+C to stop.
python -m http.server 8000
pause
