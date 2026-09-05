process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.SESSION_SECRET = 'test_secret_key_123456';

const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const FitnessClass = require('../models/FitnessClass');

let server;
let mongod;
let baseURL;

// HTTP client helper supporting cookie/session jar
const request = async (method, path, body = null, cookie = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseURL);
    const options = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (cookie) {
      options.headers['Cookie'] = cookie;
    }

    const req = http.request(url, options, (res) => {
      let data = '';
      const setCookie = res.headers['set-cookie'];

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        let parsed = null;
        try {
          parsed = data ? JSON.parse(data) : {};
        } catch (e) {
          parsed = data;
        }

        resolve({
          status: res.statusCode,
          headers: res.headers,
          setCookie: setCookie ? setCookie[0].split(';')[0] : null,
          body: parsed
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const runTests = async () => {
  console.log('====================================================');
  console.log('🧪 RUNNING GYM MANAGEMENT API AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  // Start In-Memory MongoDB & HTTP Server
  mongod = await MongoMemoryServer.create();
  const mongoUri = mongod.getUri();
  await mongoose.connect(mongoUri);
  console.log(`[Setup] In-memory MongoDB connected: ${mongoUri}`);

  await new Promise((resolve) => {
    server = app.listen(5001, () => {
      baseURL = 'http://localhost:5001';
      console.log(`[Setup] Test server running on ${baseURL}\n`);
      resolve();
    });
  });

  let passedTests = 0;
  let totalTests = 0;

  const assertTest = (description, condition) => {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${description}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${description}`);
    }
  };

  try {
    // ----------------------------------------------------
    // TEST 1: Base API Info
    // ----------------------------------------------------
    console.log('👉 Step 1: Base API Info Route');
    const baseRes = await request('GET', '/');
    assertTest('GET / returns 200 OK and Healthy status', baseRes.status === 200 && baseRes.body.status.includes('Healthy'));

    // ----------------------------------------------------
    // TEST 2: Member Registration & Date Calculation
    // ----------------------------------------------------
    console.log('\n👉 Step 2: Member Registration & Expiry Date Calculation');
    const user1Data = {
      username: 'fit_sam',
      email: 'sam@fit.com',
      password: 'mypassword123',
      membershipTier: 'Gold',
      durationMonths: 1,
      emergencyContact: '+1-555-0199'
    };

    const reg1Res = await request('POST', '/api/auth/register', user1Data);
    assertTest('Member 1 registers with status 201', reg1Res.status === 201);
    assertTest('Member 1 tier is Gold', reg1Res.body.user.membershipTier === 'Gold');
    assertTest('Member 1 remaining days is approximately 30', reg1Res.body.user.remainingDays >= 29 && reg1Res.body.user.remainingDays <= 30);
    assertTest('Password is not returned in plaintext', reg1Res.body.user.password === undefined);

    // Register Member 2 (for capacity test)
    const user2Data = {
      username: 'gym_alex',
      email: 'alex@fit.com',
      password: 'alexpassword',
      membershipTier: 'Silver',
      durationMonths: 3
    };
    const reg2Res = await request('POST', '/api/auth/register', user2Data);
    assertTest('Member 2 registers with 3-month duration (~90 days)', reg2Res.status === 201 && reg2Res.body.user.remainingDays >= 89);

    // Register Member 3 (for capacity test)
    const user3Data = {
      username: 'power_lisa',
      email: 'lisa@fit.com',
      password: 'lisapassword',
      membershipTier: 'Platinum',
      durationMonths: 6
    };
    const reg3Res = await request('POST', '/api/auth/register', user3Data);
    assertTest('Member 3 registers successfully', reg3Res.status === 201);

    // Duplicate Registration Failure
    const dupRes = await request('POST', '/api/auth/register', user1Data);
    assertTest('Duplicate registration rejected with 400 Bad Request', dupRes.status === 400);

    // ----------------------------------------------------
    // TEST 3: Passport Session Authentication & /api/auth/me
    // ----------------------------------------------------
    console.log('\n👉 Step 3: Passport-Local Login & Session Persistence');
    const invalidLogin = await request('POST', '/api/auth/login', { username: 'fit_sam', password: 'wrongpassword' });
    assertTest('Invalid login fails with 401 Unauthorized', invalidLogin.status === 401);

    const loginRes1 = await request('POST', '/api/auth/login', { username: 'fit_sam', password: 'mypassword123' });
    assertTest('Valid login returns 200 OK', loginRes1.status === 200);
    const sessionCookie1 = loginRes1.setCookie;
    assertTest('Session cookie received in response', !!sessionCookie1);

    // Log in user 2 & 3 to get cookies
    const loginRes2 = await request('POST', '/api/auth/login', { username: 'gym_alex', password: 'alexpassword' });
    const sessionCookie2 = loginRes2.setCookie;

    const loginRes3 = await request('POST', '/api/auth/login', { username: 'power_lisa', password: 'lisapassword' });
    const sessionCookie3 = loginRes3.setCookie;

    // Verify /api/auth/me
    const unauthMe = await request('GET', '/api/auth/me');
    assertTest('Unauthenticated /api/auth/me fails with 401', unauthMe.status === 401);

    const authMe = await request('GET', '/api/auth/me', null, sessionCookie1);
    assertTest('Authenticated /api/auth/me returns 200 and user profile', authMe.status === 200 && authMe.body.user.username === 'fit_sam');
    assertTest('/api/auth/me includes computed remainingDays', authMe.body.user.remainingDays > 0);

    // ----------------------------------------------------
    // TEST 4: Fitness Class Creation & Queries
    // ----------------------------------------------------
    console.log('\n👉 Step 4: Fitness Class Creation & Retrieval');
    const classData = {
      title: 'HIIT & Core Conditioning',
      trainerName: 'Maria Rodriguez',
      scheduleDate: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days in future
      durationMinutes: 45,
      maxCapacity: 2 // Max capacity of 2 to test capacity boundary
    };

    const classRes = await request('POST', '/api/classes', classData);
    assertTest('Fitness class created with 201 Created', classRes.status === 201);
    const classId = classRes.body.fitnessClass._id;

    // Filter by trainer query param
    const filterRes = await request('GET', '/api/classes?trainer=Maria');
    assertTest('GET /api/classes?trainer=Maria returns filtered class', filterRes.status === 200 && filterRes.body.classes.length >= 1);

    // ----------------------------------------------------
    // TEST 5: Class Booking & Capacity Constraint Logic
    // ----------------------------------------------------
    console.log('\n👉 Step 5: Class Booking & Capacity Constraints');
    
    // Member 1 books class (1/2 seats filled)
    const book1 = await request('POST', `/api/classes/${classId}/book`, null, sessionCookie1);
    assertTest('Member 1 books class successfully (200 OK)', book1.status === 200);
    assertTest('Available slots updated to 1', book1.body.availableSlots === 1);

    // Member 1 attempts duplicate booking
    const dupBook = await request('POST', `/api/classes/${classId}/book`, null, sessionCookie1);
    assertTest('Duplicate booking by same member rejected (400)', dupBook.status === 400);

    // Member 2 books class (2/2 seats filled - full capacity reached)
    const book2 = await request('POST', `/api/classes/${classId}/book`, null, sessionCookie2);
    assertTest('Member 2 books class successfully (200 OK)', book2.status === 200);
    assertTest('Available slots updated to 0', book2.body.availableSlots === 0);

    // Member 3 attempts to book class (SHOULD FAIL: Max Capacity 2 reached)
    const book3 = await request('POST', `/api/classes/${classId}/book`, null, sessionCookie3);
    assertTest('Member 3 booking rejected when class is full (400 Bad Request)', book3.status === 400 && book3.body.message.includes('capacity'));

    // ----------------------------------------------------
    // TEST 6: Expired Membership Checks & Booking Restriction
    // ----------------------------------------------------
    console.log('\n👉 Step 6: Expired Membership Validation');
    // Create an expired member directly
    const expiredUser = new User({
      username: 'expired_bob',
      email: 'bob@fit.com',
      password: 'bobpassword',
      membershipTier: 'Bronze',
      membershipStatus: 'expired',
      membershipExpiryDate: new Date(Date.now() - 86400000 * 5) // 5 days ago
    });
    await expiredUser.save();

    const bobLogin = await request('POST', '/api/auth/login', { username: 'expired_bob', password: 'bobpassword' });
    const bobCookie = bobLogin.setCookie;

    // Create a new class with open slots
    const yogaClass = await request('POST', '/api/classes', {
      title: 'Morning Yoga Flow',
      trainerName: 'David Lee',
      scheduleDate: new Date(Date.now() + 86400000 * 2).toISOString(),
      durationMinutes: 60,
      maxCapacity: 10
    });
    const yogaClassId = yogaClass.body.fitnessClass._id;

    // Attempt booking with expired member
    const expiredBook = await request('POST', `/api/classes/${yogaClassId}/book`, null, bobCookie);
    assertTest('Booking with expired membership rejected (400 Bad Request)', expiredBook.status === 400 && expiredBook.body.message.includes('expired'));

    // ----------------------------------------------------
    // TEST 7: Membership Renewal & Reactivation
    // ----------------------------------------------------
    console.log('\n👉 Step 7: Membership Renewal');
    const renewRes = await request('PATCH', `/api/members/${expiredUser._id}/renew`, {
      additionalMonths: 6,
      tier: 'Platinum'
    });
    assertTest('Membership renewal returns 200 OK', renewRes.status === 200);
    assertTest('Renewed membership status is active', renewRes.body.member.membershipStatus === 'active');
    assertTest('Renewed tier is upgraded to Platinum', renewRes.body.member.membershipTier === 'Platinum');
    assertTest('Renewed remaining days is ~180', renewRes.body.member.remainingDays >= 179);

    // Now attempt booking with renewed member
    const renewedBook = await request('POST', `/api/classes/${yogaClassId}/book`, null, bobCookie);
    assertTest('Renewed member can successfully book class', renewedBook.status === 200);

    // ----------------------------------------------------
    // TEST 8: Query Expired Members
    // ----------------------------------------------------
    console.log('\n👉 Step 8: GET /api/members/expired');
    // Add another expired user
    const anotherExpired = new User({
      username: 'expired_clara',
      email: 'clara@fit.com',
      password: 'clarapassword',
      membershipTier: 'Bronze',
      membershipStatus: 'expired',
      membershipExpiryDate: new Date(Date.now() - 86400000 * 10)
    });
    await anotherExpired.save();

    const expiredList = await request('GET', '/api/members/expired');
    assertTest('GET /api/members/expired returns expired members list', expiredList.status === 200 && expiredList.body.members.length >= 1);
    assertTest('Expired member list contains expired_clara', expiredList.body.members.some(m => m.username === 'expired_clara'));

    // ----------------------------------------------------
    // TEST 9: Cancel Booking & Slot Restoration
    // ----------------------------------------------------
    console.log('\n👉 Step 9: Cancel Booking');
    const cancelRes = await request('DELETE', `/api/classes/${classId}/cancel`, null, sessionCookie1);
    assertTest('Cancel booking returns 200 OK', cancelRes.status === 200);
    assertTest('Available slots restored to 1', cancelRes.body.availableSlots === 1);

    // Member 3 can now book the freed slot
    const bookFreed = await request('POST', `/api/classes/${classId}/book`, null, sessionCookie3);
    assertTest('Freed slot successfully booked by Member 3', bookFreed.status === 200);

    // ----------------------------------------------------
    // TEST 10: Logout
    // ----------------------------------------------------
    console.log('\n👉 Step 10: Logout');
    const logoutRes = await request('POST', '/api/auth/logout', null, sessionCookie1);
    assertTest('Logout returns 200 OK', logoutRes.status === 200);

  } catch (err) {
    console.error('Test Suite encountered an unexpected error:', err);
  } finally {
    console.log('\n====================================================');
    console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log('====================================================\n');

    await mongoose.disconnect();
    await mongod.stop();
    server.close();
  }
};

runTests();
