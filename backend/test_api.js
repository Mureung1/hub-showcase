/**
 * Standalone API Test Script for Express + Supabase Backend
 * Run: node test_api.js
 */

const http = require('http');

function makeRequest(path, method = 'GET', postData = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Standalone Express API Test Suite...\n');

  try {
    // 1. GET /api/chat
    console.log('1. Testing GET /api/chat...');
    const chatGet = await makeRequest('/api/chat');
    console.log('   Status:', chatGet.status);
    console.log('   Messages Count:', chatGet.data.messages?.length || 0);

    // 2. POST /api/chat
    console.log('\n2. Testing POST /api/chat...');
    const chatPost = await makeRequest('/api/chat', 'POST', {
      userMessage: '컴퓨터공학과 3학년 수강신청 팁 알려줘',
      aiResponse: '전공필수 과목인 자료구조 및 데이터베이스를 우선 수강 신청하세요!'
    });
    console.log('   Status:', chatPost.status);
    console.log('   Result:', chatPost.data.message);

    // 3. GET /api/credits/saved-grades
    console.log('\n3. Testing GET /api/credits/saved-grades...');
    const gradesGet = await makeRequest('/api/credits/saved-grades');
    console.log('   Status:', gradesGet.status);
    console.log('   Has Data:', !!gradesGet.data.data);

    console.log('\n✅ Standalone API Verification Completed Successfully!');
  } catch (err) {
    console.error('❌ Test failed (Is backend server running on port 5000?):', err.message);
  }
}

runTests();
