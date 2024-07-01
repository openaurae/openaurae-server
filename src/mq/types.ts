import type { Reading } from "../database";

type Alias = "tmp" | "rh" | "sensor" | "device_id";

export const aliasMapping: Record<Alias, keyof Reading> = {
	tmp: "temperature",
	rh: "humidity",
	sensor: "sensor_id",
	device_id: "device",
};

export type Message = {
	// all entries in Reading are optional
	// date and time are strings
	[T in keyof Reading]?: T extends "time" | "date" ? string : Reading[T];
} & {
	tmp?: number;
	rh?: number;
	sensor?: string;
	device_id?: string;
} & {
	// may have other keys such as "Occupancy"
	[key: string]: unknown;
};

export type Topic = {
	[T in keyof Pick<Reading, "device" | "sensor_id">]?: Reading[T];
};
