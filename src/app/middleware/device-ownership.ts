import type { DeviceApiEnv } from "app/types";
import { db } from "database";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

/**
 * Check device ownership by device id in path variable or query params.
 *
 * The query is valid when user is admin or user owns the device.
 */
export const checkDeviceOwnership = ({ required } = { required: true }) =>
	createMiddleware<DeviceApiEnv>(async (c, next) => {
		const deviceId = c.req.param("deviceId") || c.req.query("deviceId");

		if (required && !deviceId) {
			throw new HTTPException(400, { message: "deviceId required" });
		}

		if (deviceId) {
			const { userId, canReadAll } = c.get("user");
			const device = await db.devices.getById(deviceId);

			if (!device) {
				return c.notFound();
			}

			const user = await db.users.getById(userId);

			if (!canReadAll && !user.devices.includes(deviceId)) {
				throw new HTTPException(401, {
					message: "Only admin or device owner can access this device.",
				});
			}

			c.set("device", device);
		}

		await next();
	});
