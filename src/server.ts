import { app } from "./app";
import { port } from "./env";

export default {
	port: port,
	fetch: app.fetch,
};
