# Implementation Guide: Quick Start

Panduan cepat untuk setup dan development Kalceria.

---

## 📦 Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- **PostgreSQL** >= 14
- **Redis** >= 6
- **Git**

---

## 🚀 Project Setup

### 1. Clone Repository

```bash
git clone https://github.com/JoshRiang/Kalceria.git
cd Kalceria
```

### 2. Install Dependencies

```bash
npm install  # Installs all workspaces
```

### 3. Environment Setup

#### Backend Environment (`.env` in backend/)

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/kalceria"

# Redis
REDIS_URL="redis://localhost:6379"

# Email
GMAIL_USER="kalceria@gmail.com"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"

# Security
JWT_SECRET="your-secret-key-min-32-chars"
ENCRYPTION_KEY="your-32-byte-encryption-key"

# External APIs
GOOGLE_MAPS_API_KEY="your-key"
XENDIT_API_KEY="your-key"  # Payment gateway

# Config
NODE_ENV="development"
PORT=4000                  # Backend port (default from api/index.js)
API_URL="http://localhost:4000"

# CORS
FRONTEND_URL="http://localhost:3000"  # Allow frontend origin
```

#### Frontend Environment (`.env.local` in frontend/)

```bash
# API (matches backend port)
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-key"

# Config
NEXT_PUBLIC_APP_ENV="development"
NEXT_PUBLIC_APP_NAME="Kalceria"
```

### 4. Database Setup

```bash
# Generate Prisma client
npm run db:generate --workspace=backend

# Create tables
npm run db:migrate --workspace=backend

# (Optional) Seed test data
npm run db:seed --workspace=backend
```

### 5. Redis Setup

```bash
# Start Redis (if running locally)
redis-server

# Or use Docker
docker run -d -p 6379:6379 redis:latest
```

---

## 🏃 Running Development Servers

### Monorepo Setup (Using Turbo)

This project uses **npm workspaces** + **Turbo** for orchestrated development.

**Workflow:**

1. Turbo manages both `backend` and `frontend` packages
2. Auto-generates Prisma before dev starts (`predev` hook)
3. Runs both servers in parallel (`--parallel`)

### Option A: Run Both Servers Simultaneously (Recommended)

```bash
npm run dev
```

**Output:**

- **Backend**: http://localhost:4000/api
- **Frontend**: http://localhost:3000

Turbo automatically:

1. Runs `predev` hook (generates Prisma client)
2. Starts backend (`npm run dev` in backend/)
3. Starts frontend (`npm run dev` in frontend/)
4. Both run in parallel with Turbo orchestration

### Option B: Run Individually (Debug Mode)

```bash
# Terminal 1: Backend only
npm run dev:backend

# Terminal 2: Frontend only (separate terminal)
npm run dev:frontend
```

### Option C: Manual Parallel (Alternative)

If Turbo has issues:

```bash
# PowerShell (Windows):
npm run dev:backend; npm run dev:frontend

# Or use two terminals:
npm run dev:backend &
npm run dev:frontend
```

---

## 📦 Monorepo Architecture

### Workspace Structure

```
Kalceria/ (root)
├── package.json              # Root workspace config
├── turbo.json               # Turbo pipeline definition
├── .npmrc                   # npm workspace config
│
├── backend/                 # Express + Prisma
│   ├── api/index.js         # Server entry (port 4000)
│   ├── package.json
│   ├── prisma/schema.prisma
│   └── ...
│
└── frontend/                # Next.js React
    ├── app/                 # Next.js app directory
    ├── package.json
    ├── next.config.ts
    └── ...
