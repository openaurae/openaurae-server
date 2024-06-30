import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { SensorTypeParser, db } from "../database";
import { auth0, checkDeviceOwnership } from "./middleware";
import { MetricNameParser } from "./types";

export const metricsApi = new Hono();

metricsApi.use(auth0, checkDeviceOwnership);

metricsApi.get(
	"/",
	zValidator(
		"query",
		z.object({
			deviceId: z.string(),
			sensorId: z.string(),
			sensorType: SensorTypeParser,
			date: z.coerce.date(),
			metric: MetricNameParser,
			processed: z.coerce.boolean().default(true),
			limit: z.coerce.number().positive().optional(),
			order: z.enum(["asc", "desc"]),
		}),
	),
	async (c) => {
		const params = c.req.valid("query");
		const metrics = await db.sensorMetrics(params);

		return c.json(
			metrics.map((metric) => ({
				...metric,
				value: metric[params.metric],
			})),
		);
	},
);
