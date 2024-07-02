type ProcessEnv = {
	AUTH0_SECRET?: string;
	AUTH0_ISSUER?: string;
	AUTH0_AUDIENCE?: string;
	PORT?: string;
	CASSANDRA_HOST?: string;
	CASSANDRA_KEYSPACE?: string;
	MQTT_BROKER?: string;
};

// https://www.typescriptlang.org/docs/handbook/declaration-merging.html#merging-interfaces
declare module "bun" {
	interface Env extends ProcessEnv {}
}

export const auth0Secret = Bun.env.AUTH0_SECRET || "";
export const auth0Issuer = Bun.env.AUTH0_ISSUER || "";
export const auth0Audience = Bun.env.AUTH0_AUDIENCE || "";
export const port: number = Number(Bun.env.PORT || "8000");
export const cassandraHost: string = Bun.env.CASSANDRA_HOST || "127.0.0.1";
export const cassandraKeyspace: string = Bun.env.CASSANDRA_KEYSPACE || "aurae";
export const mqttBroker: string =
	Bun.env.MQTT_BROKER || "http://localhost:1883";
