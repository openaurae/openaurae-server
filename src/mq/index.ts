import { connectAsync } from "async-mqtt";
import { parse } from "mathjs";
import { db } from "../database";
import { mqttBroker } from "../env.ts";
import { messageToReading } from "./parser.ts";

const client = await connectAsync(mqttBroker, {
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
