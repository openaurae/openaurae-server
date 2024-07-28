import { types } from "cassandra-driver";
import LocalDate = types.LocalDate;
import type { Reading } from "database/types";
import { type Message, type Topic, aliasMapping } from "mq/types";
import { fromPairs, has, isNotNil, partition } from "ramda";

export const parseTopic = (topic: string): Topic => {
	const matched = topic.match(/^zigbee\/(.+?)\/(.+?)(\/.*)?$/);

	if (!matched) {
		return {};
	}

	const [_, deviceId, sensorId] = matched;

	return {
		device: deviceId,
		sensor_id: sensorId,
	};
};

const parseAlias = (reading: Message): Message => {
	const {
		tmp,
		temperature,
		humidity,
		rh,
		sensor,
		sensor_id,
		device_id,
		device,
	} = reading;

	return {
		temperature: temperature ?? tmp,
		humidity: humidity ?? rh,
		sensor_id: sensor_id ?? sensor,
		device: device ?? device_id,
	};
};

const sensorTypeOf = (message: Message): string => {
	if (message.sensor_id === "ptqs1005") {
		return "ptqs1005";
	}
	if (message.sensor_id === "pms5003st") {
		return "pms5003st";
	}
	if (isNotNil(message.power)) {
		return "zigbee_power";
	}
	if (isNotNil(message.temperature)) {
		return "zigbee_temp";
	}
	if (isNotNil(message.contact)) {
		return "zigbee_contact";
	}
	if (isNotNil(message.occupancy)) {
		return "zigbee_occupancy";
	}
	if (isNotNil(message.angle_x)) {
		return "zigbee_vibration";
	}
	throw new Error("can not determine sensor type");
};

export const messageToReading = (topic: string, payload: Message): Reading => {
	const entries: [string, unknown][] = Object.entries(payload).map(
		([name, value]) => [name.toLowerCase(), value],
	);

	const [aliasEntries, messageEntries] = partition(
		([name]) => has(name, aliasMapping),
		entries,
	);

	const message: Message = {
		...fromPairs(messageEntries),
		...parseAlias(fromPairs(aliasEntries)),
		...parseTopic(topic),
	};

	const time: Date = message.time ? new Date(message.time) : new Date();

	return {
		...message,
		time,
		date: LocalDate.fromDate(time),
		reading_type: sensorTypeOf(message),
		processed: false,
	} as Reading;
};
