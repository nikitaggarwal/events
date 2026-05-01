import "dotenv/config";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { runSeedDemo } = await import("../src/lib/seed-demo");
  try {
    const { results } = await runSeedDemo(prisma);
    console.log(JSON.stringify({ ok: true, results }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
