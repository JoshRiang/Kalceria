# API Reference: Backend Endpoints

Comprehensive API documentation untuk semua backend routes.

---

## 📋 API Structure

**Base URL**: `https://api.kalceria.co.id/api`

**Authentication**: Bearer token (header: `Authorization: Bearer {token}`)

**Response Format**: JSON

---

## 🔐 Authentication Endpoints

### Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "dateOfBirth": "1995-05-15",
  "phone": "+62812xxxxxxxx",
  "gender": "male",
  "domicileLat": -6.2088,
  "domicileLng": 106.8456
}

Response 201:
{
  "success": true,
  "message": "Registration successful. Check your email for verification PIN.",
  "userId": "user123"
}

Response 400:
{
  "error": "Email already registered"
}
```

### Verify Email

```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "email": "user@example.com",
  "pin": "123456"
}

Response 200:
{
  "success": true,
  "message": "Email verified successfully"
}

Response 400:
{
  "error": "Invalid or expired PIN"
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response 200:
{
  "success": true,
  "token": "eyJhbGciOiJSUzI1NiIs...",
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "username": "johndoe",
    "name": "John Doe"
  }
}

Response 401:
{
  "error": "Invalid credentials"
}
```

### Logout

```http
POST /api/auth/logout
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Password Reset Request

```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}

Response 200:
{
  "success": true,
  "message": "Password reset link sent to email"
}
```

### Reset Password

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePass456!"
}

Response 200:
{
  "success": true,
  "message": "Password reset successful"
}
```

---

## 👤 User Endpoints

### Get Current User

```http
GET /api/users/me
Authorization: Bearer {token}

Response 200:
{
  "id": "user123",
  "email": "user@example.com",
  "username": "johndoe",
  "name": "John Doe",
  "phone": "+62812xxxxxxxx",
  "allowLiveLocation": true,
  "district": "Jakarta Selatan",
  "whatsapp": null,
  "instagram": "@johndoe",
  "facebook": null
}
```

### Update Profile

```http
PUT /api/users/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "username": "newusername",
  "name": "John Doe Updated",
  "phone": "+62812yyyyyyyy",
  "whatsapp": "+62812zzzzzzzz",
  "instagram": "@johnupdated",
  "allowLiveLocation": true
}

Response 200:
{
  "success": true,
  "user": { ... }
}
```

### Upload Profile Photo

```http
POST /api/users/me/photo
Authorization: Bearer {token}
Content-Type: multipart/form-data

[file: image.jpg]

Response 200:
{
  "success": true,
  "photoUrl": "https://cdn.kalceria.co.id/photos/user123.jpg"
}
```

### Get User by ID (Public Profile)

```http
GET /api/users/{userId}

Response 200:
{
  "id": "user123",
  "username": "johndoe",
  "name": "John Doe",
  "profilePhoto": "url",
  "district": "Jakarta Selatan",
  "instagram": "@johndoe",
  "facebook": null,
  "whatsapp": null  // Masked if available
}
```

---

## 🎫 Event Endpoints

### List All Events

```http
GET /api/events?page=1&limit=10&status=upcoming

Response 200:
{
  "success": true,
  "events": [
    {
      "id": "event123",
      "title": "Car Gathering 2026",
      "description": "...",
      "eventDate": "2026-05-15T08:00:00Z",
      "registrationStart": "2026-05-01T00:00:00Z",
      "registrationEnd": "2026-05-13T23:59:59Z",
      "registrationFee": 150000,
      "displayPhoto": "url",
      "sessions": ["Morning", "Afternoon"],
      "registeredCount": 45,
      "maxAttendees": 100
    }
  ],
  "total": 150,
  "page": 1
}
```

### Get Event Details

```http
GET /api/events/{eventId}

Response 200:
{
  "id": "event123",
  "title": "Car Gathering 2026",
  "description": "...",
  "eventDate": "2026-05-15T08:00:00Z",
  "registrationStart": "2026-05-01T00:00:00Z",
  "registrationEnd": "2026-05-13T23:59:59Z",
  "registrationFee": 150000,
  "displayPhoto": "url",
  "sessions": ["Morning", "Afternoon"],
  "registeredCount": 45,
  "maxAttendees": 100,
  "currentUserStatus": "registered"  // If logged in
}
```

### Register for Event

```http
POST /api/events/{eventId}/register
Authorization: Bearer {token}
Content-Type: application/json

