/**
 * test_developer_keys.js
 *
 * Automated verification script for Phase 4 & Phase 5 developer API key lifecycle.
 *
 * Requirements:
 *   - Start your PostgreSQL database and run Prisma migrations.
 *   - Start the Express backend: `npm run dev` (running on port 5003).
 *
 * Usage:
 *   node backend/scratch/test_developer_keys.js
 */

const http = require('http');

const BACKEND_URL = 'http://localhost:5003';
const TEST_USER = {
  email: `test_dev_${Date.now()}@agentmark.ai`,
  password: 'securePassword123!',
  name: 'Test Dev User',
};

// -- HTTP Helper ----------------------------------------------------------------

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = `${BACKEND_URL}${path}`;
    const urlObj = new URL(url);

    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: headers,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = data;
        if (res.headers['content-type'] && res.headers['content-type'].includes('application/json')) {
          try {
            parsed = JSON.parse(data);
          } catch (e) {}
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// -- Main Flow ------------------------------------------------------------------

async function run() {
  console.log('🚀 Starting Developer API Key Lifecycle Verification...');

  try {
    // 1. Signup / Register new test user
    console.log('\n[1/7] Registering new test user...');
    const signupRes = await request('POST', '/api/auth/signup', TEST_USER);
    if (signupRes.status !== 201) {
      throw new Error(`Signup failed with status ${signupRes.status}: ${JSON.stringify(signupRes.body)}`);
    }
    const jwtToken = signupRes.body.token;
    console.log(`✅ User registered successfully. JWT acquired.`);

    // 2. Generate Developer API Key using JWT
    console.log('\n[2/7] Generating Developer API key via POST /api/developer/keys...');
    const createKeyRes = await request('POST', '/api/developer/keys', { label: 'Test Script Key' }, jwtToken);
    if (createKeyRes.status !== 201) {
      throw new Error(`Key creation failed with status ${createKeyRes.status}: ${JSON.stringify(createKeyRes.body)}`);
    }

    const rawApiKey = createKeyRes.body.key;
    const apiKeyId = createKeyRes.body.id;
    console.log(`✅ Key generated successfully.`);
    console.log(`   Key ID:  ${apiKeyId}`);
    console.log(`   Raw Key: ${rawApiKey} (starts with "${rawApiKey.slice(0, 3)}")`);

    if (!rawApiKey.startsWith('am_')) {
      throw new Error(`API key prefix validation failed. Expected key to start with "am_", got "${rawApiKey}"`);
    }

    // 3. Test key authentication against protected campaign route (GET /api/campaigns/all)
    console.log('\n[3/7] Accessing protected route /api/campaigns/all using Developer API Key...');
    const accessRes = await request('GET', '/api/campaigns/all', null, rawApiKey);
    if (accessRes.status === 200) {
      console.log(`✅ Authentication successful using Developer API Key! Response 200 OK.`);
    } else {
      throw new Error(`Access failed with status ${accessRes.status}: ${JSON.stringify(accessRes.body)}`);
    }

    // 4. Verify Route Guard: Attempt key management actions using API Key
    console.log('\n[4/7] Testing route guard (attempting key creation using API Key instead of JWT)...');
    const guardRes = await request('POST', '/api/developer/keys', { label: 'Malicious Attempt' }, rawApiKey);
    if (guardRes.status === 403) {
      console.log(`✅ Route guard successfully blocked API Key from managing keys (Response 403 Forbidden).`);
    } else {
      throw new Error(`Route guard failure! Expected 403 Forbidden, got status ${guardRes.status}: ${JSON.stringify(guardRes.body)}`);
    }

    // 5. List keys using JWT to confirm creation
    console.log('\n[5/7] Listing active keys using JWT...');
    const listRes = await request('GET', '/api/developer/keys', null, jwtToken);
    if (listRes.status !== 200) {
      throw new Error(`Failed to list keys: ${JSON.stringify(listRes.body)}`);
    }
    const keyRecord = listRes.body.keys.find(k => k.id === apiKeyId);
    if (!keyRecord) {
      throw new Error(`Created key was not found in user's API keys list.`);
    }
    console.log(`✅ Key listed successfully. Status: active=${keyRecord.isActive}`);

    // 6. Revoke key using JWT
    console.log(`\n[6/7] Revoking Developer API Key via DELETE /api/developer/keys/${apiKeyId}...`);
    const revokeRes = await request('DELETE', `/api/developer/keys/${apiKeyId}`, null, jwtToken);
    if (revokeRes.status !== 200) {
      throw new Error(`Revocation failed with status ${revokeRes.status}: ${JSON.stringify(revokeRes.body)}`);
    }
    console.log(`✅ API Key revoked successfully.`);

    // 7. Verify revoked key returns 401 Unauthorized
    console.log('\n[7/7] Accessing protected route with revoked key...');
    const postRevokeRes = await request('GET', '/api/campaigns/all', null, rawApiKey);
    if (postRevokeRes.status === 401) {
      console.log(`✅ Revoked key successfully rejected with Response 401 Unauthorized!`);
    } else {
      throw new Error(`Expected status 401, got status ${postRevokeRes.status}: ${JSON.stringify(postRevokeRes.body)}`);
    }

    console.log('\n✨ ALL VERIFICATION CHECKS PASSED SUCCESSFULLY! ✨');

  } catch (error) {
    console.error(`\n❌ VERIFICATION FAILED:`, error.message);
    process.exit(1);
  }
}

run();
