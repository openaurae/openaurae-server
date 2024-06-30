import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { db } from "../../database";
import type { DeviceApiEnv } from "../types.ts";

/**
 * Check device ownership by device id in path variable or query params.
 *
 * The query is valid when user is admin or user owns the device.
 */
export const checkDeviceOwnership = createMiddleware<DeviceApiEnv>(
	async (c, next) => {
		const deviceId = c.req.param("deviceId") || c.req.query("deviceId");

		if (!deviceId) {
			return c.notFound();
		}

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
	},
);
