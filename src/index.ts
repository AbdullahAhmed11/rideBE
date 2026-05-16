import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";

async function main(): Promise<void> {
  await connectDb();
  console.log("MongoDB connected");

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Ride API listening on port ${env.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
