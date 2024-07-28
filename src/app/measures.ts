import { zValidator } from "@hono/zod-validator";
import { auth0, checkDeviceOwnership } from "app/middleware";
import { db } from "database";
import { measuresSchema } from "database/types";
import { Hono } from "hono";
import { z } from "zod";

export const measuresApi = new Hono();

measuresApi.use(auth0, checkDeviceOwnership());

measuresApi.get(
	"/",
	zValidator(
		"query",
		z.object({
			deviceId: z.string(),
			sensorId: z.string(),
			sensorType: z.string(),
			date: z.coerce.date(),
			name: measuresSchema.keyof(),
			processed: z.coerce.boolean().default(true),
			page: z.coerce.number().positive().optional().default(1),
			count: z.coerce.number().positive().optional().default(1000),
			order: z.enum(["asc", "desc"]),
		}),
	),
	async (c) => {
		const { name, page, count, order, ...params } = c.req.valid("query");
		const offset = (page - 1) * count;

		let measures = await db.readings.getMeasuresByKey(name, params); // ordered by time desc

		if (order === "asc") {
			measures = measures.reverse();
		}

		measures = measures
			.filter((measure) => measure[name] !== null)
			.slice(offset, offset + count)
			.map((measure) => ({
				...measure,
				value: measure[name],
			}));

		return c.json(measures);
	},
);
