import { db } from "database";
import { MetricNameSchema } from "database/types";
import type { Device, MetricName, Sensor, SensorType } from "database/types";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { Auth0User } from "../auth0";
import type {
	DeviceEnv,
	DeviceSensorEnv,
	DeviceSensorMetricEnv,
} from "./types";

export const deviceFromPath = createMiddleware<DeviceEnv>(async (c, next) => {
	const deviceId = c.req.param("deviceId");
	const device = await parseDevice(deviceId, c.var.user);

	c.set("device", device);

	await next();
});

export const deviceFromPrams = createMiddleware<DeviceEnv>(async (c, next) => {
	const deviceId = c.req.query("deviceId");
	const device = await parseDevice(deviceId, c.var.user);

	c.set("device", device);

	await next();
});

export const deviceSensorFromPath = createMiddleware<DeviceSensorEnv>(
	async (c, next) => {
		const deviceId = c.req.param("deviceId");
		const sensorId = c.req.param("sensorId");

		const device = await parseDevice(deviceId, c.var.user);
		const sensor = await parseSensor(deviceId, sensorId);

		c.set("device", device);
		c.set("sensor", sensor);

		await next();
	},
);

export const deviceSensorMetricFromPath =
	createMiddleware<DeviceSensorMetricEnv>(async (c, next) => {
		const deviceId = c.req.param("deviceId");
		const sensorId = c.req.param("sensorId");
		const metricName = c.req.param("metricName");

		const device = await parseDevice(deviceId, c.var.user);
		const sensor = await parseSensor(deviceId, sensorId);
		const type = await parseMetricName(sensor.type, metricName);

		c.set("device", device);
		c.set("sensor", sensor);
		c.set("metricName", type);

		await next();
	});

async function parseDevice(
	deviceId: string | undefined,
	{ userId, isAdmin }: Auth0User,
): Promise<Device> {
	if (deviceId === undefined) {
		throw new HTTPException(400, { message: "deviceId required" });
	}

	const device = await db.devices.getById(deviceId);

	if (!device) {
		throw new HTTPException(404, { message: "Device not found." });
	}

	const user = await db.users.getById(userId);

	if (!isAdmin && !user.devices.includes(deviceId)) {
		throw new HTTPException(401, {
			message: "Only admin or device owner can access this device.",
		});
	}

	return device;
}

async function parseSensor(
	deviceId: string | undefined,
	sensorId: string | undefined,
): Promise<Sensor> {
	if (deviceId === undefined || sensorId === undefined) {
		throw new HTTPException(400, { message: "sensorId required" });
	}

	const sensor = await db.sensors.getById(deviceId, sensorId);

	if (!sensor) {
		throw new HTTPException(404, { message: "Sensor not found." });
	}

	return sensor;
}

async function parseMetricName(
	sensorType: SensorType,
	name: string,
): Promise<MetricName> {
	const type = MetricNameSchema.parse(name);

	const metadata = await db.sensorMetas.getByType(sensorType);

	if (!metadata?.metric_names.includes(type)) {
		throw new HTTPException(400, { message: "Invalid measurement type." });
	}

	return type;
}
