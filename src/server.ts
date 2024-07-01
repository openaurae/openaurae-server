import { app } from "./app";
import { db } from "./database";
import { port } from "./env";

await db.connect();

export default {
	port: port,
	fetch: app.fetch,
};
