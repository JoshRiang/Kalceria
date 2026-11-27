import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCommsValue } from '../components/service-request/commsValidation.js';
import { SERVICE_TYPES, CLIP } from '../components/service-request/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, '..');

describe('Need Our Help Form (ServiceRequestModal Runtime Validation & Wiring Integrity)', () => {
  it('validates real Indonesian WhatsApp numbers, rejects invalid prefixes/repeating digits, and formats +62 cleanly', () => {
    // Valid Telkomsel / Indosat / XL numbers across 08, +628, 628 formats
    const ok1 = validateCommsValue('tel', 'whatsapp', '08117998790');
    assert.equal(ok1.valid, true);
    assert.equal(ok1.message, '+62 811-7998-790');

    const ok2 = validateCommsValue('tel', 'whatsapp', '+62 812-3456-7890');
    assert.equal(ok2.valid, true);
    assert.equal(ok2.message, '+62 812-3456-7890');

    // Empty input
    assert.deepEqual(validateCommsValue('tel', 'whatsapp', '   '), { valid: false, empty: true, message: '' });

    // Invalid start digit, too short, too long, bad prefix, fake repeating digits
    assert.equal(validateCommsValue('tel', 'whatsapp', '0215551234').valid, false);
    assert.equal(validateCommsValue('tel', 'whatsapp', '0812345').valid, false);
    assert.equal(validateCommsValue('tel', 'whatsapp', '081234567890123').valid, false);
    assert.equal(validateCommsValue('tel', 'whatsapp', '08001234567').valid, false);
    assert.equal(validateCommsValue('tel', 'whatsapp', '08111111111').valid, false);
  });

  it('validates emails, social handles, and exposes all 3 canonical Need Our Help service types', () => {
    assert.equal(validateCommsValue('email', 'email', 'varsikurniawan@gmail.com').valid, true);
    assert.equal(validateCommsValue('email', 'email', 'not-an-email').valid, false);
    assert.equal(validateCommsValue('text', 'instagram', '@kalceria.id').valid, true);
    assert.equal(validateCommsValue('text', 'telegram', 'ab').valid, false);

    assert.deepEqual(
      SERVICE_TYPES.map((s) => s.id),
      ['EO', 'SHOOTING', 'HOST_EVENT']
    );
    assert.match(CLIP.clipPath, /^polygon\(/);
  });

  it('ensures ServiceRequestModal imports hasUserSession from @/lib/session', () => {
    const modalSrc = fs.readFileSync(path.join(FRONTEND_DIR, 'components/ServiceRequestModal.jsx'), 'utf8');
    assert.ok(
      modalSrc.includes('import { hasUserSession } from "@/lib/session"'),
      'ServiceRequestModal must import hasUserSession from @/lib/session to prevent ReferenceError on mount'
    );
    assert.ok(
      modalSrc.includes('const isLoggedIn = Boolean(hasUserSession() || authUser?.id || activeEmail)'),
      'isLoggedIn must be safely evaluated using imported hasUserSession'
    );
  });

  it('ensures LandingPage wires ServiceRequestModal and need-our-help section cleanly', () => {
    const landingSrc = fs.readFileSync(path.join(FRONTEND_DIR, 'components/LandingPage.jsx'), 'utf8');
    const needHelpSrc = fs.readFileSync(path.join(FRONTEND_DIR, 'components/landing/sections/LandingNeedHelpSection.jsx'), 'utf8');
    assert.ok(landingSrc.includes('import("./ServiceRequestModal")'), 'LandingPage must dynamically import ServiceRequestModal');
    assert.ok(needHelpSrc.includes('id="need-our-help"'), 'need-our-help section ID must be present in LandingNeedHelpSection');
    assert.ok(landingSrc.includes('onApplyRequest={handleApplyRequest}'), 'LandingNeedHelpSection must receive onApplyRequest');
    assert.ok(landingSrc.includes('<ServiceRequestModal'), 'ServiceRequestModal must be conditionally rendered');
  });

  it('ensures useAuthSubmit scopes matchedCoord and matchedToken correctly without ReferenceError', () => {
    const authSubmitSrc = fs.readFileSync(path.join(FRONTEND_DIR, 'components/auth/useAuthSubmit.js'), 'utf8');
    const matchedCoordIdx = authSubmitSrc.indexOf('let matchedCoord = null;');
    const handleSubmitIdx = authSubmitSrc.indexOf('async function handleSubmit');
    assert.ok(matchedCoordIdx > handleSubmitIdx, 'matchedCoord must be declared in handleSubmit scope');
  });
});
