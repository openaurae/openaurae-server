import { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { logger } from "hono/logger";
import { auth0 } from "./auth";
import { deviceApi } from "./device";
import type { AppEnv } from "./types";

export const app = new Hono<AppEnv>();

app.use(logger(), csrf(), cors());

app.use("/me", auth0).get("/me", (c) => {
	const user = c.get("user");
	const jwtPayload = c.get("jwtPayload");
	return c.json({
		...user,
		jwtPayload,
	});
});

app.basePath("/api/v1").route("devices", deviceApi);

app.get("/health", (c) => {
	return c.json({
		status: "up",
	});
});
