import type { ApiEnv, Auth0User, UserClaims } from "app/types";
import { auth0Audience, auth0Issuer, auth0Secret } from "env";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { verify } from "jsonwebtoken";

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
export const auth0 = createMiddleware<ApiEnv>(async (c, next) => {
	const token =
		c.req.header("Authorization")?.replace(/^Bearer /, "") ||
		c.req.query("accessToken") ||
		"";
	const claims = verifyToken(token);

	const roles = new Set(claims.permissions);

	const user: Auth0User = {
		userId: claims.sub,
		canReadAll: roles.has("admin") || roles.has("read:admin"),
		canModifyAll: roles.has("admin"),
		permissions: claims.permissions,
	};

	c.set("jwtPayload", claims);
	c.set("user", user);

	await next();
});

/**
 * Checks whether user is an admin who can modify all resources.
 *
 * Note: this middleware must be placed after {@link auth0},
 * otherwise `c.get("user")` is `undefined`.
 */
export const auth0Admin = ({ write } = { write: false }) =>
	createMiddleware<ApiEnv>(async (c, next) => {
		const { canModifyAll, canReadAll } = c.get("user");

		// both "admin" and "read:admin" can read all resources, while user cannot
		if (!canReadAll || (write && !canModifyAll)) {
			throw new HTTPException(401, {
				message: "Admin required.",
			});
		}

		await next();
	});

function verifyToken(token: string): UserClaims {
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
