const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config({ path: 'E:/AgentMark/AgentMark/backend/.env' });

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('JWT_SECRET is missing from env!');
  process.exit(1);
}

const generateToken = (payload, expiresIn = '1d') => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

const userId = '558c6983-8c8a-47d0-96d9-483a4a221e01';
const email = 'ahishek0111@gmail.com';
const token = generateToken({ userId, email });

console.log('Generated Token:', token);
console.log('Sending request to backend on port 5003...');

fetch('http://localhost:5003/api/campaigns/c648a69d-03d5-4940-9066-106ab0bd93dc/variants/copy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    channel: 'instagram',
    steeringNote: 'make it casual and friendly'
  })
})
.then(async res => {
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);
})
.catch(err => {
  console.error('Fetch Error:', err);
});
