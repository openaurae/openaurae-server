import { type mapping, types } from "cassandra-driver";
import { z } from "zod";
import LocalDate = types.LocalDate;

export type Mapper = mapping.Mapper;
export type ModelMapper<T> = mapping.ModelMapper<T>;

export interface User {
	id: string;
	devices: string[];
}

/**
 * All device types.
 *
 * - `air_quality`: AQ boxes containing a `pms5003st` sensor and a `ptqs1005` sensor.
 * - `zigbee`: Zigbee devices containing `zigbee_*` sensors.
 * - `nemo_cloud`: devices which upload readings to the [Nemo Cloud server](https://nemocloud.com/)
 *  and the [S5 Nemo Cloud server](https://s5.nemocloud.com/).
 *
 * Use `.enum` to access a specific device type.
 *
 * ```typescript
 *	DeviceTypeSchema.enum.zigbee; // "zigbee"
 * ```
 *
 * Use `.options` to access all device types.
 *
 * ```typescript
 *    DeviceTypeSchema.options; // ["nemo_cloud", "air_quality", "zigbee"]
 * ```
 *
 * @see [Zod enums](https://zod.dev/?id=zod-enums)
 */
export const DeviceTypeSchema = z.enum(["nemo_cloud", "air_quality", "zigbee"]);
export type DeviceType = z.infer<typeof DeviceTypeSchema>;

export const SensorTypeSchema = z.enum([
	"ptqs1005",
	"pms5003st",
	"zigbee_temp",
	"zigbee_contact",
	"zigbee_power",
	"zigbee_occupancy",
	"zigbee_vibration",
	"nemo_cloud",
]);
export type SensorType = z.infer<typeof SensorTypeSchema>;

export const DeviceSchema = z.object({
	id: z.string().regex(/^[\w:]{1,50}$/),
	name: z.string().min(1).max(50),
	type: DeviceTypeSchema,
	last_record: z.date().optional(),
	sensor_types: SensorTypeSchema.array().optional(),
	latitude: z.coerce.number().lte(90).gte(-90).optional(),
	longitude: z.coerce.number().lte(180).gte(-180).optional(),
	room: z.string().optional(),
});
export type Device = z.infer<typeof DeviceSchema>;

/**
 * Primary key is `((device), id)`.
 *
 * - For AQ boxes containing a `pms5003st` sensor and a `ptqs1005` sensor,
 * sensor ids are always `pms5003st` and `ptqs1005`.
 * - For Zigbee devices, sensor ids are sensors' serial numbers.
 * - For Nemo Cloud devices, sensor ids are fetched from the sensor API.
 */
export const SensorSchema = z.object({
	device: z.string(),
	id: z.string(),
	type: SensorTypeSchema,
	name: z.string().optional(),
	comments: z.string().optional(),
	last_record: z.date().optional(),
});
export type Sensor = z.infer<typeof SensorSchema>;

export const MetricsSchema = z.object({
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
	tvoc: z
		.number()
		.optional()
		.describe("Total Volatile Organic Compounds (ppm)"),
	voltage: z.number().optional(),
	lvocs: z
		.number()
		.optional()
		.describe("Light Volatile Organic Compounds (ppb)"),
	pressure: z.number().optional().describe("Pressure (mb)"),
});
export type Metrics = z.infer<typeof MetricsSchema>;

export const MetricNameSchema = MetricsSchema.keyof();
export type MetricName = z.infer<typeof MetricNameSchema>;

export const ReadingSchema = MetricsSchema.extend({
	// PK
	device: z.string().describe("device id"),
	date: z.instanceof(LocalDate),
	// CK
	reading_type: z.string().describe("sensor type"),
	sensor_id: z.string(),
	processed: z.boolean().describe("whether applied corrections"),
	time: z.date(),
	// other fields
	ip_address: z.string().optional(),
	latitude: z.number().optional(),
	longitude: z.number().optional(),
});
export type Reading = z.infer<typeof ReadingSchema>;

export type MeasurementQuery<T extends MetricName> = {
	deviceId: string;
	date: Date;
	sensorId: string;
	sensorType: string;
	processed: boolean;
	startTime: Date;
	endTime: Date;
	metricName: T;
};

/**
 * Result type of the measurement query function.
 *
 * ```
 * const measurement: Measurement<"angle"> = {
 *    time: new Date("2024-09-10T05:31:42.022Z"),
 *    value: 10.5,
 *    angle: 10.5,
 * };
 * ```
 */
export type Measurement<T extends MetricName> = {
	time: Date;
	value: Metrics[T];
} & {
	[K in T]: Metrics[K];
};

export interface Correction {
	device: string;
	reading_type: string;
	metric: MetricName;
	expression: string;
}

export interface SensorMetadata {
	type: SensorType;
	metric_names: MetricName[];
}

export interface MetricMetadata {
	name: MetricName;
	display_name: string;
	unit?: string;
	is_bool: boolean;
}
