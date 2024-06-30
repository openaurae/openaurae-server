import type { Env } from "hono";
import type { Auth0Variables } from "./auth";

export interface AppEnv extends Env {
	Variables: {
		[key: string]: unknown;
	} & Auth0Variables;
}
