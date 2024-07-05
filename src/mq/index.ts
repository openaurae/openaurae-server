import { parse } from "mathjs";
import { connectAsync } from "mqtt";
import { db } from "../database";
import { mqttBroker } from "../env";
import { messageToReading } from "./parser";

export const mqttClient = await connectAsync(mqttBroker, {
	protocol: "mqtt",
	clientId: "openaurae-server",
});

mqttClient.on("message", async (topic, messageBuffer) => {
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
