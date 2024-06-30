import { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { logger } from "hono/logger";
import { deviceApi } from "./device";
import { metricsApi } from "./metrics.ts";
import { auth0 } from "./middleware";
import type { ApiEnv } from "./types";

export const app = new Hono<ApiEnv>();

app.use(logger(), csrf(), cors());

app.use("/me", auth0).get("/me", (c) => {
	const user = c.get("user");
	const jwtPayload = c.get("jwtPayload");
	return c.json({
		...user,
		jwtPayload,
	});
});
app.get("/health", (c) => {
	return c.json({
		status: "up",
	});
});

const api = app.basePath("/api/v1");

api.route("/devices", deviceApi);
api.route("/metrics", metricsApi);
