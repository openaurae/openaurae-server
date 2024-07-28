import { db } from "database";
import { Hono } from "hono";

export const metasApi = new Hono();

metasApi.get("/measures", async (c) => {
	const metas = await db.measureMetas.all();
	return c.json(metas);
});

metasApi.get("/sensors", async (c) => {
	const sensorTypes = await db.sensorTypes.all();
	return c.json(sensorTypes);
});
