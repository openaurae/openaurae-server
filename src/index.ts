import { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { logger } from "hono/logger";
import { auth0 } from "./auth";
import { port } from "./env";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

app.use(logger(), csrf(), cors());

app.get("/health", (c) => {
	return c.json({
		status: "up",
	});
});

app.use("/me", auth0).get("/me", (c) => {
	const user = c.get("user");
	const jwtPayload = c.get("jwtPayload");
	return c.json({
		...user,
		jwtPayload,
	});
});

export default {
	port: port,
	fetch: app.fetch,
};
