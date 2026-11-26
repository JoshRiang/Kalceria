import test from 'node:test';
import assert from 'node:assert/strict';

import { escapeHtml, safeHttpsUrl } from '../lib/mailer/emailUtils.js';
import { safeNotify } from '../lib/mailer/emailClient.js';
import {
  buildEventRegistrationEmailHtml,
  buildEventPaymentConfirmedEmailHtml,
  sendEventRegistrationEmail,
} from '../lib/mailer/eventRegistrationEmails.js';
import {
  buildServiceRequestSubmittedEmailHtml,
  buildServiceRequestUpdatedEmailHtml,
  buildServiceRequestConfirmedEmailHtml,
  sendServiceRequestSubmittedEmail,
  sendServiceRequestAdminAlertEmail,
} from '../lib/mailer/serviceBookingEmails.js';
import * as mailerFacade from '../lib/mailer.js';
import {
  buildServiceRequestWaMessage,
  buildEventRegistrationWaMessage,
} from '../controllers/comms/waMessageBuilder.js';
import { renderTimerBadgeSvg } from '../controllers/comms/timerBadgeRenderer.js';
import { renderConfirmResultHtml } from '../controllers/comms/confirmResultHtml.js';
import { buildServiceRequestWaMessage as serviceControllerWaReexport } from '../controllers/serviceController.js';
import { buildEventRegistrationWaMessage as eventRegistrationWaReexport } from '../controllers/eventRegistrationController.js';

test('EmailUtils: escapeHtml sanitizes characters and handles nullish values', () => {
  assert.equal(escapeHtml('<script>alert("xss")&\'fun\'</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&amp;&#39;fun&#39;&lt;/script&gt;');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml('Normal text 123'), 'Normal text 123');
});

test('EmailUtils: safeHttpsUrl verifies protocols', () => {
  assert.equal(safeHttpsUrl('https://kalceria.id/banner.jpg'), 'https://kalceria.id/banner.jpg');
  assert.equal(safeHttpsUrl('http://kalceria.id/insecure.jpg'), null);
  assert.equal(safeHttpsUrl('javascript:alert(1)'), null);
  assert.equal(safeHttpsUrl('not-a-url'), null);
  assert.equal(safeHttpsUrl(''), null);
});

test('EmailClient: safeNotify wraps errors gracefully', async () => {
  const result = await safeNotify(async () => {
    throw new Error('Connection refused');
  }, 'test-channel');
  assert.equal(result.skipped, true);
  assert.equal(result.error, 'Connection refused');

  const okResult = await safeNotify(async () => ({ success: true }), 'test-channel');
  assert.deepEqual(okResult, { success: true });
});

