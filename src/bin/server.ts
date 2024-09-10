import { app } from "app";
import { db } from "database";
import { port } from "env";
import { MqClient } from "mq";

await db.connect();

const mqClient = await MqClient.buildFromEnv();
mqClient.subscribeToZigbeeTopic();
mqClient.subscribeToAQTopic();

export default {
	port: port,
	fetch: app.fetch,
};