{
  "selectedSession": "Morning"
}

Response 201:
{
  "success": true,
  "registrationId": "userEvent123",
  "invoice": {
    "id": "inv123",
    "amount": 150000,
    "virtualAccount": "1234567890123456789",
    "expiresAt": "2026-05-13T23:59:59Z"
  }
}

Response 409:
{
  "error": "Already registered for this event"
}
```

### Get My Event Registrations

```http
GET /api/events/my-registrations
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "registrations": [
    {
      "id": "userEvent123",
      "event": { ... },
      "selectedSession": "Morning",
      "paymentStatus": "confirmed",
      "registeredAt": "2026-05-02T10:30:00Z"
    }
  ]
}
```

---

## 📸 Merchandise Endpoints

### List All Merch

```http
GET /api/merch?page=1&limit=8&sort=newest

Response 200:
{
  "success": true,
  "merch": [
    {
      "id": "merch123",
      "name": "Kalceria T-Shirt",
      "description": "...",
      "photo": "url",
      "tokopediaLink": "https://tokopedia.com/...",
      "shopeeLink": "https://shopee.co.id/...",
      "isLatest": true,
      "displayCount": 125
    }
  ],
  "total": 42
}
```

### Get Merch Randomized (Frontend)

```http
GET /api/merch/random?count=4

Response 200:
{
  "success": true,
  "merch": [
    { id: "merch1", name: "...", photo: "url", ... },
    { id: "merch2", name: "...", photo: "url", ... },
    { id: "merch3", name: "...", photo: "url", ... },
    { id: "merch4", name: "...", photo: "url", ... }
  ]
}
```

---

## 🗺️ Location & Map Endpoints

### Update Live Location

```http
POST /api/location/update
Authorization: Bearer {token}
Content-Type: application/json

{
  "lat": -6.2088,
  "lng": 106.8456
}

Response 200:
{
  "success": true,
  "message": "Location updated"
}

Rate limit: Max 2 updates per minute
```

### Get Nearby Users

```http
GET /api/location/nearby?lat=-6.2&lng=106.8&radius=50

Response 200:
{
  "success": true,
  "users": [
    {
      "userId": "user123",
      "username": "johndoe",
      "district": "Jakarta Selatan",
      "profilePhoto": "url",
      "distance": 2.5,  // km
      "hasContact": true
    }
  ]
}
```

### Get Mini Events Active

```http
GET /api/mini-events/active

Response 200:
{
  "success": true,
  "events": [
    {
      "id": "event123",
      "userId": "user123",
      "username": "johndoe",
      "title": "Meeting at Bintaro",
      "description": "...",
      "lat": -6.2088,
      "lng": 106.8456,
      "expiresAt": "2026-05-07T10:30:00Z"
    }
  ]
}
```

### Create Mini Event

```http
POST /api/mini-events
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Meeting at Bintaro",
  "description": "Gathering for coffee talk"
}

Response 201:
{
  "success": true,
  "event": {
    "id": "event123",
    "expiresAt": "2026-05-07T10:30:00Z"
  }
}

Constraint: One per user (creates new or updates existing)
```

### Update Mini Event

```http
PUT /api/mini-events/{eventId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Updated title",
  "description": "Updated description"
}

Response 200:
{
  "success": true,
  "event": { ... }
}
```

### Delete Mini Event

```http
DELETE /api/mini-events/{eventId}
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "message": "Mini event deleted"
}
```

### Create/Update Broadcast Status

```http
POST /api/broadcasts
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": "Heading to Semarang for automotive meet!"
}

Response 201:
{
  "success": true,
  "broadcast": {
    "id": "broadcast123",
    "message": "...",
    "expiresAt": "2026-05-07T10:30:00Z"
  }
}

Constraint: One per user
```

### Get User Broadcast

```http
GET /api/broadcasts/{userId}

Response 200:
{
  "userId": "user123",
  "message": "...",
  "expiresAt": "2026-05-07T10:30:00Z"
}

Response 404:
{
  "error": "No broadcast found for this user"
}
```

---

## 🛠️ Service Booking Endpoints

### Get Available Services

```http
GET /api/services

Response 200:
{
  "success": true,
  "services": [
    {
      "id": "service123",
      "name": "Shooting",
      "description": "...",
      "basePrice": 120000,
      "operatingHoursStart": 9,
      "operatingHoursEnd": 0
    }
  ]
}
```

### Create Service Booking

```http
POST /api/service-bookings
Authorization: Bearer {token}
Content-Type: application/json

