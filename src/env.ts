type ProcessEnv = {
	JWT_SECRET?: string;
	PORT?: string;
	CASSANDRA_HOST?: string;
	CASSANDRA_KEYSPACE?: string;
};

// https://www.typescriptlang.org/docs/handbook/declaration-merging.html#merging-interfaces
declare module "bun" {
	interface Env extends ProcessEnv {}
}

export const jwtSecret = Bun.env.JWT_SECRET || "";
export const port: number = Number(Bun.env.PORT || "8000");
export const cassandraHost: string = Bun.env.CASSANDRA_HOST || "127.0.0.1";
export const cassandraKeyspace: string = Bun.env.CASSANDRA_KEYSPACE || "aurae";
