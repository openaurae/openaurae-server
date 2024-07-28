import { Readable } from "node:stream";
import { zValidator } from "@hono/zod-validator";
import { auth0, checkDeviceOwnership } from "app/middleware";
import type { ApiEnv } from "app/types";
import { stringify } from "csv";
import { db } from "database";
import { eachDayOfInterval } from "date-fns";
import { Hono } from "hono";
import { stream } from "hono/streaming";
import { z } from "zod";

export const exportApi = new Hono<ApiEnv>();

exportApi.use(auth0, checkDeviceOwnership());

exportApi.get(
	"/csv/readings",
	zValidator(
		"query",
		z.object({
			deviceId: z.string(),
			start: z.coerce.date(),
			end: z.coerce.date(),
		}),
	),
	async (c) => {
		const { deviceId, start, end } = c.req.valid("query");

		const stringifier = stringify({
			header: true,
			delimiter: ",",
		});

		return stream(c, async (stream) => {
			c.header("Content-Type", "text/csv");
			c.header("Content-Disposition", `attachment; filename=\"data.csv\"`);

			Readable.from(deviceReadings(deviceId, start, end)).pipe(stringifier);

			for await (const row of stringifier) {
				await stream.write(row);
			}
		});
	},
);

async function* deviceReadings(deviceId: string, start: Date, end: Date) {
	for (const date of eachDayOfInterval({ start, end })) {
		const readings = await db.readings.getByKey(deviceId, date);
		for (const reading of readings) {
			yield {
				...reading,
				date: reading.date.toString(),
				time: reading.time.toISOString(),
			};
		}
	}
}