{
  "serviceId": "service123",
  "requestedDate": "2026-05-10",
  "startTime": 9,
  "endTime": 12
}

Response 201:
{
  "success": true,
  "booking": {
    "id": "booking123",
    "hoursBooked": 3,
    "totalPrice": 360000,
    "invoice": {
      "id": "inv456",
      "amount": 360000,
      "virtualAccount": "...",
      "expiresAt": "2026-05-08T23:59:59Z"
    }
  }
}

Validation:
- Date: Max 7 days ahead
- Hours: Min 1, max 15
- Times: Within office hours (09:00-00:00)
```

### Get My Bookings

```http
GET /api/service-bookings/my-bookings
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "bookings": [
    {
      "id": "booking123",
      "service": { name: "Shooting", ... },
      "requestedDate": "2026-05-10",
      "startTime": 9,
      "endTime": 12,
      "totalPrice": 360000,
      "status": "pending",
      "createdAt": "2026-05-06T10:30:00Z"
    }
  ]
}
```

---

## 🛡️ Admin Endpoints

### Create Event (Admin only)

```http
POST /api/admin/events
Authorization: Bearer {admin_token}
Content-Type: multipart/form-data

{
  "title": "Car Meet 2026",
  "description": "...",
  "eventDate": "2026-05-15T08:00:00Z",
  "registrationStart": "2026-05-01T00:00:00Z",
  "registrationEnd": "2026-05-13T23:59:59Z",
  "registrationFee": 150000,
  "sessions": ["Morning", "Afternoon"],
  "maxAttendees": 100,
  "photo": [file]
}

Response 201:
{
  "success": true,
  "event": { ... }
}
```

### Send Event Notification (Admin only)

```http
POST /api/admin/events/{eventId}/send-notification
Authorization: Bearer {admin_token}

Response 200:
{
  "success": true,
  "message": "Email notification queued for 150 users",
  "jobId": "job123"
}
```

### List Service Bookings (Admin only)

```http
GET /api/admin/service-bookings?status=pending&limit=20
Authorization: Bearer {admin_token}

Response 200:
{
  "success": true,
  "bookings": [
    {
      "id": "booking123",
      "user": { name: "...", email: "...", ... },
      "service": { name: "Shooting" },
      "requestedDate": "2026-05-10",
      "status": "pending",
      "totalPrice": 360000
    }
  ]
}
```

### Approve Booking (Admin only)

```http
POST /api/admin/service-bookings/{bookingId}/approve
Authorization: Bearer {admin_token}

Response 200:
{
  "success": true,
  "message": "Booking approved and user notified"
}
```

---

## 🔍 Health & Status

### API Health Check

```http
GET /api/health

Response 200:
{
  "status": "ok",
  "timestamp": "2026-05-06T10:30:00Z",
  "database": "connected",
  "redis": "connected"
}
```

### Get CSRF Token

```http
GET /api/csrf-token

Response 200:
{
  "csrfToken": "token_value"
}
```

---

## ❌ Error Responses

### Standard Error Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "error details"
  }
}
```

### Common Errors

| Status | Code           | Message                 |
| ------ | -------------- | ----------------------- |
| 400    | BAD_REQUEST    | Invalid input           |
| 401    | UNAUTHORIZED   | Authentication required |
| 403    | FORBIDDEN      | Access denied           |
| 404    | NOT_FOUND      | Resource not found      |
| 409    | CONFLICT       | Already exists          |
| 429    | RATE_LIMITED   | Too many requests       |
| 500    | INTERNAL_ERROR | Server error            |

---

## 📊 Pagination

All list endpoints support pagination:

```
GET /api/events?page=1&limit=10&sort=-createdAt

Query Params:
- page: Page number (default: 1)
- limit: Items per page (default: 10, max: 100)
- sort: Sort field (prefix with - for descending)
```

Response includes:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "pages": 15
  }
}
```

---

## 🚀 Rate Limits

```
- General API: 100 requests per 15 minutes per IP
- Login: 5 attempts per 15 minutes per email
- Location update: 2 updates per minute per user
- Event registration: 1 registration per event per user
```

---

## 🔐 Authentication Headers

All protected endpoints require:

```
Authorization: Bearer {token}
```

Token obtained from login response, valid for 20 minutes.
