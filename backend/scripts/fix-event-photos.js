import prisma from '../lib/prisma.js';

// Fix all event displayPhotoUrl values: .jpeg → .webp
async function main() {
  const events = await prisma.event.findMany({
    where: {
      displayPhotoUrl: { endsWith: '.jpeg' }
    },
    select: { id: true, title: true, displayPhotoUrl: true }
  });

  console.log(`[Fix] Found ${events.length} events with .jpeg photo URLs`);

  for (const event of events) {
    const fixed = event.displayPhotoUrl.replace(/\.jpeg$/, '.webp');
    await prisma.event.update({
      where: { id: event.id },
      data: { displayPhotoUrl: fixed }
    });
    console.log(`  ✓ ${event.title}: ${event.displayPhotoUrl} → ${fixed}`);
  }

  console.log('[Fix] Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
