import { Readable } from "node:stream";
import { zValidator } from "@hono/zod-validator";
import { auth0 } from "app/middleware/auth0";
import { stringify } from "csv";
import { db } from "database";
import {
	DeviceSchema,
	type Reading,
	type Sensor,
	SensorSchema,
} from "database/types";
import {
	compareAsc,
	compareDesc,
	eachDayOfInterval,
	endOfDay,
	format,
	startOfDay,
} from "date-fns";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { stream } from "hono/streaming";
import { z } from "zod";
import {
	deviceFromPath,
	deviceSensorFromPath,
	deviceSensorMetricFromPath,
} from "../middleware/extract";

export const devicesApi = new Hono();

// get all devices
devicesApi.get("/", auth0, async (c) => {
	const { canReadAll, userId } = c.var.user;
	const devices = canReadAll
		? await db.devices.all()
		: await db.devices.getByUserId(userId);
	return c.json(devices);
});

// add new device
devicesApi.post(
	"/",
	auth0,
	zValidator(
		"json",
		DeviceSchema.omit({ last_record: true, sensor_types: true }),
	),
	async (c) => {
		const { userId } = c.var.user;
		const device = c.req.valid("json");

		if (await db.devices.exists(device.id)) {
			throw new HTTPException(400, { message: "Device id already exists" });
		}

		await db.devices.upsert(device);
		await db.users.addDevice(userId, device.id);

		return c.text("device created", 201);
	},
);

// get device by id
devicesApi.get("/:deviceId", auth0, deviceFromPath, async (c) => {
	const device = c.var.device;
	const sensors = await db.sensors.getByDeviceId(device.id);

	// TODO: remove duplication
	const withMetricsMetadata = async (sensor: Sensor) => {
		const metricsMetadata = await db.metricMetas.getBySensorType(sensor.type);
		return {
			...sensor,
			metricsMetadata,
		};
	};

	const sensorsWithMetadata = await Promise.all(
		sensors.map(withMetricsMetadata),
	);

	return c.json({
		...device,
		sensors: sensorsWithMetadata,
	});
});

// update device by id
devicesApi.put(
	"/:deviceId",
	auth0,
	deviceFromPath,
	zValidator(
		"json",
		DeviceSchema.pick({
			name: true,
			longitude: true,
			latitude: true,
			room: true,
		}),
	),
	async (c) => {
		const updated = c.req.valid("json");

		await db.devices.upsert({
			...c.var.device,
			...updated,
		});

		return c.text("device updated");
	},
);

// delete device by id
devicesApi.delete("/:deviceId", auth0, deviceFromPath, async (c) => {
	const { id } = c.var.device;
	await db.devices.deleteById(id);

	return c.text("device removed, sensor and reading records are still in DB");
});

// get device sensors
devicesApi.get("/:deviceId/sensors", auth0, deviceFromPath, async (c) => {
	const { id } = c.var.device;
	const sensors = await db.sensors.getByDeviceId(id);

	const withMetricsMetadata = async (sensor: Sensor) => {
		const metricsMetadata = await db.metricMetas.getBySensorType(sensor.type);
		return {
			...sensor,
			metricsMetadata,
		};
	};

	const result = await Promise.all(sensors.map(withMetricsMetadata));

	return c.json(result);
});

// add new sensor to the device
devicesApi.post(
	"/:deviceId/sensors",
	auth0,
	deviceFromPath,
	zValidator(
		"json",
		SensorSchema.pick({ id: true, name: true, type: true, comments: true }),
	),
	async (c) => {
		const device = c.var.device;
		const sensor = c.req.valid("json");

		await db.sensors.upsert({
			...sensor,
			device: device.id,
		});

		// TODO: add pms and ptqs sensors if device is an AQ box.

		return c.text("sensor created", 201);
	},
);

