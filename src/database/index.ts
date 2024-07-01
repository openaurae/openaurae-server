import * as cassandra from "cassandra-driver";
import { cassandraHost, cassandraKeyspace } from "../env";
import type {
	Correction,
	Device,
	Reading,
	Sensor,
	SensorType,
	User,
} from "./types";

type ModelMapper<T> = cassandra.mapping.ModelMapper<T>;
const q = cassandra.mapping.q;
const MIN_DATE = new Date(0);

export class Database {
	private readonly client: cassandra.Client;
	private readonly mapper: cassandra.mapping.Mapper;
	private readonly userMapper: ModelMapper<User>;
	private readonly deviceMapper: ModelMapper<Device>;
	private readonly sensorMapper: ModelMapper<Sensor>;
	private readonly readingMapper: ModelMapper<Reading>;
	private readonly correctionMapper: ModelMapper<Correction>;

	constructor(host: string, keyspace: string) {
		this.client = new cassandra.Client({
			contactPoints: [host],
			localDataCenter: "datacenter1",
			keyspace: keyspace,
		});
		this.mapper = new cassandra.mapping.Mapper(this.client, {
			models: {
				User: { tables: ["user"] },
				Device: { tables: ["device"] },
				Sensor: { tables: ["sensor"] },
				Reading: { tables: ["reading"] },
				Correction: { tables: ["correction"] },
			},
		});
		this.userMapper = this.mapper.forModel<User>("User");
		this.deviceMapper = this.mapper.forModel<Device>("Device");
		this.sensorMapper = this.mapper.forModel<Sensor>("Sensor");
		this.readingMapper = this.mapper.forModel<Reading>("Reading");
		this.correctionMapper = this.mapper.forModel<Correction>("Correction");
	}

	async connect(): Promise<void> {
		await this.client.connect();
	}

	async shutdown(): Promise<void> {
		await this.client.shutdown();
	}

	async getUser(userId: string): Promise<User | null> {
		return await this.userMapper.get({ id: userId });
	}

	async upsertDevice(device: Device): Promise<void> {
		await this.deviceMapper.insert(device);
	}

	async allDevices(): Promise<Device[]> {
		const result = await this.deviceMapper.findAll();
		return result.toArray();
	}

	async userDevices(userId: string): Promise<Device[]> {
		const deviceIds = await this.userDeviceIds(userId);

		if (!deviceIds) {
			return [];
		}

		const result = await this.deviceMapper.find({
			id: q.in_(deviceIds),
		});
		return result.toArray();
	}

	async getDeviceById(deviceId: string): Promise<Device | null> {
		return await this.deviceMapper.get({ id: deviceId });
	}

	async userDeviceIds(userId: string): Promise<string[]> {
		const user = await this.getUser(userId);
		return user?.devices ?? [];
	}

	async getSensor(
		device: string,
		type: SensorType,
		sensorId: string,
	): Promise<Sensor | null> {
		return await this.sensorMapper.get({
			device,
			type,
			id: sensorId,
		});
	}

	async deviceSensors(deviceId: string): Promise<Sensor[]> {
		const result = await this.sensorMapper.find({
			device: deviceId,
		});
		return result.toArray();
	}

	async sensorMetrics({
		deviceId,
		date,
		processed,
		sensorId,
		metric,
		sensorType,
		limit,
		order,
	}: SensorMetricsProps): Promise<Reading[]> {
		const asc = order === "asc";

		const result = await this.readingMapper.find(
			{
				device: deviceId,
				date: date,
				reading_type: sensorType,
				sensor_id: sensorId,
				processed,
			},
			{
				fields: ["time", metric],
				orderBy: {
					reading_type: "asc",
					sensor_id: "asc",
					processed: "asc",
					time: "desc",
				},
				limit: asc ? undefined : limit,
			},
		);
		const metrics = result.toArray().reverse();
		return asc ? metrics.slice(0, limit) : metrics;
	}

	async insertSensor(sensor: Sensor): Promise<void> {
		await this.sensorMapper.insert(sensor);
		await this.addDeviceSensorType(sensor.device, sensor.type);
	}

	/**
	 * Insert a reading record, update `last_record` of related device and sensor
	 * if needed.
	 *
	 * @param reading
	 * @see https://docs.datastax.com/en/cql-oss/3.3/cql/cql_reference/cqlUpdate.html
	 */
	async insertReading(reading: Reading): Promise<void> {
		await this.readingMapper.insert(reading);

		const device = await this.getDeviceById(reading.device);
		const deviceLastUpdate = device?.last_record ?? MIN_DATE;

		// update device.last_record if is null or < reading time
		// not using CQL because OR statements are not supported
		// (update ... if exists and (last_record is null or last_record < ?))
		if (device && deviceLastUpdate < reading.time) {
			await this.deviceMapper.update(
				{
					id: device.id,
					last_record: reading.time,
				},
				{
					fields: ["id", "last_record"],
				},
			);
		}

		const sensor = await this.getSensor(
			reading.device,
			reading.reading_type,
			reading.sensor_id,
		);
		const sensorLastUpdate = sensor?.last_record ?? MIN_DATE;

		if (sensor && sensorLastUpdate < reading.time) {
			await this.sensorMapper.update(
				{ ...sensor, last_record: reading.time },
				{
					fields: ["device", "type", "id", "last_record"],
				},
			);
		}
	}

	async deviceReadings(deviceId: string, date: Date): Promise<Reading[]> {
		const result = await this.readingMapper.find({
			device: deviceId,
			date,
		});
		return result.toArray();
	}

	/**
	 * Add target sensor type to the device record.
	 *
	 * @param deviceId device id
	 * @param sensorType sensor type
	 * @private
	 * @see https://docs.datastax.com/en/cql-oss/3.3/cql/cql_reference/cqlUpdate.html#Updatingaset
	 */
	private async addDeviceSensorType(
		deviceId: string,
		sensorType: SensorType,
	): Promise<void> {
		const cqlUpdateSensorType =
			"UPDATE device SET sensor_types = sensor_types + ? WHERE id = ? IF EXISTS;";

		await this.client.execute(cqlUpdateSensorType, [[sensorType], deviceId], {
			prepare: true,
		});
	}
}

export interface SensorMetricsProps {
	deviceId: string;
	sensorId: string;
	sensorType: SensorType;
	metric: string;
	processed: boolean;
	limit?: number;
	date: Date;
	order: "asc" | "desc";
}

export const db = new Database(cassandraHost, cassandraKeyspace);
export type {
	Correction,
	Device,
	Reading,
	Sensor,
	User,
	SensorType,
	MetricName,
	Metric,
	Metrics,
} from "./types";

export { SensorTypeParser, sensorTypes } from "./types";
