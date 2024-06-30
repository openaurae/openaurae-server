import { type Context, Hono } from "hono";
import { db } from "../database";
import { auth0, checkDeviceOwnership } from "./middleware";
import type { ApiEnv, DeviceApiEnv } from "./types";

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
	const sensors = await db.deviceSensors(device.id);

	return c.json({
		...device,
		sensors,
	});
});
