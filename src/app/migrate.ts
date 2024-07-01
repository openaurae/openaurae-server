import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { migrateDevices, migrateReadings } from "../migration/aws";
import { auth0, auth0Admin } from "./middleware";
import type { ApiEnv } from "./types.ts";

export const migrationApi = new Hono<ApiEnv>();

migrationApi.use(auth0, auth0Admin({ write: true }));

migrationApi.post("/aws/devices", async (c) => {
	await migrateDevices();

	return c.text("finished");
});

migrationApi.post(
	"/aws/readings",
	zValidator(
		"json",
		z.object({
			deviceIds: z.array(z.string()),
			start: z.coerce.date(),
			end: z.coerce.date(),
		}),
	),
	async (c) => {
		const { deviceIds, start, end } = c.req.valid("json");
		await migrateReadings(deviceIds, start, end);

		return c.text("finished");
	},
);
