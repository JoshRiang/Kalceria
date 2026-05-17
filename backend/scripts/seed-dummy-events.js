import prisma from '../lib/prisma.js';


async function main() {
  const events = [
    {
      id: crypto.randomUUID(),
      title: "Neon Horizon 2026",
      description: "Experience the pulse of the future at the ultimate nighttime drive.",
      displayPhotoUrl: "/event_1.jpeg",
      location: "Jakarta Neon Track",
      regStartTime: new Date(Date.now() - 86400000),
      regEndTime: new Date(Date.now() + 86400000 * 5),
      price: 150000,
      quota: 100,
      status: "OPEN",
      sessionOptions: ["Night Drive 20:00"]
    },
    {
      id: crypto.randomUUID(),
      title: "Sunset Run Series",
      description: "A scenic sunset tour alongside the coastline with fellow car enthusiasts.",
      displayPhotoUrl: "/event_2.jpeg",
      location: "Pantai Indah Kapuk",
      regStartTime: new Date(Date.now() - 86400000),
      regEndTime: new Date(Date.now() + 86400000 * 5),
      price: 75000,
      quota: 50,
      status: "OPEN",
      sessionOptions: ["Afternoon Session 16:00"]
    },
    {
      id: crypto.randomUUID(),
      title: "Midnight Mechanics",
      description: "Underground meet-up to showcase builds and share engineering knowledge.",
      displayPhotoUrl: "/event_3.jpeg",
      location: "Secret Garage X",
      regStartTime: new Date(Date.now() - 86400000),
      regEndTime: new Date(Date.now() + 86400000 * 5),
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
