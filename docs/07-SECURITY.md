# Security: Authentication & Data Protection

Sistem keamanan untuk autentikasi user, enkripsi data, dan rate limiting.

---

## 🔐 Authentication System

### Registration Flow

**Step 1**: Email verification

```
1. User submits email
2. Generate 6-digit PIN
3. Send email with PIN
4. User enters PIN in form
5. Validate PIN (expires in 15 minutes)
6. Mark email as verified
```

**Step 2**: Password setup

```
Requirements:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- At least 1 special character (!@#$%^&*)
- Hash with Argon2 (salt: 16)

Strength meter: Visual indicator
- Weak (red)
- Fair (yellow)
- Strong (green)
```

**Step 3**: Profile setup

```
- Name
- Date of birth
- Phone number
- Gender
- Domicile (for map feature)
- Profile photo (optional)
```

**Step 4**: Username selection

```
- Username must be unique
- 3-20 characters
- Alphanumeric + underscore
- Used for display only (email is unique identifier)
```

### Prisma User Model

```prisma
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  username        String?   @unique
  password        String    // Argon2 hashed

  emailVerified   Boolean   @default(false)
  verificationPin String?   // Temporary PIN

  name            String
  dateOfBirth     DateTime
  phone           String
  profilePhoto    Bytes?

  // ... other fields
}
```

---

## 🔑 Session & Token Management

### Session Token (RSA-based)

**Algorithm**: RSA-2048
**Duration**: 20 minutes
**Storage**: Redis + SessionToken table

```prisma
model SessionToken {
  id          String   @id @default(cuid())
  userId      String
  token       String   @unique
  isValid     Boolean  @default(true)
  expiresAt   DateTime // now() + 20min
  linkedEventId String? // Optional: for event registration
  createdAt   DateTime @default(now())
}
```

### Token Generation

```javascript
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

// Generate RSA keypair (one-time)
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

// Create token
function generateToken(userId, linkedEventId = null) {
  const payload = {
    userId,
    linkedEventId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 20 * 60, // 20 min
  };

  const token = jwt.sign(payload, privateKey, { algorithm: "RS256" });

  // Store in Redis
  redis.setex(`token:${token}`, 20 * 60, userId);

  return token;
}

// Verify token
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, publicKey, { algorithms: ["RS256"] });
    return decoded;
  } catch (error) {
    return null;
  }
}
```

### Login Flow

```
1. User submits email + password
2. Query user from database
3. Compare password (Argon2.verify)
4. If match:
   a. Generate session token (RSA)
   b. Store in Redis
   c. Return token to frontend
   d. Frontend stores in localStorage/cookie
5. If no match:
   - Return error: "Invalid credentials"
   - Log failed attempt (for security)
```

### Login Session Cookie

```javascript
// Set HTTP-only cookie (secure)
res.cookie("sessionToken", token, {
  httpOnly: true, // JavaScript can't access
  secure: true, // HTTPS only
  sameSite: "strict", // CSRF protection
  maxAge: 20 * 60 * 1000, // 20 minutes
});
```

---

## 🛡️ Password Security

### Argon2 Hashing

```javascript
const argon2 = require("argon2");

// Hash password on registration
async function hashPassword(password) {
  const hash = await argon2.hash(password, {
    type: argon2.argon2i,
    memoryCost: 2 ** 16, // 64MB
    timeCost: 3,
    parallelism: 1,
  });
  return hash;
}

// Verify on login
async function verifyPassword(password, hash) {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
```

### Password Reset Flow

```
1. User clicks "Forgot password"
2. Enter email
3. Generate random token (crypto.randomBytes)
4. Create reset link: https://kalceria.co.id/reset?token=abc123...
5. Send email with link (valid for 1 hour)
6. User clicks link
7. User enters new password (validate strength)
8. Hash new password
9. Update User.password
10. Invalidate all existing tokens for that user
```

---

## 🔒 Data Encryption

### PCI DSS Compliance (Transactions)

**Sensitive fields** (Transaction table):

- Virtual account numbers
- Payment amounts (optional)

```javascript
const crypto = require("crypto");

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const ALGORITHM = "aes-256-gcm";

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

function decrypt(encryptedData) {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
```

### Field-Level Encryption Example

```prisma
model Transaction {
  id              String
  // Normal fields
  amount          Decimal  // Or encrypted string
  // Encrypted fields (stored as strings)
  virtualAccount  String   // Encrypted via model hook
  paymentMethod   String   // Encrypted
}
```

```javascript
// Prisma middleware for auto-encryption
prisma.$use(async (params, next) => {
  if (params.model === "Transaction") {
    if (params.action === "create" || params.action === "update") {
      if (params.data.virtualAccount) {
        params.data.virtualAccount = encrypt(params.data.virtualAccount);
      }
      if (params.data.paymentMethod) {
        params.data.paymentMethod = encrypt(params.data.paymentMethod);
      }
    }

    const result = await next(params);

    if (params.action === "findUnique" || params.action === "findMany") {
      if (result.virtualAccount) {
        result.virtualAccount = decrypt(result.virtualAccount);
      }
      if (result.paymentMethod) {
        result.paymentMethod = decrypt(result.paymentMethod);
      }
    }
  }

  return result;
});
```

