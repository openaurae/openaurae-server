import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { verify } from "jsonwebtoken";
import { jwtSecret } from "../../env.ts";
import type { ApiEnv, Auth0User, UserClaims } from "../types.ts";

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
