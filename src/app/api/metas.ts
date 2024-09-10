import { db } from "database";
import { Hono } from "hono";

export const metasApi = new Hono();

metasApi.get("/metrics", async (c) => {
	const metas = await db.metricMetas.all();
	return c.json(metas);
});

metasApi.get("/metrics/:name", async (c) => {
	const name = c.req.param("name");
	const metadata = await db.metricMetas.getByName(name);
	return c.json(metadata);
});

metasApi.get("/sensors", async (c) => {
	const metas = await db.sensorMetas.all();
	return c.json(metas);
});
