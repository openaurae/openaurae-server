import { db } from "database";
import { migrateReadingsFromYesterday } from "migration";

await db.connect();

await migrateReadingsFromYesterday();

await db.shutdown();
