import { parse } from "mathjs";
import mqtt from "mqtt";
import { db } from "../database";
import type { Reading, Sensor } from "../database/types";
import { mqttBroker } from "../env";
import { messageToReading } from "./parser";

export class MqClient {
	private readonly client: mqtt.MqttClient;

	constructor(client: mqtt.MqttClient) {
		this.client = client;
		this.client.on("message", this.handleMessage);
	}

	public static async build(
		brokerUrl: string,
		username: string,
		password: string,
	): Promise<MqClient> {
		const client = await mqtt.connectAsync(brokerUrl, {
			protocol: "mqtts",
			username,
			password,
		});

		return new MqClient(client);
	}

	public static async buildFromEnv() {
		const username = Bun.env.MQTT_USERNAME;
		const password = Bun.env.MQTT_PASSWORD;

		if (!username || !password) {
			throw Error("username and password is required");
		}

		return await MqClient.build(mqttBroker, username, password);
	}

	public subscribeToZigbeeTopic() {
		this.client.subscribe("zigbee/#");
	}

	public subscribeToAQTopic() {
		this.client.subscribe("air-quality/#");
	}

	public async deleteSensor(sensor: Sensor) {
		if (!sensor.type.startsWith("zigbee")) {
			throw Error(`Cannot delete non-zigbee sensor: ${sensor.type}`);
		}

		const topic = `zigbee/${sensor.device}/bridge/config/remove`;
		this.client.publish(topic, JSON.stringify(topic));
	}

	private async handleMessage(topic: string, messageBuffer: Buffer) {
		if (topic.match(/zigbee\/.*?\/bridge\/(config|state|log)/)) {
			// skip config, log and state messages
			return;
		}

		const message = JSON.parse(messageBuffer.toString());

		console.log(`[MQTT] [${topic}] ${JSON.stringify(message)}`);

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
	}
}
