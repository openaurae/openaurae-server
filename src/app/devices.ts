import { zValidator } from "@hono/zod-validator";
import { auth0, checkDeviceOwnership } from "app/middleware";
import type { ApiEnv, DeviceApiEnv } from "app/types";
import { db } from "database";
import type { MeasureMetadata, Sensor } from "database/types";
import { type Context, Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { flatten, uniq } from "ramda";
import { z } from "zod";

export const deviceApi = new Hono<DeviceApiEnv>();

deviceApi.use(auth0);

deviceApi.get("/", async (c: Context<ApiEnv>) => {
	const { canReadAll, userId } = c.get("user");
	const devices = canReadAll
		? await db.devices.all()
		: await db.devices.getByUserId(userId);
	return c.json(devices);
});

deviceApi.use("/:deviceId/*", checkDeviceOwnership());

interface SensorWithMetadata extends Sensor {
	measureMetadata: MeasureMetadata[];
}

deviceApi.get("/:deviceId", async (c) => {
	const device = c.get("device");
	const sensors: SensorWithMetadata[] = [];

	for (const sensor of await db.sensors.getByDeviceId(device.id)) {
		const measureMetadata = await db.measureMetas.getBySensorType(sensor.type);
		sensors.push({
			...sensor,
			measureMetadata,
		});
	}

	const sensorTypes = await db.sensorTypes.getByIds(
		uniq(sensors.map((sensor) => sensor.type)),
	);
	const measures = uniq(
		flatten(sensorTypes.map((sensorType) => sensorType.measures)),
	);
	const measureMetas = await db.measureMetas.getByIds(measures);

	return c.json({
		...device,
		sensors,
		measuresMetadata: measureMetas,
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

	if (await db.devices.exists(id)) {
		throw new HTTPException(400, { message: "Device id already exists" });
	}

	await db.devices.upsert({
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

		await db.devices.upsert({
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
	await db.devices.deleteById(device.id);

	return c.text("device removed, sensor and reading records are still in DB");
});
