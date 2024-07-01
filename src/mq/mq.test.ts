import { describe, expect, it } from "bun:test";
import { types } from "cassandra-driver";
import { messageToReading, parseTopic } from "./parser";
import LocalDate = types.LocalDate;

describe("test topic parsing", () => {
	it("should parse zigbee topic", () => {
		expect(parseTopic("zigbee/device/sensor")).toEqual({
			device: "device",
			sensor_id: "sensor",
		});
	});

	it("should ignore redundant part of zigbee topic", () => {
		expect(parseTopic("zigbee/device/sensor/foobar")).toEqual({
			device: "device",
			sensor_id: "sensor",
		});
	});

	it("should match nothing", () => {
		expect(parseTopic("foobar")).toEqual({});
	});
});

describe("test message handling", () => {
	it("should parse zigbee contact message", () => {
		const reading = messageToReading("zigbee/device/sensor", {
			battery: 22.3,
			voltage: 10.2,
			contact: true,
			time: "2023-11-19T18:44:19",
		});
		expect(reading).toEqual({
			device: "device",
			reading_type: "zigbee_contact",
			processed: false,
			sensor_id: "sensor",
			date: LocalDate.fromString("2023-11-19"),
			time: new Date("2023-11-19T18:44:19"),
			battery: 22.3,
			voltage: 10.2,
			contact: true,
		});
	});

	it("should parse zigbee temperature message", () => {
		const reading = messageToReading("zigbee/device/sensor", {
			voltage: 10.2,
			tmp: 36.1,
			rh: 10.1,
			time: "2023-11-19T18:44:19",
		});
		expect(reading).toEqual({
			device: "device",
			reading_type: "zigbee_temp",
			processed: false,
			sensor_id: "sensor",
			date: LocalDate.fromString("2023-11-19"),
			time: new Date("2023-11-19T18:44:19"),
			voltage: 10.2,
			humidity: 10.1,
			temperature: 36.1,
		});
	});
});
