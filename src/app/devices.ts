import { zValidator } from "@hono/zod-validator";
import { type Context, Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { flatten, uniq } from "ramda";
import { z } from "zod";
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

deviceApi.use("/:deviceId/*", checkDeviceOwnership());

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

const deviceSchema = z.object({
	id: z.string().regex(/^[\w:]{1,50}$/),
	name: z.string().min(1).max(50),
	latitude: z.coerce.number().lte(90).gte(-90).optional(),
	longitude: z.coerce.number().lte(180).gte(-180).optional(),
});

deviceApi.post("/", zValidator("json", deviceSchema), async (c) => {
	const { id, name, latitude, longitude } = c.req.valid("json");

	const device = await db.getDeviceById(id);

	if (device) {
		throw new HTTPException(400, { message: "Device id already exists" });
	}

	await db.upsertDevice({
		id,
		name,
		longitude,
		latitude,
	});

	return c.text("device created", 201);
});

deviceApi.put(
	"/:deviceId",
	zValidator("json", deviceSchema.omit({ id: true })),
	async (c) => {
		const { name, latitude, longitude } = c.req.valid("json");

		const device = c.get("device");

		await db.upsertDevice({
			...device,
			name,
			longitude,
			latitude,
		});

		return c.text("device updated");
	},
);

deviceApi.delete("/:deviceId", async (c) => {
	const device = c.get("device");
	await db.removeDeviceById(device.id);

	return c.text("device removed, sensor and reading records are still in DB");
});
