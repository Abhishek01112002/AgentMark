@echo off
title AgentMark — Starting Services
color 0A

echo.
echo  ============================================
echo    AgentMark — One-Click Startup
echo  ============================================
echo.

:: ---- Step 1: Check backend is running ----
echo [1/2] Checking backend (port 5003)...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5003/health' -TimeoutSec 3 -UseBasicParsing; if ($r.StatusCode -eq 200) { Write-Host '  Backend OK' } } catch { Write-Host '  Backend not running — starting it...' }" 2>nul

:: Start backend if not running
powershell -Command "if (-not (Get-NetTCPConnection -LocalPort 5003 -ErrorAction SilentlyContinue)) { Start-Process -FilePath 'cmd.exe' -ArgumentList '/k cd /d E:\AgentMark\AgentMark\backend && npm run dev' -WindowStyle Normal }"
timeout /t 3 /nobreak > nul

:: ---- Step 2: Update Claude Desktop config with fresh API key ----
echo [2/2] Refreshing Claude Desktop MCP config...
node scripts/update-claude-mcp-config.js

echo.
echo  ============================================
echo    Setup Complete!
echo  ============================================
echo.
echo   Next step: Restart Claude Desktop app
echo   (Close it from system tray, then reopen)
echo.
pause
