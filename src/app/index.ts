import { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { correctionApi } from "./corrections";
import { exportApi } from "./csv";
import { deviceApi } from "./devices";
import { metricsApi } from "./metrics";
import { auth0 } from "./middleware";
import type { ApiEnv } from "./types";

export const app = new Hono<ApiEnv>();

app.use(logger(), csrf(), cors());

app.onError((err) => {
	if (err instanceof HTTPException) {
		return err.getResponse();
	}

	throw new HTTPException(500, {
		message: err.message,
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
app.get("/health", (c) => {
	return c.json({
		status: "up",
	});
});

const api = app.basePath("/api/v1");

api.route("/devices", deviceApi);
api.route("/metrics", metricsApi);
api.route("/export", exportApi);
api.route("/corrections", correctionApi);
