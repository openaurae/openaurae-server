import { db } from "database";
import type { Reading } from "database/types";
import { mqttBroker } from "env";
import { parse } from "mathjs";
import { messageToReading } from "mq/parser";
import { connectAsync } from "mqtt";

export const mqttClient = await connectAsync(mqttBroker, {
	protocol: "mqtts",
	username: Bun.env.MQTT_USERNAME,
	password: Bun.env.MQTT_PASSWORD,
});

mqttClient.on("message", async (topic, messageBuffer) => {
	const message = JSON.parse(messageBuffer.toString());

	console.log(`${topic} - ${JSON.stringify(message)}`);

	const reading: Reading = messageToReading(topic, message);

	await db.readings.upsert(reading);

	const corrections = (
		await db.corrections.getByDeviceId(reading.device)
	).filter((correction) => correction.reading_type === reading.reading_type);

	for (const correction of corrections) {
		const metricName = correction.metric;
		reading[metricName] = parse(correction.expression).evaluate(reading);
	}

	reading.processed = true;
	await db.readings.upsert(reading);
});
