const http = require('http');
const fs = require('fs');
const path = require('path');

function req(method, p, body, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const r = http.request({ hostname: 'localhost', port: 5003, path: p, method, headers }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { resolve(d); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function run() {
  let jwt = '';
  try {
    const login = await req('POST', '/api/auth/login', { email: 'dev@agentmark.ai', password: 'password123' });
    if (login.token) jwt = login.token;
  } catch (e) {}

  if (!jwt) {
    try {
      const signup = await req('POST', '/api/auth/signup', { email: 'dev@agentmark.ai', password: 'password123', name: 'Developer' });
      if (signup.token) jwt = signup.token;
    } catch (e) {}
  }

  if (!jwt) {
    console.log('  [Notice] Could not auto-generate MCP key (Backend starting up or auth required). You can generate key in Developer Settings.');
    return;
  }

  try {
    const keyRes = await req('POST', '/api/developer/keys', { label: 'Claude Desktop Auto' }, jwt);
    const apiKey = keyRes.key;
    if (!apiKey) return;

    function safeWriteConfig(configFilePath) {
      const dir = path.dirname(configFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      let existing = { mcpServers: {} };
      if (fs.existsSync(configFilePath)) {
        try { existing = JSON.parse(fs.readFileSync(configFilePath, 'utf8')); } catch (e) {}
      }
      if (!existing.mcpServers) existing.mcpServers = {};

      const serverPath = path.resolve(__dirname, '../agentmark-mcp-server/src/agentmark_mcp/server.py');
      const venvPython = path.resolve(__dirname, '../agentmark-mcp-server/.venv/Scripts/python.exe');
      const pythonCmd = fs.existsSync(venvPython) ? venvPython : 'python';

      existing.mcpServers['agentmark'] = {
        command: pythonCmd,
        args: [serverPath],
        env: {
          AGENTMARK_API_KEY: apiKey,
          AGENTMARK_API_URL: 'http://localhost:5003'
        }
      };

      fs.writeFileSync(configFilePath, JSON.stringify(existing, null, 2), 'utf8');
      console.log('  Configured Claude Desktop MCP at:', configFilePath);
    }

    const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library/Application Support') : '');
    if (appData) {
      safeWriteConfig(path.join(appData, 'Claude', 'claude_desktop_config.json'));
    }
  } catch (e) {
    console.log('  [Notice] MCP config skipped:', e.message);
  }
}

run();
