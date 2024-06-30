type ProcessEnv = {
	JWT_SECRET?: string;
	PORT?: string;
};

// https://www.typescriptlang.org/docs/handbook/declaration-merging.html#merging-interfaces
declare module "bun" {
	interface Env extends ProcessEnv {}
}

export const jwtSecret = Bun.env.JWT_SECRET || "";
export const port: number = Number(Bun.env.PORT || "8000");
