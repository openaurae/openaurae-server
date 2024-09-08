import type { ApiEnv, Auth0User, UserClaims } from "app/types";
import { auth0Audience, auth0Issuer, auth0Secret } from "env";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { verify } from "jsonwebtoken";

/**
 * Verify user access token from request.
 * The access token must be a valid JWT token issued by Auth0 openaurae API.
 *
 * @see {parseRequestJwtToken}
 */
export const auth0 = createMiddleware<ApiEnv>(async (c, next) => {
	parseRequestJwtToken(c);
	await next();
});

/**
 * Verify admin access token from request.
 * The access token must be a valid JWT token issued by Auth0 openaurae API
 * and contain permission `admin`.
 *
 * @see {parseRequestJwtToken}
 */
export const auth0Admin = ({ readWrite } = { readWrite: false }) =>
	createMiddleware<ApiEnv>(async (c, next) => {
		parseRequestJwtToken(c);
		const { canModifyAll, canReadAll } = c.get("user");

		// both "admin" and "read:admin" can read all resources, while user cannot
		if (!canReadAll || (readWrite && !canModifyAll)) {
			throw new HTTPException(401, {
				message: "Admin required.",
			});
		}

		await next();
	});

/**
 * Verify access token in user requests and add user info to the Hono {@link Context}.
 *
 * Access token can be set in 2 ways:
 * - for most requests, token is set in request header as bearer token (`Authorization: Bearer token`)
 * - for download links, token is set in request params (`?accessToken=token`)
 *
 * Hono jwt middleware is not used because it only checks
 * `exp`, `iat` and `nbf`.
 *
 * @see {verifyJwtToken}
 * @see https://github.com/auth0/node-jsonwebtoken
 * @see https://hono.dev/docs/helpers/jwt#payload-validation
 */
function parseRequestJwtToken(c: Context<ApiEnv>): void {
	const token =
		c.req.header("Authorization")?.replace(/^Bearer /, "") ||
		c.req.query("accessToken") ||
		"";

	const claims = verifyJwtToken(token);

	const roles = new Set(claims.permissions);

	const user: Auth0User = {
		userId: claims.sub,
		canReadAll: roles.has("admin") || roles.has("read:admin"),
		canModifyAll: roles.has("admin"),
		permissions: claims.permissions,
	};

	c.set("jwtPayload", claims);
	c.set("user", user);
}

function verifyJwtToken(token: string): UserClaims {
	try {
		return <UserClaims>verify(token, auth0Secret, {
			algorithms: ["HS256"],
			audience: auth0Audience,
			issuer: auth0Issuer,
		});
	} catch (e) {
		throw new HTTPException(401, {
			message: "Unauthorized",
		});
	}
}
