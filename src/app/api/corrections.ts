import { auth0 } from "app/middleware/auth0";
import { db } from "database";
import { Hono } from "hono";
import { deviceFromPath } from "../middleware/extract";

export const correctionApi = new Hono();

correctionApi.get("/", auth0, async (c) => {
	const { userId, canReadAll } = c.var.user;

	const corrections = canReadAll
		? await db.corrections.all()
		: await db.corrections.getByUserId(userId);
	return c.json(corrections);
});

correctionApi.get("/:deviceId", auth0, deviceFromPath, async (c) => {
	const device = c.var.device;

	const corrections = await db.corrections.getByDeviceId(device.id);

	return c.json(corrections);
});
