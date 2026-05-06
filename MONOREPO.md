# Kalceria Monorepo Setup

This project uses **npm workspaces** to manage the `backend` and `frontend` packages from a single root.

---

## 📦 Workspace Structure

```
kalceria/
├── backend/              # Express API + Prisma
│   ├── api/
│   ├── controllers/
│   ├── middleware/
│   ├── prisma/
│   ├── routes/
│   └── package.json
├── frontend/             # Next.js React app
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── package.json
├── package.json          # Root workspace config
├── turbo.json           # Build orchestration
└── .npmrc               # npm configuration
```

---

## 🚀 Getting Started

### Installation

```bash
# Install all dependencies across all workspaces
npm install
```

### Development

**Run all workspaces in dev mode:**

```bash
npm run dev
```

**Run individual workspace:**

```bash
npm run dev:backend    # Backend only (Express)
npm run dev:frontend   # Frontend only (Next.js)
```

**Run specific scripts:**

```bash
npm run build              # Build all workspaces
npm run lint               # Lint all workspaces
npm run db:generate        # Generate Prisma client
npm run db:migrate         # Run Prisma migrations
npm run db:studio          # Open Prisma Studio
```

---

## 🏗️ Build & Deploy

```bash
# Build production bundles
npm run build:backend
npm run build:frontend

# Start backend in production
npm run start

# Start frontend in production
npm run start:frontend
```

---

## 📝 Package Scripts Reference

### Available Commands by Workspace

| Command | Backend | Frontend | All |
| ------- | ------- | -------- | --- |
| `dev`   | ✅      | ✅       | ✅  |
| `build` | ❌      | ✅       | ✅  |
| `start` | ✅      | ✅       | ✅  |
| `lint`  | ❌      | ✅       | ✅  |

**Backend Scripts:**

- `dev` - Watch mode development server
- `start` - Production server
- `db:generate` - Generate Prisma client
- `db:migrate` - Deploy database migrations
- `db:studio` - Open Prisma Studio GUI

**Frontend Scripts:**

- `dev` - Next.js dev server
- `build` - Production build
- `start` - Production server
- `lint` - ESLint checks

---

## 🔗 Workspace Dependencies

Workspaces can reference each other:

```json
{
  "dependencies": {
    "backend": "workspace:*"
  }
}
```

Currently, the packages are **independent** and share no direct dependencies.

---

## 🎯 Best Practices

1. **Run `npm install` from root** — Installs all dependencies across workspaces
2. **Use workspace-specific scripts** — `npm run dev:backend` vs `npm run dev`
3. **Version consistently** — Update root package.json when major versions change
4. **Keep .npmrc settings** — Prevents peer dependency warnings

---

## 🚢 Deployment

### Vercel

Both packages have `vercel.json` configurations:

- **Backend:** API deployment (serverless functions)
- **Frontend:** Static hosting + Next.js

Deploy from the root directory — Vercel automatically detects workspaces.

---

## 📚 Learn More

- [npm Workspaces Documentation](https://docs.npmjs.com/cli/v10/using-npm/workspaces)
- [Turbo Documentation](https://turbo.build/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Deployments](https://vercel.com/docs)
