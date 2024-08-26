import { app } from "app";
import { db } from "database";
import { port } from "env";
// import { mqttClient } from "mq";

await db.connect();

// mqttClient.subscribe("zigbee/#");
// mqttClient.subscribe("air-quality/#");

// every 4 hour

export default {
	port: port,
	fetch: app.fetch,
};
