import { mapping } from "cassandra-driver";
import type {
	Correction,
	Device,
	Mapper,
	Measurement,
	MeasurementQuery,
	MetricMetadata,
	MetricName,
	ModelMapper,
	Reading,
	Sensor,
	SensorMetadata,
	SensorType,
	User,
} from "./types";

export const q = mapping.q;

export class Sensors {
	private readonly sensorMapper: ModelMapper<Sensor>;

	public constructor(mapper: Mapper) {
		this.sensorMapper = mapper.forModel("Sensor");
	}

	public async getById(
		deviceId: string,
		sensorId: string,
	): Promise<Sensor | null> {
		return await this.sensorMapper.get({
			device: deviceId,
			id: sensorId,
		});
	}

	public async getByDeviceId(deviceId: string): Promise<Sensor[]> {
		const result = await this.sensorMapper.find({
			device: deviceId,
		});
		return result.toArray();
	}

	public async upsert(sensor: Sensor): Promise<void> {
		await this.sensorMapper.insert(sensor);
	}

	public async updateLastRecord(
		deviceId: string,
		sensorId: string,
		time: Date,
	) {
		const sensor = await this.getById(deviceId, sensorId);

		if (!sensor || (sensor.last_record && sensor.last_record >= time)) {
			return;
		}

		await this.sensorMapper.update(
			{
				...sensor,
				last_record: time,
			},
			{
				fields: ["id", "device", "type", "last_record"],
				ifExists: true,
			},
		);
	}

	public async deleteById(deviceId: string, sensorId: string): Promise<void> {
		await this.sensorMapper.remove({
			device: deviceId,
			id: sensorId,
		});
	}
}

export class Devices {
	private readonly deviceMapper: ModelMapper<Device>;
	private readonly users: Users;

	public constructor(mapper: Mapper, users: Users) {
		this.deviceMapper = mapper.forModel("Device");
		this.users = users;
	}

	public async all(): Promise<Device[]> {
		const result = await this.deviceMapper.findAll();
		return result.toArray();
	}

	public async getById(id: string): Promise<Device | null> {
		return await this.deviceMapper.get({ id });
	}

	public async getByUserId(userId: string): Promise<Device[]> {
		const user = await this.users.getById(userId);
		return this.getByIds(user.devices);
	}

	public async getByIds(ids: string[]): Promise<Device[]> {
		const result = await this.deviceMapper.find({
			id: q.in_(ids),
		});
		return result.toArray();
	}

	public async exists(id: string): Promise<boolean> {
		const device = await this.getById(id);
		return device != null;
	}

	public async upsert(device: Device): Promise<void> {
		await this.deviceMapper.insert(device);
	}

	public async updateLastRecord(id: string, time: Date) {
		const device = await this.getById(id);

		if (!device || (device.last_record && device.last_record >= time)) {
			return;
		}

		await this.deviceMapper.update(
			{
				id: device.id,
				last_record: time,
			},
			{
				fields: ["id", "last_record"],
				ifExists: true,
			},
		);
	}

	public async deleteById(id: string): Promise<void> {
		await this.deviceMapper.remove({ id });
	}
}

export interface ReadingKey {
	deviceId: string;
	date: Date;
	sensorType: string;
	sensorId: string;
	processed?: boolean;
}

export class Readings {
	private readonly devices: Devices;
	private readonly sensors: Sensors;
	private readonly readingMapper: ModelMapper<Reading>;

	public constructor(mapper: Mapper, devices: Devices, sensors: Sensors) {
		this.devices = devices;
		this.sensors = sensors;
		this.readingMapper = mapper.forModel("Reading");
	}

	public async upsert(reading: Reading): Promise<void> {
		await this.readingMapper.insert(reading);
		await this.devices.updateLastRecord(reading.device, reading.time);
		await this.sensors.updateLastRecord(
			reading.device,
			reading.sensor_id,
			reading.time,
		);
	}

	public async getByIdAndDate(
		deviceId: string,
		date: Date,
	): Promise<Reading[]> {
		const result = await this.readingMapper.find({
			device: deviceId,
			date,
		});
		return result.toArray();
	}

