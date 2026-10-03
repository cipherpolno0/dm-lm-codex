import { disconnectSeedClient, seedSynthetic, stableSeedCounts } from '../../prisma/seed';

async function main() {
  const before = await stableSeedCounts();
  await seedSynthetic();
  const afterFirst = await stableSeedCounts();
  await seedSynthetic();
  const afterSecond = await stableSeedCounts();
  if (JSON.stringify(afterFirst) !== JSON.stringify(afterSecond)) {
    throw new Error(`Synthetic seed rerun changed counts: ${JSON.stringify({ before, afterFirst, afterSecond })}`);
  }
  console.log(JSON.stringify({ stable: true, before, afterFirst, afterSecond }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => disconnectSeedClient());
