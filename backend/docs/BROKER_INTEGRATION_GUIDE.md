# Kalceria Broker Integration Guide

Panduan aktivasi menyeluruh untuk 3 broker eksternal Kalceria:
1. **Resend Email Broker** (Domain Auth/OTP & Domain Notifikasi)
2. **Online Payment Gateway** (Midtrans Snap QRIS/VA atau Xendit Invoice)
3. **WhatsApp Bot Account** (Official Meta WhatsApp Cloud API atau Fonnte)

Seluruh kode backend dan frontend sudah terpasang, teruji (`tests/broker-integrations.test.mjs`), dan berstatus **safe off-by-default**. Anda cukup mendaftar ke penyedia broker, memasukkan kredensial ke environment variables, dan menyalakan flag yang bersangkutan.

---

## 1. Broker Email: Resend (Dual Domain)

Kalceria mengimplementasikan arsitektur dual domain untuk memisahkan reputasi pengiriman email autentikasi (krusial agar OTP tidak masuk spam) dengan email pengumuman/notifikasi.

### Langkah Aktivasi:
1. Daftar akun di [resend.com](https://resend.com).
2. Tambahkan 2 domain/subdomain di menu **Domains**:
   - `auth.kalceria.com` (untuk OTP pendaftaran & reset password)
   - `notify.kalceria.com` (untuk tiket event & konfirmasi booking)
3. Salin catatan DNS (SPF, DKIM, MX) dari dashboard Resend ke DNS provider domain Anda (Cloudflare, Niagahoster, Rumahweb, dll) sesuai template di `backend/docs/dns-records.txt`.
4. Buat API Key di menu **API Keys**.
5. Set environment variables di Vercel Dashboard (`kalceria-backend`):
   ```env
   ENABLE_EMAIL_AUTH=true
   ENABLE_EMAIL_NOTIF=true
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
   EMAIL_FROM_AUTH="Kalceria Security <auth@auth.kalceria.com>"
   EMAIL_FROM_NOTIF="Kalceria <hello@notify.kalceria.com>"
   EMAIL_ADMIN_NOTIF="admin@kalceria.com"
   ```
6. Set di `kalceria-frontend`:
   ```env
   NEXT_PUBLIC_ENABLE_EMAIL_AUTH=true
   ```

---

## 2. Broker Pembayaran Online: Midtrans / Xendit

Mendukung pembayaran otomatis untuk pendaftaran Event (QRIS, GoPay, ShopeePay, Virtual Account BCA/Mandiri/BRI/BNI) tanpa membebani client dengan script pihak ketiga (Lighthouse score tetap tinggi).

### Opsi A: Midtrans (Disarankan untuk Indonesia)
1. Daftar di [dashboard.midtrans.com](https://dashboard.midtrans.com).
2. Buka menu **Settings > Access Keys**:
   - Salin **Server Key** dan **Client Key**.
3. Buka menu **Settings > Configuration**:
   - Isi **Payment Notification URL**:
     `https://kalceria-backend.vercel.app/api/webhooks/payment`
4. Masukkan ke environment variables:
   ```env
   ENABLE_ONLINE_PAYMENT=true
   PAYMENT_PROVIDER=midtrans
   MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxxxxxx
   MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxx
   MIDTRANS_IS_PRODUCTION=false # ubah ke true saat siap live
   ```

### Opsi B: Xendit
1. Daftar di [dashboard.xendit.co](https://dashboard.xendit.co).
2. Salin **Secret API Key** dan generate **Webhook Verification Token**.
3. Masukkan webhook URL:
   `https://kalceria-backend.vercel.app/api/webhooks/payment`
4. Masukkan ke environment variables:
   ```env
   ENABLE_ONLINE_PAYMENT=true
   PAYMENT_PROVIDER=xendit
   XENDIT_SECRET_KEY=xnd_development_xxxxxxxxxxxx
   XENDIT_WEBHOOK_TOKEN=your_webhook_token
   ```

---

## 3. Broker WhatsApp Bot Account

Mengirim konfirmasi otomatis langsung ke nomor WhatsApp peserta Event dan pemesan form "Need Our Help", serta alert instan ke kru/admin.

### Opsi A: Meta WhatsApp Cloud API (Resmi dari Meta)
1. Buat aplikasi di [developers.facebook.com](https://developers.facebook.com) tipe **Business**.
2. Tambahkan produk **WhatsApp**.
3. Dapatkan:
   - **Phone Number ID**
   - **System User Access Token** (Permanent Token)
   - **App Secret**
4. Di bagian **Configuration Webhook**:
   - Callback URL: `https://kalceria-backend.vercel.app/api/webhooks/whatsapp`
   - Verify Token: (buat string rahasia unik, misalnya `kalceria_meta_verify_2026`)
   - Centang subscription: `messages`.
5. Masukkan ke environment variables:
   ```env
   ENABLE_WHATSAPP_BOT=true
   WA_BOT_PROVIDER=meta_cloud
   WA_PHONE_NUMBER_ID=100000000000000
   WA_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxx
   WA_APP_SECRET=xxxxxxxxxxxxxxxxxxxx
   WA_WEBHOOK_VERIFY_TOKEN=kalceria_meta_verify_2026
   WA_ADMIN_NUMBER=6281234567890
   ```

### Opsi B: Fonnte (Gateway Alternatif Populer di Komunitas)
1. Daftar di [fonnte.com](https://fonnte.com) dan tautkan perangkat WhatsApp Anda via QR scan.
2. Salin token perangkat.
3. Masukkan ke environment variables:
   ```env
   ENABLE_WHATSAPP_BOT=true
   WA_BOT_PROVIDER=fonnte
   WA_FONNTE_TOKEN=your_fonnte_token
   WA_ADMIN_NUMBER=6281234567890
   ```

---

## 4. Cara Mengetes Kesiapan Broker (Readiness Diagnostics)

Admin dapat melihat status kesiapan seluruh broker secara real-time melalui endpoint API:
- **Status Publik**: `GET /api/integrations/status`
- **Diagnostik Admin**: `GET /api/admin/integrations/readiness` (memerlukan session Admin)

Diagnostik akan memeriksa apakah semua environment variable yang dibutuhkan sudah terisi tanpa pernah mengekspos isi rahasia API key.
