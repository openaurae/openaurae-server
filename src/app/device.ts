import { type Context, Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { db } from "../database";
import type { Device } from "../database/types.ts";
import { auth0 } from "./auth";
import type { AppEnv } from "./types";

interface DeviceApiEnv extends AppEnv {
	device: Device;
}

export const deviceApi = new Hono<DeviceApiEnv>();

deviceApi.use(auth0);

deviceApi.get("/", async (c: Context<AppEnv>) => {
	const { canReadAll, userId } = c.get("user");
	const devices = canReadAll
		? await db.allDevices()
		: await db.userDevices(userId);
	return c.json(devices);
});

const checkOwnership = createMiddleware<DeviceApiEnv>(async (c, next) => {
	const { deviceId } = c.req.param();
	const { userId, canReadAll } = c.get("user");
	const device = await db.getDeviceById(deviceId);

	if (!device) {
		return c.notFound();
	}

	const deviceIds = await db.userDeviceIds(userId);

	if (!canReadAll && !deviceIds.includes(deviceId)) {
		throw new HTTPException(401, {
			message: "Only admin or device owner can access this device.",
		});
	}

	c.set("device", device);
	await next();
});

deviceApi.use(checkOwnership);

deviceApi.get("/:deviceId", async (c: Context<DeviceApiEnv>) => {
	const { deviceId } = c.req.param();

	const device = await db.getDeviceById(deviceId);

	return c.json(device);
});
