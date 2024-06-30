import type { SensorType } from "../database";
import type { MetricName } from "./types";

/**
 * Sensor of one {@link SensorType} only reports a subset of metrics.
 */
export const metricNamesBySensorType: Record<SensorType, MetricName[]> = {
	ptqs1005: ["temperature", "pm25", "tvoc", "ch2o"],
	pms5003st: ["temperature", "pm25"],
	zigbee_temp: ["temperature"],
	zigbee_occupancy: ["occupancy"],
	zigbee_contact: ["contact"],
	zigbee_power: ["power"], // temperature, state
	zigbee_vibration: ["angle"],
};

export interface MetricMeta<T extends MetricName> {
	name: T;
	displayName: string;
	unit?: string;
	isBoolean: boolean;
}

export const metricMetadata: {
	[key in MetricName]: MetricMeta<key>;
} = {
	temperature: {
		name: "temperature",
		displayName: "Temperature",
		unit: "°C",
		isBoolean: false,
	},
	pm25: {
		name: "pm25",
		displayName: "PM 2.5",
		unit: "µg/m3",
		isBoolean: false,
	},
	tvoc: {
		name: "tvoc",
		displayName: "TVOC",
		unit: "ppm",
		isBoolean: false,
	},
	ch2o: {
		name: "ch2o",
		displayName: "HCHO",
		unit: "mg/m3",
		isBoolean: false,
	},
	occupancy: {
		name: "occupancy",
		displayName: "Occupancy",
		isBoolean: true,
	},
	contact: {
		name: "contact",
		displayName: "Contact",
		isBoolean: true,
	},
	power: {
		name: "power",
		displayName: "Power",
		isBoolean: false,
	},
	angle: {
		name: "angle",
		displayName: "Angle",
		unit: "°",
		isBoolean: false,
	},
};
