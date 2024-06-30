import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { JwtPayload } from "jsonwebtoken";
import { verify } from "jsonwebtoken";
import { jwtSecret } from "./env";
import type { AppEnv } from "./types";

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
 * User info extracted from JWT payload.
 */
export interface User {
	id: string;
	canReadAll: boolean;
	canModifyAll: boolean;
	permissions: string[];
}

/**
 * Variables added to Hono context.
 */
export interface Auth0Variables {
	jwtPayload: UserClaims;
	user: User;
}

/**
 * Verify access token in user requests and set user info to the Hono context.
 *
 * Access token can be set in 2 ways:
 * - for most requests, token is set in request header as bearer token (`Authorization: Bearer token`)
 * - for download links, token is set in request params (`?accessToken=token`)
 *
 * Hono jwt middleware is not used because it only checks
 * `exp`, `iat` and `nbf`.
 *
 * @see {verifyToken}
 * @see https://github.com/auth0/node-jsonwebtoken
 * @see https://hono.dev/docs/helpers/jwt#payload-validation
 */
export const auth0 = createMiddleware<AppEnv>(async (c, next) => {
	const token =
		c.req.header("Authorization")?.replace(/^Bearer /, "") ||
		c.req.query("accessToken") ||
		"";
	const claims = verifyToken(token);

	const roles = new Set(claims.permissions);

	const user: User = {
		id: claims.sub,
		canReadAll: roles.has("admin") || roles.has("read:admin"),
		canModifyAll: roles.has("admin"),
		permissions: claims.permissions,
	};

	c.set("jwtPayload", claims);
	c.set("user", user);

	await next();
});

const verifyToken = (token: string): UserClaims => {
	try {
		return <UserClaims>verify(token, jwtSecret, {
			algorithms: ["HS256"],
			audience: "http://new.openaurae.org/api/",
			issuer: "https://aurae.au.auth0.com/",
		});
	} catch (e) {
		throw new HTTPException(401, {
			message: "Unauthorized",
		});
	}
};
