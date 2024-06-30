import type { Env } from "hono";
import type { JwtPayload } from "jsonwebtoken";
import { z } from "zod";
import type { Device } from "../database";

export type ContextVariables = Record<string, unknown>;

export type HonoEnv<T extends ContextVariables> = Env & {
	Variables: T;
};

/**
 * Data structure of Auth0 JWT payload.
 */
export interface UserClaims extends JwtPayload {
	sub: string;
	scope: string;
	azp: string;
	permissions: string[];
}

/**
 * User info extracted from Auth0 JWT payload.
 */
export interface Auth0User {
	userId: string;
	canReadAll: boolean;
	canModifyAll: boolean;
	permissions: string[];
}

/**
 * Variables set by {@link auth0} middleware.
 */
export interface Auth0Variables extends ContextVariables {
	jwtPayload: UserClaims;
	user: Auth0User;
}

/**
 * All api routes should be authenticated.
 */
export type ApiEnv = HonoEnv<Auth0Variables>;

/**
 * Variables set by {@link checkDeviceOwnership} middleware.
 */
export interface DeviceVariables extends ContextVariables {
	device: Device;
}

/**
 * Device ids in apis should be verified existence and ownership.
 */
export type DeviceApiEnv = HonoEnv<Auth0Variables & DeviceVariables>;

export const MetricNameParser = z.enum([
	"temperature",
	"pm25",
	"tvoc",
	"ch2o",
	"occupancy",
	"contact",
	"angle",
	"power",
]);

/**
 * Metrics displayed as chart in client.
 */
export type MetricName = z.infer<typeof MetricNameParser>;
