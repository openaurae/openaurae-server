import type { Env } from "hono";

export type ContextVariables = Record<string, unknown>;

/**
 * Generic for Hono context variables.
 *
 * @see [Hono Context var](https://hono.dev/docs/api/context#var)
 */
export type HonoEnv<T extends ContextVariables> = Env & {
	Variables: T;
};