	/**
	 * Get readings of a specific measurement type within a specific time range of a date.
	 *
	 * @see [Mapper queries](https://docs.datastax.com/en/developer/nodejs-driver/4.7/features/mapper/queries/index.html)
	 */
	public async getMetrics<T extends MetricName>({
		deviceId,
		date,
		sensorType,
		sensorId,
		processed,
		startTime,
		endTime,
		metricName,
	}: MeasurementQuery<T>): Promise<Measurement<T>[]> {
		const result = await this.readingMapper.find(
			{
				device: deviceId,
				date,
				reading_type: sensorType,
				sensor_id: sensorId,
				processed,
				time: q.and(q.gte(startTime), q.lte(endTime)),
			},
			{
				fields: ["time", metricName],
			},
		);

		return result
			.toArray()
			.map((reading) => ({
				...reading,
				value: reading[metricName],
			}))
			.filter(({ value }) => value !== null);
	}
}

export class Users {
	private readonly userMapper: ModelMapper<User>;

	public constructor(mapper: Mapper) {
		this.userMapper = mapper.forModel("User");
	}

	public async getById(id: string): Promise<User> {
		let user = await this.userMapper.get({ id });

		if (user) {
			return user;
		}

		user = { id, devices: [] };
		await this.upsert(user);
		return user;
	}

	public async upsert(user: User): Promise<void> {
		await this.userMapper.insert(user);
	}

	public async addDevice(userId: string, deviceId: string): Promise<void> {
		const user = await this.getById(userId);
		user.devices.push(deviceId);

		await this.upsert(user);
	}
}

export class Corrections {
	private readonly correctionMapper: ModelMapper<Correction>;
	private readonly users: Users;

	public constructor(mapper: Mapper, users: Users) {
		this.correctionMapper = mapper.forModel("Correction");
		this.users = users;
	}

	public async all(): Promise<Correction[]> {
		const result = await this.correctionMapper.findAll();
		return result.toArray();
	}

	public async getByDeviceId(id: string): Promise<Correction[]> {
		const result = await this.correctionMapper.find({
			device: id,
		});
		return result.toArray();
	}

	public async getByDeviceIds(ids: string[]): Promise<Correction[]> {
		const result = await this.correctionMapper.find({
			device: q.in_(ids),
		});
		return result.toArray();
	}

	public async getByUserId(userId: string): Promise<Correction[]> {
		const user = await this.users.getById(userId);

		return await this.getByDeviceIds(user.devices);
	}
}

export class MetricMetas {
	private readonly metadataMapper: ModelMapper<MetricMetadata>;
	private readonly sensorMetas: SensorMetas;

	public constructor(mapper: Mapper, sensorMetas: SensorMetas) {
		this.metadataMapper = mapper.forModel("MetricMetadata");
		this.sensorMetas = sensorMetas;
	}

	public async all(): Promise<MetricMetadata[]> {
		const result = await this.metadataMapper.findAll();
		return result.toArray();
	}

	public async getByName(name: string): Promise<MetricMetadata | null> {
		return await this.metadataMapper.get({
			name,
		});
	}

	public async getByNames(names: string[]): Promise<MetricMetadata[]> {
		const result = await this.metadataMapper.find({
			name: q.in_(names),
		});
		return result.toArray();
	}

	public async getBySensorType(type: string): Promise<MetricMetadata[]> {
		const sensorType = await this.sensorMetas.getByType(type);

		if (!sensorType) {
			return [];
		}
		return await this.getByNames(sensorType.metric_names);
	}

	public async exists(id: string): Promise<boolean> {
		const result = await this.metadataMapper.get({ id });
		return result != null;
	}
}

export class SensorMetas {
	private readonly sensorTypeMapper: ModelMapper<SensorMetadata>;

	public constructor(mapper: Mapper) {
		this.sensorTypeMapper = mapper.forModel("SensorMetadata");
	}

	public async all(): Promise<SensorMetadata[]> {
		const result = await this.sensorTypeMapper.findAll();
		return result.toArray();
	}

	public async metricNamesByType(): Promise<Map<SensorType, MetricName[]>> {
		const map = new Map<SensorType, MetricName[]>();

		for (const { type, metric_names } of await this.all()) {
			map.set(type, metric_names);
		}

		return map;
	}

	public async getByType(type: string): Promise<SensorMetadata | null> {
		return await this.sensorTypeMapper.get({ type });
	}

	public async exists(type: string): Promise<boolean> {
		const result = await this.sensorTypeMapper.get({ id: type });
		return result !== null;
	}
}