---

## 🚫 Rate Limiting & DDoS Protection

### Rate Limiter Middleware

```javascript
const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const redis = require("./lib/redis");

// General API rate limit
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: "rl:api:",
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 min per IP
});

// Login attempt limit (strict)
const loginLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: "rl:login:",
  }),
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 min
  message: "Too many login attempts, try again later",
});

// Location update limit (per user)
const locationLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: "rl:location:",
  }),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 2, // 2 location updates per minute
  keyGenerator: (req) => req.user.id,
});

app.use("/api/", apiLimiter);
app.post("/api/auth/login", loginLimiter, loginHandler);
app.post("/api/location/update", locationLimiter, updateLocation);
```

---

## 🛡️ SQL Injection & CSRF Protection

### Input Sanitization

```javascript
const { validationResult, body } = require("express-validator");

// Validate user input
const validateEventRegistration = [
  body("eventId").isLength({ min: 1, max: 50 }).trim().escape(),
  body("sessionId").optional().isLength({ min: 1, max: 50 }).trim().escape(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

app.post("/api/events/:id/register", validateEventRegistration, registerEvent);
```

### CSRF Token Protection

```javascript
// Generate CSRF token on page load
const csrf = require("csurf");
const csrfProtection = csrf({ cookie: false });

app.get("/api/csrf-token", csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Validate CSRF token on POST/PUT/DELETE
app.post("/api/events/:id/register", csrfProtection, validateEventRegistration, registerEvent);
```

### Frontend CSRF Usage

```javascript
// Get CSRF token on app init
const csrfToken = await fetch("/api/csrf-token").then((r) => r.json());

// Include in form/request
fetch("/api/events/123/register", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-CSRF-Token": csrfToken.csrfToken,
  },
  body: JSON.stringify({ selectedSession: "morning" }),
});
```

---

## 📊 Security Headers

### Express Security Headers

```javascript
const helmet = require("helmet");

app.use(helmet()); // Apply common security headers:
// - Strict-Transport-Security (HSTS)
// - X-Content-Type-Options: nosniff
// - X-Frame-Options: DENY (clickjacking)
// - X-XSS-Protection
// - Content-Security-Policy
```

---

## 📝 Audit & Logging

### Admin Action Logging

```prisma
model AdminLog {
  id          String   @id @default(cuid())
  adminId     String
  action      String   // CREATE_EVENT, DELETE_USER, etc
  entityType  String   // Event, User, Merch, etc
  entityId    String
  details     Json     // Before/after snapshot
  ipAddress   String
  timestamp   DateTime @default(now())
}
```

### Failed Login Logging

```javascript
// Log on failed login
async function loginHandler(req, res) {
  const { email, password } = req.body;
  const user = await User.findUnique({ where: { email } });

  if (!user || !(await verifyPassword(password, user.password))) {
    await logFailedLoginAttempt(email, req.ip);
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // ... generate token
}

async function logFailedLoginAttempt(email, ipAddress) {
  // Store in SecurityLog or similar
  console.warn(`Failed login: ${email} from ${ipAddress}`);
}
```

---

## 🔐 Environment Variables

```bash
# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=1200 # 20 minutes in seconds
ENCRYPTION_KEY=your-32-byte-encryption-key

# Email
GMAIL_USER=kalceria@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# Database
DATABASE_URL=postgresql://user:pass@host:5432/kalceria
REDIS_URL=redis://localhost:6379

# API Keys
GOOGLE_MAPS_API_KEY=your-key
XENDIT_API_KEY=your-key

# Allowed Origins (CORS)
ALLOWED_ORIGINS=https://kalceria.co.id,https://app.kalceria.co.id

# Security
NODE_ENV=production
```

---

## ✅ Security Checklist

- [x] Use Argon2 for password hashing
- [x] Implement RSA-based session tokens (20 min expiry)
- [x] Rate limit login attempts (5 per 15 min)
- [x] Rate limit API calls (100 per 15 min)
- [x] Encrypt sensitive transaction data (AES-256-GCM)
- [x] Use HTTPS only (enforce with HSTS)
- [x] Implement CSRF token protection
- [x] Sanitize user input (escaping, validation)
- [x] Use HTTP-only secure cookies
- [x] Implement audit logging (admin actions)
- [x] Setup DKIM/SPF/DMARC for email
- [x] Validate email on registration (PIN-based)
- [x] Implement password reset (1-hour token expiry)
- [x] Use Content-Security-Policy headers
- [x] Implement proper CORS configuration

---

## 🚀 Future Security Enhancements

- [ ] Two-factor authentication (2FA)
- [ ] Biometric login (fingerprint, face recognition)
- [ ] IP whitelisting for admin accounts
- [ ] Penetration testing & vulnerability scans
- [ ] Bug bounty program
- [ ] Security audit (third-party)
- [ ] Web Application Firewall (WAF) integration
- [ ] DDoS mitigation service (Cloudflare)
