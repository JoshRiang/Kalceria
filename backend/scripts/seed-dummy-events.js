import prisma from '../lib/prisma.js';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

async function main() {
  const events = [
    {
      id: "evt-neon-horizon-2026",
      title: "Neon Horizon 2026",
      description: "Experience the pulse of the future at the ultimate nighttime drive.",
      displayPhotoUrl: "/event_1.webp",
      location: "Jakarta Neon Track",
      regStartTime: new Date(Date.now() - 86400000),
      regEndTime: new Date(Date.now() + 86400000 * 90),
      price: 150000,
      quota: 100,
      status: "OPEN",
      sessionOptions: ["Night Drive 20:00"]
    },
    {
      id: "evt-sunset-run-series",
      title: "Sunset Run Series",
      description: "A scenic sunset tour alongside the coastline with fellow car enthusiasts.",
      displayPhotoUrl: "/event_2.webp",
      location: "Pantai Indah Kapuk",
      regStartTime: new Date(Date.now() - 86400000),
      regEndTime: new Date(Date.now() + 86400000 * 90),
      price: 75000,
      quota: 50,
      status: "OPEN",
      sessionOptions: ["Afternoon Session 16:00"]
    },
    {
      id: "evt-midnight-mechanics",
      title: "Midnight Mechanics",
      description: "Underground meet-up to showcase builds and share engineering knowledge.",
      displayPhotoUrl: "/event_3.webp",
      location: "Secret Garage X",
      regStartTime: new Date(Date.now() - 86400000),
      regEndTime: new Date(Date.now() + 86400000 * 90),
      price: 50000,
      quota: 200,
      status: "OPEN",
      sessionOptions: ["Midnight Session 23:00"]
    }
  ];

  for (const event of events) {
    const created = await prisma.event.upsert({
      where: { id: event.id },
      update: event,
      create: event
    });
    console.log("Created/Updated dummy event:", created.title);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
