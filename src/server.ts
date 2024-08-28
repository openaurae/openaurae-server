import { app } from "app";
import { db } from "database";
import { port } from "env";
import { mqttClientFromEnv } from "mq";

await db.connect();

const mqttClient = await mqttClientFromEnv();
mqttClient.subscribe("zigbee/#");
mqttClient.subscribe("air-quality/#");

export default {
	port: port,
	fetch: app.fetch,
};