```

### Key Files

| File                    | Purpose                                               |
| ----------------------- | ----------------------------------------------------- |
| `package.json`          | Root scripts + workspace definitions + packageManager |
| `turbo.json`            | Pipeline config (build order, caching)                |
| `.npmrc`                | npm workspace settings                                |
| `backend/package.json`  | Backend dependencies + scripts                        |
| `frontend/package.json` | Frontend dependencies + scripts                       |

### How Turbo Works

```json
// turbo.json - Pipeline definition
{
  "pipeline": {
    "dev": {
      "cache": false, // Never cache dev tasks
      "persistent": true, // Keep running (servers) - parallel execution
      "outputs": [] // No output caching
    },
    "build": {
      "dependsOn": ["^build"], // Depends on workspace builds
      "outputs": [".next/**"] // Cache build outputs
    }
  }
}
```

**When running `npm run dev`:**

1. Turbo detects workspace manager from `packageManager` field
2. Reads pipeline config
3. Identifies `dev` task in all workspaces
4. Runs `backend dev` + `frontend dev` in parallel (via `persistent: true`)
5. Keeps both processes alive until Ctrl+C

### PostInstall Hook

```json
// package.json
{
  "name": "kalceria",
  "packageManager": "npm@9.0.0",
  "workspaces": ["backend", "frontend"],
  "scripts": {
    "postinstall": "npm run db:generate",
    "predev": "npm run db:generate",
    "dev": "turbo run dev"
  }
}
```

- `packageManager`: Tells Turbo which package manager is used
- `postinstall`: Auto-generates Prisma after `npm install`
- `predev`: Auto-generates Prisma before `npm run dev`
- `dev`: Runs Turbo pipeline (no `--parallel` needed, uses `persistent: true` from turbo.json)

---

## 🚀 Verified Ports

| Service                | Port | URL                   | Command                |
| ---------------------- | ---- | --------------------- | ---------------------- |
| **Backend (Express)**  | 4000 | http://localhost:4000 | `npm run dev:backend`  |
| **Frontend (Next.js)** | 3000 | http://localhost:3000 | `npm run dev:frontend` |
| **Prisma Studio**      | 5555 | http://localhost:5555 | `npm run db:studio`    |

---

## ⚡ Quick Troubleshooting

### Frontend not starting with `npm run dev`

**Solution:** Turbo parallelization might suppress output. Check manually:

```bash
npm run dev:frontend
```

If it fails, see the actual error.

### Backend on port 4000 but using 3001 in code

**Solution:** Update API URLs:

- Backend: `http://localhost:4000/api`
- Frontend `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:4000/api`

### Prisma client not initialized

**Solution:** Run predev hook manually:

```bash
npm run db:generate
npm run dev
```

### Turbo cache issues

**Solution:** Clear cache:

```bash
npx turbo prune --scope=backend --docker
rm -rf .turbo node_modules/.cache
npm run dev
```

---

## 🛠️ Development Workflow

### Backend Development

**File Structure**:

```
backend/
├── api/
│   └── index.js              # Server entry point
├── controllers/              # Business logic
│   ├── authController.js
│   ├── eventController.js
│   └── ...
├── routes/
│   └── index.js             # Route definitions
├── middleware/
│   ├── auth.js
│   └── admin.js
├── lib/
│   ├── mailer.js
│   ├── redis.js
│   └── token.js
├── utils/
│   ├── privacyMask.js
│   └── token.js
├── prisma/
│   └── schema.prisma        # Database schema
└── package.json
```

**Running Tests**:

```bash
npm test --workspace=backend
```

**Linting**:

```bash
npm run lint --workspace=backend
```

### Frontend Development

**File Structure**:

```
frontend/
├── app/
│   ├── layout.tsx           # Root layout
│   ├── page.jsx             # Homepage
│   ├── events/
│   ├── about/
│   └── ...
├── components/              # React components
│   ├── LandingPage.jsx
│   ├── AdminPanel.jsx
│   └── ...
├── lib/
│   └── api.js              # API client
├── hooks/
│   └── usePhoenixAurora.js
├── public/                  # Static assets
├── package.json
└── next.config.ts
```

**Running Tests**:

```bash
npm test --workspace=frontend
```

**Linting**:

```bash
npm run lint --workspace=frontend
```

---

## 📝 Creating New Features

### Adding a New API Endpoint

**1. Update Database Schema** (if needed)

```prisma
// prisma/schema.prisma
model YourModel {
  id    String @id @default(cuid())
  name  String
  // ...
}
```

**2. Generate Prisma Client**

```bash
npm run db:generate --workspace=backend
```

**3. Create Controller**

```javascript
// backend/controllers/yourController.js
async function getYourData(req, res) {
  const data = await prisma.yourModel.findMany();
  res.json({ success: true, data });
}

module.exports = { getYourData };
```

**4. Add Route**

```javascript
// backend/routes/index.js
const { getYourData } = require("../controllers/yourController");

router.get("/your-data", authMiddleware, getYourData);
```

### Adding a New Frontend Component

**1. Create Component**

```typescript
// frontend/components/YourComponent.tsx
import { motion } from 'framer-motion';

export default function YourComponent() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      Your content
    </motion.div>
  );
}
```

**2. Use in Page**

```typescript
// frontend/app/your-page/page.jsx
import YourComponent from '@/components/YourComponent';

export default function YourPage() {
  return (
    <main>
      <YourComponent />
    </main>
  );
}
```

