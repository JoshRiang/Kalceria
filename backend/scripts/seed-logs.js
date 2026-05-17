import prisma from '../lib/prisma.js';



async function main() {
  console.log('[System] Seeding initial Audit Logs...');
  
  const dummyLogs = [
    { adminEmail: 'admin1@gmail.com', action: 'System Initialization', details: 'Phase 1 and 2 completed.' },
    { adminEmail: 'admin2@gmail.com', action: 'Security Hardening', details: 'OCC and JIT implemented.' },
    { adminEmail: 'admin3@gmail.com', action: 'UI Rework', details: 'Floating chatbox and Control Center added.' },
    { adminEmail: 'admin4@gmail.com', action: 'Database Migration', details: 'AuditLog table created.' },
  ];

  for (const log of dummyLogs) {
    await prisma.auditLog.create({ data: log });
  }

  console.log('[System] Seed complete. 4 initial logs created.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
