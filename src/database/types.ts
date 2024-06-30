import { types } from "cassandra-driver";
import { z } from "zod";
import LocalDate = types.LocalDate;

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
 * Note: `id` is not unique because some devices share the same sensor
 */
export interface Sensor {
	id: string;
	device: string;
	type: SensorType;
	name?: string;
	comments?: string;
	last_record?: Date;
}

export interface Reading {
	device: string;
	date: LocalDate;
	reading_type: SensorType;
	sensor_id: string;
	processed: boolean;
	time: Date;

	action?: string;
	angle?: number;
	angle_x?: number;
	angle_x_absolute?: number;
	angle_y?: number;
	angle_y_absolute?: number;
	angle_z?: number;
	battery?: number;
	cf_pm1?: number;
	cf_pm10?: number;
	cf_pm25?: number;
	ch2o?: number;
	co2?: number;
	consumption?: number;
	contact?: boolean;
	humidity?: number;
	illuminance?: number;
	ip_address?: string;
	latitude?: number;
	longitude?: number;
	occupancy?: boolean;
	pd05?: number;
	pd10?: number;
	pd100?: number;
	pd100g?: number;
	pd25?: number;
	pd50?: number;
	pm1?: number;
	pm10?: number;
	pm25?: number;
	pmv10?: number;
	pmv100?: number;
	pmv25?: number;
	pmv_total?: number;
	pmvtotal?: number;
	power?: number;
	state?: string;
	temperature?: number;
	tvoc?: number;
	voltage?: number;
}

export interface Correction {
	device: string;
	reading_type: SensorType;
	metric: string;
	expression: string;
}

export const sensorTypes = [
	"ptqs1005",
	"pms5003st",
	"zigbee_temp",
	"zigbee_occupancy",
	"zigbee_contact",
	"zigbee_vibration",
	"zigbee_power",
] as const;

export const SensorType = z.enum(sensorTypes);
export type SensorType = z.infer<typeof SensorType>;

export type Metrics = Omit<
	Reading,
	"reading_type" | "device" | "sensor_id" | "date" | "time" | "processed"
>;
export type MetricName = keyof Metrics;
export type Metric<T extends MetricName> = {
	[key in T]: Metrics[T];
};
