import { type mapping, types } from "cassandra-driver";
import { z } from "zod";
import LocalDate = types.LocalDate;

export type Mapper = mapping.Mapper;
export type ModelMapper<T> = mapping.ModelMapper<T>;

export interface User {
	id: string;
	devices: string[];
}

export interface Device {
	id: string;
	name: string;
	latitude?: number;
	longitude?: number;
	last_record?: Date;
	sensor_types?: string[];
}

/**
 * Note: `id` is not unique in previous `ptqs1005` records
 */
export interface Sensor {
	id: string;
	device: string;
	type: string;
	name?: string;
	comments?: string;
	last_record?: Date;
}

export type SensorKey = Pick<Sensor, "id" | "device" | "type">;

export const readingSchema = z.object({
	// PK
	device: z.string().describe("device id"),
	date: z.instanceof(LocalDate),
	// CK
	reading_type: z.string().describe("sensor type"),
	sensor_id: z.string(),
	processed: z.boolean().describe("whether applied corrections"),
	time: z.date(),

	// measures
	action: z.string().optional(),
	angle: z.number().optional(),
	angle_x: z.number().optional(),
	angle_x_absolute: z.number().optional(),
	angle_y: z.number().optional(),
	angle_y_absolute: z.number().optional(),
	angle_z: z.number().optional(),
	battery: z.number().optional(),
	cf_pm1: z.number().optional(),
	cf_pm10: z.number().optional(),
	cf_pm25: z.number().optional(),
	ch2o: z.number().optional().describe("Formaldehyde (µg/m3)"),
	co2: z.number().optional(),
	consumption: z.number().optional(),
	contact: z.boolean().optional(),
	humidity: z.number().optional(),
	illuminance: z.number().optional(),
	ip_address: z.string().optional(),
	latitude: z.number().optional(),
	longitude: z.number().optional(),
	occupancy: z.boolean().optional(),
	pd05: z.number().optional(),
	pd10: z.number().optional(),
	pd100: z.number().optional(),
	pd100g: z.number().optional(),
	pd25: z.number().optional(),
	pd50: z.number().optional(),
	pm1: z.number().optional().describe("Particulate matter 1 (µg/m3)"),
	pm10: z.number().optional().describe("Particulate matter 10 (µg/m3)"),
	pm25: z.number().optional().describe("Particulate matter 2.5 (µg/m3)"),
	pm4: z.number().optional().describe("Particulate matter 4 (µg/m3)"),
	pmv10: z.number().optional(),
	pmv100: z.number().optional(),
	pmv25: z.number().optional(),
	pmv_total: z.number().optional(),
	pmvtotal: z.number().optional(),
	power: z.number().optional(),
	state: z.string().optional(),
	temperature: z.number().optional().describe("Temperature (°C)"),
	tvoc: z.number().optional(),
	voltage: z.number().optional(),
	lvocs: z
		.number()
		.optional()
		.describe("Light Volatile Organic Compounds (ppb)"),
	pressure: z.number().optional().describe("Pressure (mb)"),
});

export type Reading = z.infer<typeof readingSchema>;

export const measuresSchema = readingSchema.omit({
	device: true,
	date: true,
	reading_type: true,
	sensor_id: true,
	processed: true,
	time: true,
});

export type Measures = z.infer<typeof measuresSchema>;

export type Measure<T extends keyof Measures> = Pick<Reading, "time" | T>;

export interface Correction {
	device: string;
	reading_type: string;
	metric: keyof Measures;
	expression: string;
}

export interface SensorType {
	id: string;
	measures: string[];
}

export interface MeasureMetadata {
	id: string;
	name: string;
	unit?: string;
	is_bool: boolean;
}
