import { type Context, Hono } from "hono";
import { flatten, uniq } from "ramda";
import { db } from "../database";
import { metricMetadata, metricNamesBySensorType } from "./common";
import { auth0, checkDeviceOwnership } from "./middleware";
import type { ApiEnv, DeviceApiEnv, MetricName } from "./types";

export const deviceApi = new Hono<DeviceApiEnv>();

deviceApi.use(auth0);

deviceApi.get("/", async (c: Context<ApiEnv>) => {
	const { canReadAll, userId } = c.get("user");
	const devices = canReadAll
		? await db.allDevices()
		: await db.userDevices(userId);
	return c.json(devices);
});

deviceApi.use("/:deviceId/*", checkDeviceOwnership);

deviceApi.get("/:deviceId", async (c) => {
	const device = c.get("device");
	let sensors = await db.deviceSensors(device.id);

	sensors = sensors.map((sensor) => ({
		...sensor,
		metrics: metricNamesBySensorType[sensor.type].map(
			(metricName) => metricMetadata[metricName],
		),
	}));

	const sensorTypes = uniq(sensors.map((sensor) => sensor.type));
	const metricNames: MetricName[] = flatten(
		sensorTypes.map((sensorType) => metricNamesBySensorType[sensorType]),
	);
	const metadataList = uniq(metricNames).map((name) => metricMetadata[name]);

	return c.json({
		...device,
		sensors,
		availableMetrics: metadataList,
	});
});
