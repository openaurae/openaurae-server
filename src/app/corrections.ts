import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { SensorTypeParser, db } from "../database";
import { auth0, checkDeviceOwnership } from "./middleware";
import type { ApiEnv } from "./types";

export const correctionApi = new Hono<ApiEnv>();

correctionApi.use(auth0);

correctionApi.get("/", async (c) => {
	const { userId, canReadAll } = c.get("user");

	const corrections = canReadAll
		? await db.allCorrections()
		: await db.userCorrections(userId);
	return c.json(corrections);
});

correctionApi.use("/:deviceId", checkDeviceOwnership());

correctionApi.get(
	"/:deviceId",
	zValidator(
		"query",
		z.object({
			sensorType: SensorTypeParser.optional(),
		}),
	),
	async (c) => {
		const { deviceId } = c.req.param();
		const { sensorType } = c.req.valid("query");

		const corrections = sensorType
			? await db.sensorCorrections(deviceId, sensorType)
			: await db.deviceCorrections(deviceId);

		return c.json(corrections);
	},
);