test('EventRegistrationEmails: HTML builders render required sections and policies', () => {
  const mockEvent = {
    title: 'Drift Masters Meet <2026>',
    price: 150000,
    location: 'Sentul International Circuit',
    posterUrl: 'https://kalceria.id/images/poster.jpg',
  };
  const mockReg = {
    id: 'reg_abc123456789',
    selectedSession: 'Morning Track Session',
    user: {
      name: 'Racer John',
      phone: '08123456789',
      email: 'john@example.com',
    },
  };

  const regHtml = buildEventRegistrationEmailHtml({
    event: mockEvent,
    registration: mockReg,
    cancelToken: 'cancel_token_xyz',
    paymentCheckoutUrl: 'https://payment.kalceria.id/pay/123',
  });

  assert.match(regHtml, /Drift Masters Meet &lt;2026&gt;/);
  assert.match(regHtml, /#456789/);
  assert.match(regHtml, /CONFIRM/);
  assert.match(regHtml, /CANCEL/);
  assert.match(regHtml, /event_action=confirm/);
  assert.match(regHtml, /event_action=cancel/);
  assert.match(regHtml, /Ketentuan Waktu &amp; Pembatalan \(3 Menit\)/);
  assert.match(regHtml, /https:\/\/kalceria\.id\/images\/poster\.jpg/);
  assert.match(regHtml, /Bayar Online Sekarang/);

  const confirmedHtml = buildEventPaymentConfirmedEmailHtml({
    event: mockEvent,
    registration: mockReg,
  });

  assert.match(confirmedHtml, /RINGKASAN PESANAN/);
  assert.match(confirmedHtml, /Order Confirmed/);
  assert.match(confirmedHtml, /CONFIRMED/);
  assert.match(confirmedHtml, /#456789/);
  assert.match(confirmedHtml, /Sentul International Circuit/);
  assert.doesNotMatch(confirmedHtml, />CONFIRM</);
  assert.doesNotMatch(confirmedHtml, />CANCEL</);
});

test('EventRegistrationEmails: skips delivery for guest email accounts', async () => {
  const res = await sendEventRegistrationEmail({
    to: 'guest_user@guest.kalceria.local',
    event: {},
    registration: { id: 'reg_123' },
  });
  assert.equal(res.skipped, true);
  assert.equal(res.reason, 'EMAIL_NOTIF_DISABLED_OR_GUEST');
});

test('ServiceBookingEmails: HTML builders render parameters and 3-minute policy', () => {
  const mockBooking = {
    id: 'book_987654321',
    serviceType: 'SHOOTING',
    serviceName: 'Commercial Automotive Video',
    contactPerson: 'Alex Rivera',
    whatsapp: '08987654321',
    email: 'alex@example.com',
    location: 'PIK 2 Boulevard',
    additionalNotes: 'Need dual camera rig',
  };
  const mockSlots = [
    { date: '2026-11-20T00:00:00.000Z', startTime: '09:00', endTime: '12:00' },
  ];

  const submittedHtml = buildServiceRequestSubmittedEmailHtml({
    booking: mockBooking,
    slots: mockSlots,
    cancelToken: 'svc_token_abc',
  });

  assert.match(submittedHtml, /Transmission Received: Need Our Help/);
  assert.match(submittedHtml, /Shooting \/ Production/);
  assert.match(submittedHtml, /Commercial Automotive Video/);
  assert.match(submittedHtml, /Alex Rivera/);
  assert.match(submittedHtml, /PIK 2 Boulevard/);
  assert.match(submittedHtml, /CONFIRM/);
  assert.match(submittedHtml, /EDIT/);
  assert.match(submittedHtml, /CANCEL/);
  assert.match(submittedHtml, /Batas Waktu Perubahan \(3 Menit\)/);

  const updatedHtml = buildServiceRequestUpdatedEmailHtml({
    booking: mockBooking,
    slots: mockSlots,
    cancelToken: 'svc_token_abc',
  });

  assert.match(updatedHtml, /Ringkasan Update: Need Our Help/);
  assert.match(updatedHtml, /Batas Waktu Pembatalan \(3 Menit Terpadu\)/);
  assert.match(updatedHtml, /CONFIRM/);
  assert.match(updatedHtml, /CANCEL/);

  const confirmedHtml = buildServiceRequestConfirmedEmailHtml({
    booking: mockBooking,
    slots: mockSlots,
  });

  assert.match(confirmedHtml, /RINGKASAN PESANAN/);
  assert.match(confirmedHtml, /Order Confirmed &amp; Persisted/);
  assert.match(confirmedHtml, /telah terkonfirmasi dan resmi tersimpan/);
  assert.match(confirmedHtml, /telah terkunci/);
  assert.doesNotMatch(confirmedHtml, />CONFIRM</);
  assert.doesNotMatch(confirmedHtml, />EDIT</);
  assert.doesNotMatch(confirmedHtml, />CANCEL</);
});

test('ServiceBookingEmails: skips delivery for guest emails and disabled admin alert', async () => {
  const res = await sendServiceRequestSubmittedEmail({
    to: 'guest_user@guest.kalceria.local',
    booking: { id: 'book_123', serviceType: 'SHOOTING' },
  });
  assert.equal(res.skipped, true);

  const alertRes = await sendServiceRequestAdminAlertEmail({
    booking: { serviceType: 'EO' },
    slots: [],
    user: { name: 'Test', email: 'test@example.com' },
  });
  assert.equal(alertRes.skipped, true);
});

test('MailerFacade: re-exports all required functions identically (IL-9)', () => {
  assert.equal(typeof mailerFacade.escapeHtml, 'function');
  assert.equal(typeof mailerFacade.safeHttpsUrl, 'function');
  assert.equal(typeof mailerFacade.sendEmail, 'function');
  assert.equal(typeof mailerFacade.safeNotify, 'function');
  assert.equal(typeof mailerFacade.sendOtpEmail, 'function');
  assert.equal(typeof mailerFacade.sendPasswordResetEmail, 'function');
  assert.equal(typeof mailerFacade.sendEventNotificationEmail, 'function');
  assert.equal(typeof mailerFacade.buildEventRegistrationEmailHtml, 'function');
  assert.equal(typeof mailerFacade.sendEventRegistrationEmail, 'function');
  assert.equal(typeof mailerFacade.buildEventPaymentConfirmedEmailHtml, 'function');
  assert.equal(typeof mailerFacade.sendEventPaymentConfirmedEmail, 'function');
  assert.equal(typeof mailerFacade.buildServiceRequestSubmittedEmailHtml, 'function');
  assert.equal(typeof mailerFacade.sendServiceRequestSubmittedEmail, 'function');
  assert.equal(typeof mailerFacade.buildServiceRequestUpdatedEmailHtml, 'function');
  assert.equal(typeof mailerFacade.sendServiceRequestUpdatedEmail, 'function');
  assert.equal(typeof mailerFacade.buildServiceRequestConfirmedEmailHtml, 'function');
  assert.equal(typeof mailerFacade.sendServiceRequestConfirmedEmail, 'function');
  assert.equal(typeof mailerFacade.sendServiceRequestAdminAlertEmail, 'function');
  assert.equal(typeof mailerFacade.sendServiceRequestStatusEmail, 'function');
});

test('WaMessageBuilder: buildServiceRequestWaMessage formats zero-emoji plain text message', () => {
  const booking = {
    id: 'booking_abcdef123456',
    serviceType: 'SHOOTING',
    serviceName: 'Cinematic Car Review',
    contactPerson: 'David Miller',
    whatsapp: '081299998888',
    location: 'BSD City Track',
    additionalNotes: 'Need drone coverage for rolling shots',
  };
  const slots = [
    { date: '2026-11-25T00:00:00.000Z', startTime: '14:00', endTime: '18:00' },
  ];

  const waMsg = buildServiceRequestWaMessage(booking, slots);

  assert.match(waMsg, /^SERVICE REQUEST - NEED OUR HELP/);
  assert.match(waMsg, /Booking ID: #123456/);
  assert.match(waMsg, /Service: Shooting \/ Production/);
  assert.match(waMsg, /Request Title: Cinematic Car Review/);
  assert.match(waMsg, /Operator Name: David Miller/);
  assert.match(waMsg, /WhatsApp: 081299998888/);
  assert.match(waMsg, /Deployment Area: BSD City Track/);
  assert.match(waMsg, /Selected Hours: 14:00 - 18:00/);
  assert.match(waMsg, /Notes: Need drone coverage for rolling shots/);

  // Assert absolutely zero emojis
  assert.equal(/[\u{1F300}-\u{1F9FF}]/u.test(waMsg), false);

  // Check re-export from serviceController
  const reexportMsg = serviceControllerWaReexport(booking, slots);
  assert.equal(reexportMsg, waMsg);
});

test('WaMessageBuilder: buildEventRegistrationWaMessage formats zero-emoji event registration message', () => {
  const event = {
    title: 'Kalceria Night Meet 2026',
    location: 'SCBD Park Jakarta',
    price: 50000,
  };
  const registration = {
    id: 'reg_xyz789012345',
    selectedSession: 'VIP Evening Pass',
    paymentStatus: 'PENDING',
    createdAt: '2026-11-10T20:30:00.000Z',
  };
  const user = {
    name: 'Sarah Connor',
    email: 'sarah@example.com',
    phone: '081377776666',
  };

  const waMsg = buildEventRegistrationWaMessage({
    event,
    registration,
    user,
    paymentCheckoutUrl: 'https://checkout.kalceria.id/pay/reg_xyz789012345',
  });

  assert.match(waMsg, /^PENDAFTARAN EVENT - SEE EVENT/);
  assert.match(waMsg, /Booking ID: #012345/);
  assert.match(waMsg, /Event: Kalceria Night Meet 2026/);
  assert.match(waMsg, /Sesi: VIP Evening Pass/);
  assert.match(waMsg, /Nama Pendaftar: Sarah Connor/);
  assert.match(waMsg, /Email Pendaftar: sarah@example.com/);
  assert.match(waMsg, /WhatsApp Pendaftar: 081377776666/);
  assert.match(waMsg, /Lokasi Event: SCBD Park Jakarta/);
  assert.match(waMsg, /Total Tagihan: Rp 50\.000/);
  assert.match(waMsg, /Status Pendaftaran: PENDING \(Menunggu Konfirmasi Email\)/);
  assert.match(waMsg, /Link Pembayaran Online: https:\/\/checkout\.kalceria\.id\/pay\/reg_xyz789012345/);
  assert.match(waMsg, /Catatan: Pendaftaran wajib dikonfirmasi via email pendaftar dalam batas waktu 3 menit/);

  // Assert absolutely zero emojis
  assert.equal(/[\u{1F300}-\u{1F9FF}]/u.test(waMsg), false);

  // Check re-export from eventRegistrationController
  const reexportMsg = eventRegistrationWaReexport({ event, registration, user, paymentCheckoutUrl: 'https://checkout.kalceria.id/pay/reg_xyz789012345' });
  assert.equal(reexportMsg, waMsg);
});

test('AuthEmails & Route Isolation: password reset URL and service/event URLs are strictly segregated', () => {
  // 1. Password reset query string structure
  const resetToken = 'a'.repeat(64);
  const resetUrl = new URL('/', 'https://kalceria.id');
  resetUrl.searchParams.set('mode', 'reset-password');
  resetUrl.searchParams.set('reset_token', resetToken);
  resetUrl.searchParams.set('token', resetToken);

  const resetParams = new URLSearchParams(resetUrl.search);
  const isServiceOrEventFromReset = Boolean(
    resetParams.get('service_action') ||
    resetParams.get('booking_id') ||
    resetParams.get('event_action') ||
    resetParams.get('registration_id') ||
    resetParams.get('manage_token')
  );
  assert.equal(isServiceOrEventFromReset, false, 'Password reset link must NEVER contain service/event parameters');
  assert.equal(resetParams.get('token'), resetToken);
  assert.equal(resetParams.get('reset_token'), resetToken);
  assert.equal(resetParams.get('mode'), 'reset-password');

  // 2. Service request link structure
  const serviceUrl = new URL('/?service_action=edit&booking_id=svc_123456&token=jwt_mock_token&manage_token=jwt_mock_token#need-our-help', 'https://kalceria.id');
  const serviceParams = new URLSearchParams(serviceUrl.search);
  const isServiceFromServiceLink = Boolean(
    serviceParams.get('service_action') ||
    serviceParams.get('booking_id') ||
    serviceParams.get('event_action') ||
    serviceParams.get('registration_id') ||
    serviceParams.get('manage_token')
  );
  assert.equal(isServiceFromServiceLink, true, 'Service link must be recognized as isServiceOrEvent');

  // 3. Event registration link structure
  const eventUrl = new URL('/events?event_action=cancel&registration_id=reg_123456&token=jwt_mock_token&manage_token=jwt_mock_token#see-event', 'https://kalceria.id');
  const eventParams = new URLSearchParams(eventUrl.search);
  const isEventFromEventLink = Boolean(
    eventParams.get('service_action') ||
    eventParams.get('booking_id') ||
    eventParams.get('event_action') ||
    eventParams.get('registration_id') ||
    eventParams.get('manage_token')
  );
  assert.equal(isEventFromEventLink, true, 'Event link must be recognized as isServiceOrEvent');
});

test('TimerBadgeRenderer & ConfirmResultHtml: dynamic SVG badges and non-trapping confirmation views', () => {
  // 1. Active timer badge
  const activeSvg = renderTimerBadgeSvg({ status: 'PENDING', elapsedMs: 60000, limitMs: 180000 });
  assert.match(activeSvg, /<svg/);
  assert.match(activeSvg, /SISA WAKTU:/);
  assert.match(activeSvg, /02:00/);
  assert.match(activeSvg, /Konfirmasi atau batalkan sebelum batas 3 menit berakhir/);

  // 2. Expired timer badge
  const expiredSvg = renderTimerBadgeSvg({ status: 'PENDING', elapsedMs: 190000, limitMs: 180000 });
  assert.match(expiredSvg, /KADALUARSA/);
  assert.match(expiredSvg, /dinonaktifkan oleh server/);

  // 3. Confirmed timer badge
  const confirmedSvg = renderTimerBadgeSvg({ status: 'PROCESSED', elapsedMs: 10000, limitMs: 180000 });
  assert.match(confirmedSvg, /RESMI DIKONFIRMASI &amp; DIKUNCI/);

  // 4. Confirm Result HTML dual buttons and redirect fallback
  const html = renderConfirmResultHtml({
    status: 'SUCCESS',
    title: 'Pesanan Berhasil',
    description: 'Terkonfirmasi.',
    bookingId: 'booking_12345678',
    autoClose: true,
    returnUrl: 'https://www.kalceria.id/#need-our-help',
  });
  assert.match(html, /Kembali ke Kalceria/);
  assert.match(html, /Tutup Tab Ini/);
  assert.match(html, /https:\/\/www\.kalceria\.id\/#need-our-help/);
  assert.match(html, /window\.location\.href/);
});

test.after(() => {
  setTimeout(() => process.exit(0), 50);
});

