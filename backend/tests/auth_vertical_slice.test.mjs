import test from 'node:test';
import assert from 'node:assert/strict';
import '../api/env.js';
import prisma from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import argon2 from 'argon2';
import {
  register,
  verifyOtp,
  completeRegistration,
  login,
  requestPasswordReset,
  resetPassword,
  getResetPasswordStatus,
} from '../controllers/authController.js';
import { createComment } from '../controllers/commentController.js';
import { getMinigameStatus } from '../controllers/minigameController.js';

test('Vertical Slice: Full Registration Flow (Anti-Torn Register + Choose Username)', async () => {
  await prisma.user.deleteMany({ where: { email: { contains: 'test_slice_' } } }).catch(() => {});
  const testEmail = `test_slice_${Date.now()}@kalceria.id`;
  const testPassword = 'Password123!';
  const testName = 'Test Automaton';
  const testUsername = 'usr_' + Math.random().toString(36).substring(2, 10);

  try {
    // 1. Submit Registration Form
    let registerResStatus = 0;
    let registerResData = null;
    const mockReqReg = {
      body: {
        name: testName,
        dob: '2000-01-01',
        email: testEmail,
        phone: '08123456789',
        domicile: 'Jakarta',
        password: testPassword,
      },
    };
    const mockResReg = {
      status: (code) => {
        registerResStatus = code;
        return {
          json: (data) => {
            registerResData = data;
          },
        };
      },
    };

    console.log('[Test] Calling register...');
    await register(mockReqReg, mockResReg, (err) => {
      if (err) throw err;
    });

    console.log('[Test] Register result:', registerResStatus, registerResData);
    assert.equal(registerResStatus, 201, 'Registration step 1 should return 201');
    assert.equal(registerResData?.emailVerificationRequired, true, 'Email verification must be required');

    // Verify Anti-Torn-Register: NO row should exist in PostgreSQL yet!
    const userBeforeOtp = await prisma.user.findUnique({ where: { email: testEmail } });
    assert.equal(userBeforeOtp, null, 'User must NOT be committed to PostgreSQL before OTP & username');

    // 2. Verify OTP (using whitelisted 060540)
    console.log('[Test] Calling verifyOtp...');
    let verifyResData = null;
    const mockReqVerify = {
      body: {
        email: testEmail,
        otp: '060540',
      },
    };
    const mockResVerify = {
      json: (data) => {
        verifyResData = data;
      },
      status: () => mockResVerify,
    };

    await verifyOtp(mockReqVerify, mockResVerify, (err) => {
      if (err) throw err;
    });

    console.log('[Test] VerifyOtp result:', verifyResData);
    assert.equal(verifyResData?.message, 'Email verified.', 'OTP verification must succeed');

    // 3. Complete Registration with Chosen Username
    console.log('[Test] Calling completeRegistration...');
    let completeResStatus = 0;
    let completeResData = null;
    const mockReqComplete = {
      body: {
        email: testEmail,
        username: testUsername,
      },
    };
    const mockResComplete = {
      status: (code) => {
        completeResStatus = code;
        return {
          json: (data) => {
            completeResData = data;
          },
        };
      },
      cookie: () => {},
    };

    await completeRegistration(mockReqComplete, mockResComplete, (err) => {
      if (err) throw err;
    });

    console.log('[Test] CompleteRegistration result:', completeResStatus, completeResData);
    assert.equal(completeResStatus, 201, 'Complete registration should return 201');
    assert.equal(completeResData?.username, testUsername, 'Returned username must be the chosen nickname');

    // Verify that User is now properly committed to PostgreSQL
    const dbUser = await prisma.user.findUnique({ where: { email: testEmail } });
    assert.ok(dbUser, 'User must now exist in PostgreSQL');
    assert.equal(dbUser.nickname, testUsername, 'User nickname must match chosen username');
    assert.equal(dbUser.isEmailVerified, true, 'User isEmailVerified must be true');

    // 4. Test Vertical Slice: Comment Form with Authenticated Identity
    console.log('[Test] Testing Comment vertical slice...');
    let commentResData = null;
    const mockReqComment = {
      user: { userId: dbUser.id },
      body: {
        content: 'This is a test comment for vertical slice verification (min 20 chars).',
        category: 'Other',
        type: 'IDEA',
        identity: 'User',
        username: testUsername,
      },
    };
    const mockResComment = {
      status: () => mockResComment,
      json: (data) => {
        commentResData = data;
      },
    };

    await createComment(mockReqComment, mockResComment, (err) => {
      if (err) throw err;
    });

    console.log('[Test] Comment created:', commentResData);
    assert.ok(commentResData?.comment, 'Comment must be created successfully');
    assert.equal(commentResData.comment.username, testUsername, 'Comment username must match user nickname');

    // 5. Test Vertical Slice: Minigame Status
    console.log('[Test] Testing Minigame vertical slice...');
    let minigameResData = null;
    const mockReqMinigame = {
      user: { userId: dbUser.id, email: dbUser.email },
      headers: {},
    };
    const mockResMinigame = {
      json: (data) => {
        minigameResData = data;
      },
      status: () => mockResMinigame,
    };

    await getMinigameStatus(mockReqMinigame, mockResMinigame, (err) => {
      if (err) throw err;
    });

    console.log('[Test] Minigame status:', minigameResData);
    assert.equal(minigameResData?.success, true, 'Minigame status should succeed');
    assert.equal(typeof minigameResData?.secondsUntilReset, 'number', 'secondsUntilReset must be a number');

    // 6. Test Magic Link Flow: Request Password Reset
    console.log('[Test] Testing Magic Link Request...');
    let resetReqResData = null;
    const mockReqResetReq = {
      body: { email: testEmail },
    };
    const mockResResetReq = {
      json: (data) => {
        resetReqResData = data;
      },
      status: () => mockResResetReq,
    };

    await requestPasswordReset(mockReqResetReq, mockResResetReq, (err) => {
      if (err) throw err;
    });

    console.log('[Test] Reset link requested:', resetReqResData);
    assert.ok(resetReqResData?.message, 'Reset request must return success message');

    // Find the generated reset token in Redis for this test email
    const resetKeys = await redis.keys('reset:*');
    assert.ok(resetKeys.length > 0, 'Reset token must be stored in Redis');
    let resetToken = null;
    for (const k of resetKeys) {
      const val = await redis.get(k);
      if (val === testEmail) {
        resetToken = k.replace('reset:', '');
        break;
      }
    }
    assert.ok(resetToken, 'Must find matching reset token for testEmail');

    // 7. Test Magic Link Flow: Reset Password Confirm
    console.log('[Test] Testing Magic Link Reset Confirm...');
    const newPassword = 'NewSecretPassword1!';
    let resetConfirmData = null;
    const mockReqResetConfirm = {
      body: {
        token: resetToken,
        newPassword,
      },
    };
    const mockResResetConfirm = {
      json: (data) => {
        resetConfirmData = data;
      },
      cookie: () => {},
      status: () => mockResResetConfirm,
    };

    await resetPassword(mockReqResetConfirm, mockResResetConfirm, (err) => {
      if (err) throw err;
    });

    console.log('[Test] Password reset confirmed:', resetConfirmData);
    assert.equal(resetConfirmData?.message, 'Password reset successful.');
    assert.equal(resetConfirmData?.username, testUsername, 'Reset confirm must return user nickname as username');

    // 7b. Verify Cross-Device / Cross-Tab reset status returns completed
    let statusData = null;
    await getResetPasswordStatus({ query: { email: testEmail } }, {
      json: (d) => { statusData = d; }
    });
    console.log('[Test] Password reset status for email:', statusData);
    assert.equal(statusData?.status, 'completed');
    assert.equal(statusData?.username, testUsername);

    // 8. Verify login works with new password
    console.log('[Test] Testing Login with new password...');
    let loginResData = null;
    const mockReqLogin = {
      body: {
        email: testEmail,
        password: newPassword,
      },
    };
    const mockResLogin = {
      json: (data) => {
        loginResData = data;
      },
      cookie: () => {},
      status: () => mockResLogin,
    };

    await login(mockReqLogin, mockResLogin, (err) => {
      if (err) throw err;
    });

    console.log('[Test] Login successful:', loginResData);
    assert.equal(loginResData?.username, testUsername, 'Login must return user nickname as username');

    // Cleanup: Delete the created test user and comments
    await prisma.comment.deleteMany({ where: { userId: dbUser.id } });
    await prisma.user.delete({ where: { id: dbUser.id } });
    console.log('[Test] Cleaned up test user successfully.');
  } catch (err) {
    console.error('[Test Failed!]', err);
    throw err;
  } finally {
    await prisma.$disconnect();
    try {
      redis.disconnect();
    } catch {}
    process.exit(0);
  }
});
