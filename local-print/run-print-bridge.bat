@echo off
cd /d "%~dp0.."
echo Starting CODEVAULT ZD230 local print bridge...
node local-print\print-bridge.js
pause