---

## 🔐 Authentication in Development

### Get Auth Token

```bash
# Via API
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'

# Token in response - use in Authorization header
```

### Test Protected Endpoints

```bash
curl http://localhost:3001/api/users/me \
  -H "Authorization: Bearer {token}"
```

---

## 📊 Database Management

### View Database (Prisma Studio)

```bash
npm run db:studio --workspace=backend
```

Opens browser UI at `http://localhost:5555`

### Create Migration

```bash
# After updating schema.prisma
npx prisma migrate dev --name your_migration_name
```

### Reset Database (⚠️ Deletes all data)

```bash
npx prisma migrate reset
```

---

## 📝 Logging & Debugging

### Enable Debug Logs

```bash
# Backend
DEBUG=kalceria:* npm run dev:backend

# Frontend
DEBUG=next:* npm run dev:frontend
```

### View Server Logs

**Backend** logs appear in Terminal where `npm run dev:backend` runs

**Frontend** logs appear in Terminal where `npm run dev:frontend` runs

---

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Tests for Specific Workspace

```bash
npm test --workspace=backend
npm test --workspace=frontend
```

### Coverage Report

```bash
npm test -- --coverage --workspace=backend
```

---

## 🚀 Build for Production

### Build Both Workspaces

```bash
npm run build
```

### Build Individual Workspace

```bash
npm run build:backend
npm run build:frontend
```

### Run Production Build

```bash
# Backend
npm run start --workspace=backend

# Frontend
npm run start:frontend
```

---

## 🐛 Common Issues & Solutions

### Issue: `EADDRINUSE` (Port already in use)

```bash
# Find process using port
# Windows:
netstat -ano | findstr :3001

# Kill process
taskkill /PID {PID} /F
```

### Issue: PostgreSQL connection error

```bash
# Check if PostgreSQL is running
# Windows: Services → PostgreSQL
# macOS: brew services list
# Linux: systemctl status postgresql
```

### Issue: Redis connection error

```bash
# Check if Redis is running
redis-cli ping  # Should return PONG
```

### Issue: `Module not found` errors

```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Issue: Prisma migration conflicts

```bash
# Reset migrations (careful!)
npx prisma migrate reset

# Or resolve manually in prisma/migrations/
```

---

## 📚 Documentation Files

- `00-OVERVIEW.md` - Project overview & architecture
- `01-DATABASE-SCHEMA.md` - Full database schema
- `02-FEATURES-EVENTS.md` - Event system documentation
- `03-FEATURES-MAP.md` - User map & telemetry
- `04-FEATURES-SERVICES-ADMIN.md` - Services & admin dashboard
- `05-FEATURES-NOTIFICATIONS.md` - Email notifications
- `06-FRONTEND-UI.md` - Frontend components & design
- `07-SECURITY.md` - Security & authentication
- `08-API-REFERENCE.md` - API endpoints reference
- `09-IMPLEMENTATION-GUIDE.md` - This file

---

## 🤝 Contributing

### Pull Request Process

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes & commit: `git commit -m "Add: your feature"`
3. Push: `git push origin feature/your-feature`
4. Create Pull Request on GitHub
5. Code review & merge

### Code Standards

- **Backend**: Follow existing Express patterns
- **Frontend**: Use React hooks & TypeScript where possible
- **Database**: Write migrations for schema changes
- **Testing**: Aim for >80% coverage

---

## 📞 Support & Resources

- **Issues**: GitHub Issues
- **Docs**: See documentation files
- **Email**: support@kalceria.co.id
- **Discord**: [Join our community]

---

## 🗺️ Development Roadmap

### Phase 1: MVP (Current)

- ✅ User registration & authentication
- ✅ Event system
- ✅ Basic map display
- ✅ Admin dashboard

### Phase 2: Enhanced Features

- [ ] Live location tracking (WebSocket)
- [ ] Real-time notifications
- [ ] Advanced analytics

### Phase 3: Scaling

- [ ] Mobile app (React Native)
- [ ] Offline support
- [ ] Advanced AI recommendations

---

## 🎓 Learning Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Framer Motion Guide](https://www.framer.com/motion/)
- [PostgreSQL Tutorial](https://www.postgresql.org/docs/)

---

## ✅ Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Build succeeds
- [ ] No console errors/warnings
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Error logging setup
- [ ] Backups configured

---

Good luck! 🚗 Happy coding! 🚀