// get sensor by id
devicesApi.get(
	"/:deviceId/sensors/:sensorId",
	auth0,
	deviceSensorFromPath,
	async (c) => {
		const sensor = c.var.sensor;
		const metricsMetadata = await db.metricMetas.getBySensorType(sensor.type);

		return c.json({
			...sensor,
			metricsMetadata,
		});
	},
);

// update sensor by id
devicesApi.put(
	"/:deviceId/sensors/:sensorId",
	auth0,
	deviceSensorFromPath,
	zValidator("json", SensorSchema.pick({ name: true, comments: true })),
	async (c) => {
		const updated = c.req.valid("json");

		await db.sensors.upsert({
			...c.var.sensor,
			...updated,
		});
		return c.text("Sensor updated.", 200);
	},
);

devicesApi.delete(
	"/:deviceId/sensors/:sensorId",
	auth0,
	deviceSensorFromPath,
	async (c) => {
		const sensor = c.var.sensor;

		await db.sensors.deleteById(sensor.device, sensor.id);

		if (sensor.type.startsWith("zigbee")) {
			// TODO: delete sensor by id and remove sensor from the Zigbee network
		}

		return c.text("Sensor removed.", 200);
	},
);

// get sensor measurements of a certain type
devicesApi.get(
	"/:deviceId/sensors/:sensorId/metrics/:metricName",
	auth0,
	deviceSensorMetricFromPath,
	zValidator(
		"query",
		z.object({
			date: z.string().date(),
			startTime: z.coerce.date().optional(),
			endTime: z.coerce.date().optional(),
			processed: z.coerce.boolean().default(true),
			order: z.enum(["asc", "desc"]),
			limit: z.coerce.number().positive().optional(),
		}),
	),
	async (c) => {
		const query = c.req.valid("query");
		const sensor = c.var.sensor;
		const metricName = c.var.metricName;

		const date = new Date(query.date);
		const startTime = query.startTime || startOfDay(date);
		const endTime = query.endTime || endOfDay(date);

		const readings = await db.readings.getMetrics({
			deviceId: sensor.device,
			sensorId: sensor.id,
			sensorType: sensor.type,
			processed: true,
			date,
			metricName,
			startTime,
			endTime,
		});

		const compareDate = query.order === "asc" ? compareAsc : compareDesc;

		const result = readings
			.sort((a, b) => compareDate(a.time, b.time))
			.slice(0, query.limit);

		return c.json(result);
	},
);

// export device readings to a csv file
devicesApi.get(
	"/:deviceId/readings/csv",
	auth0,
	deviceFromPath,
	zValidator(
		"query",
		z.object({
			start: z.coerce.date(),
			end: z.coerce.date(),
		}),
	),
	async (c) => {
		const { start, end } = c.req.valid("query");
		const { id } = c.var.device;

		return stream(c, async (stream) => {
			const filename = csvFileName(id, start, end);
			c.header("Content-Type", "text/csv");
			c.header("Content-Disposition", `attachment; filename="${filename}"`);

			const csvStringifier = stringify({
				header: true,
				delimiter: ",",
			});

			Readable.from(deviceReadings(id, start, end)).pipe(csvStringifier);

			for await (const row of csvStringifier) {
				await stream.write(row);
			}
		});
	},
);

async function* deviceReadings(
	deviceId: string,
	start: Date,
	end: Date,
): AsyncGenerator<
	Omit<Reading, "time" | "date"> & { date: string; time: string }
> {
	for (const date of eachDayOfInterval({ start, end })) {
		const readings = await db.readings.getByIdAndDate(deviceId, date);
		for (const reading of readings) {
			yield {
				...reading,
				date: reading.date.toString(),
				time: reading.time.toISOString(),
			};
		}
	}
}

function csvFileName(deviceId: string, start: Date, end: Date) {
	const formatDate = (date: Date): string => format(date, "yyyyMMdd");

	return `${deviceId}-${formatDate(start)}-${formatDate(end)}.csv`;
}
