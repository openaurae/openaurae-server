import type { JwtPayload } from "jsonwebtoken";
import type { HonoEnv } from "../../types";

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
	isAdmin: boolean;
	isReadOnlyAdmin: boolean;
	permissions: string[];
}

/**
 * Variables set by {@link auth0} middleware.
 */
export type Auth0Variables = {
	jwtPayload: UserClaims;
	user: Auth0User;
};

export type Auth0Env = HonoEnv<Auth0Variables>;
