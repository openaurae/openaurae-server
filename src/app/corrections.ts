import { auth0, checkDeviceOwnership } from "app/middleware";
import type { ApiEnv } from "app/types";
import { db } from "database";
import { Hono } from "hono";

export const correctionApi = new Hono<ApiEnv>();

correctionApi.use(auth0);

correctionApi.get("/", async (c) => {
	const { userId, canReadAll } = c.get("user");

	const corrections = canReadAll
		? await db.corrections.all()
		: await db.corrections.getByUserId(userId);
	return c.json(corrections);
});

correctionApi.use("/:deviceId", checkDeviceOwnership());

correctionApi.get("/:deviceId", async (c) => {
	const { deviceId } = c.req.param();

	const corrections = await db.corrections.getByUserId(deviceId);

	return c.json(corrections);
});
