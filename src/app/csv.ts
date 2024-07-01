import { Readable } from "node:stream";
import { zValidator } from "@hono/zod-validator";
import { stringify } from "csv";
import { eachDayOfInterval } from "date-fns";
import { Hono } from "hono";
import { stream } from "hono/streaming";
import { z } from "zod";
import { db } from "../database";
import { auth0, checkDeviceOwnership } from "./middleware";
import type { ApiEnv } from "./types";

export const exportApi = new Hono<ApiEnv>();

exportApi.use(auth0, checkDeviceOwnership);

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

		const getReadings = async function* () {
			for (const date of eachDayOfInterval({ start, end })) {
				const readings = await db.deviceReadings(deviceId, date);
				for (const reading of readings) {
					yield {
						...reading,
						date: reading.date.toString(),
						time: reading.time.toISOString(),
					};
				}
			}
		};

		const stringifier = stringify({
			header: true,
			delimiter: ",",
		});

		return stream(c, async (stream) => {
			c.header("Content-Type", "text/csv");
			c.header("Content-Disposition", `attachment; filename=\"data.csv\"`);

			Readable.from(getReadings()).pipe(stringifier);

			for await (const row of stringifier) {
				await stream.write(row);
			}
		});
	},
);
