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
node -e "
const http = require('http');
const fs = require('fs');
const path = require('path');

function req(method, p, body, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const r = http.request({ hostname:'localhost', port:5003, path:p, method, headers }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); }});
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function run() {
  // Try login first, then signup
  let jwt = '';
  try {
    const login = await req('POST', '/api/auth/login', { email:'dev@agentmark.ai', password:'password123' });
    if (login.token) jwt = login.token;
  } catch(e) {}
  if (!jwt) {
    const signup = await req('POST', '/api/auth/signup', { email:'dev@agentmark.ai', password:'password123', name:'Developer' });
    if (signup.token) jwt = signup.token;
  }
  if (!jwt) { console.log('  ERROR: Could not get JWT — is the backend running?'); process.exit(1); }

  const keyRes = await req('POST', '/api/developer/keys', { label: 'Claude Desktop Auto' }, jwt);
  const apiKey = keyRes.key;
  if (!apiKey) { console.log('  ERROR: Could not generate API key'); process.exit(1); }

  const claudeDir = path.join(process.env.APPDATA, 'Claude');
  if (!fs.existsSync(claudeDir)) fs.mkdirSync(claudeDir, { recursive: true });

  const config = {
    mcpServers: {
      agentmark: {
        command: 'E:/AgentMark/AgentMark/agentmark-mcp-server/.venv/Scripts/python.exe',
        args: ['-m', 'agentmark_mcp.server'],
        env: {
          AGENTMARK_API_URL: 'http://localhost:5003',
          AGENTMARK_API_KEY: apiKey
        }
      }
    }
  };

  // 1. Write to standard Roaming AppData path
  fs.writeFileSync(path.join(claudeDir, 'claude_desktop_config.json'), JSON.stringify(config, null, 2));


  // 2. Write to UWP Windows Store app path (if exists)
  const uwpDir = path.join(process.env.LOCALAPPDATA, 'Packages', 'Claude_pzs8sxrjxfjjc', 'LocalCache', 'Roaming', 'Claude');
  if (fs.existsSync(path.dirname(uwpDir))) {
    if (!fs.existsSync(uwpDir)) fs.mkdirSync(uwpDir, { recursive: true });
    fs.writeFileSync(path.join(uwpDir, 'claude_desktop_config.json'), JSON.stringify(config, null, 2));
    console.log('  UWP Store Config also updated successfully.');
  }

  console.log('  Config updated with key: ' + apiKey.slice(0, 10) + '...');
  console.log('');
  console.log('  Done! Now restart Claude Desktop to connect.');
}
run().catch(e => { console.log('  Setup error:', e.message); });
"

echo.
echo  ============================================
echo    Setup Complete!
echo  ============================================
echo.
echo   Next step: Restart Claude Desktop app
echo   (Close it from system tray, then reopen)
echo.
pause
