import { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { showRoutes } from "hono/dev";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { ZodError } from "zod";
import { correctionApi } from "./api/corrections";
import { devicesApi } from "./api/devices";
import { metasApi } from "./api/metas";
import { auth0 } from "./middleware/auth0";

export const app = new Hono();

app.use(logger(), csrf(), cors());

app.onError((err, c) => {
	if (err instanceof HTTPException) {
		return err.getResponse();
	}
	if (err instanceof ZodError) {
		return c.text(err.message, 400);
	}

	return c.text(err.message, 500);
});

app.get("/me", auth0, (c) => {
	const user = c.var.user;
	const jwtPayload = c.var.jwtPayload;

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

const api = app
	.basePath("/api/v1")
	.route("/devices", devicesApi)
	.route("/corrections", correctionApi)
	.route("/metadata", metasApi);

showRoutes(api, { verbose: true });
