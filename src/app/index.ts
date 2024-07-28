import { correctionApi } from "app/corrections";
import { exportApi } from "app/csv";
import { deviceApi } from "app/devices";
import { measuresApi } from "app/measures";
import { metasApi } from "app/metas";
import { auth0 } from "app/middleware";
import type { ApiEnv } from "app/types";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";

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
api.route("/measures", measuresApi);
api.route("/export", exportApi);
api.route("/corrections", correctionApi);
api.route("/metadata", metasApi);
