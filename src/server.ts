import { app } from "app";
import { CronJob } from "cron";
import { db } from "database";
import { port } from "env";
import { migrateReadingsFromYesterday } from "migration";
// import { mqttClient } from "mq";

await db.connect();

// mqttClient.subscribe("zigbee/#");
// mqttClient.subscribe("air-quality/#");

// every 4 hour
new CronJob("0 */4 * * *", migrateReadingsFromYesterday, null, true);

export default {
	port: port,
	fetch: app.fetch,
};
