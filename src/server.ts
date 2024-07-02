import { connectAsync } from "async-mqtt";
import { parse } from "mathjs";
import { app } from "./app";
import { db } from "./database";
import { mqttBroker, port } from "./env";
import { messageToReading } from "./mq/parser";

await db.connect();

const client = await connectAsync(mqttBroker, {
	protocol: "mqtt",
	clientId: "openaurae-server",
});

await client.subscribe("zigbee/#");
await client.subscribe("air-quality/#");

client.on("message", async (topic, messageBuffer) => {
	const message = JSON.parse(messageBuffer.toString());

	console.log(`${topic} - ${JSON.stringify(message)}`);

	const reading = messageToReading(topic, message);

	await db.insertReading(reading);

	const corrections = await db.sensorCorrections(
		reading.device,
		reading.reading_type,
	);

	for (const correction of corrections) {
		const metricName = correction.metric;
		reading[metricName] = parse(correction.expression).evaluate(reading);
	}

	reading.processed = true;
	await db.insertReading(reading);
});

export default {
	port: port,
	fetch: app.fetch,
};
