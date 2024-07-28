import { mapping } from "cassandra-driver";
import type {
	Correction,
	Device,
	Mapper,
	Measure,
	MeasureMetadata,
	Measures,
	ModelMapper,
	Reading,
	Sensor,
	SensorKey,
	SensorType,
	User,
} from "./types";

export const q = mapping.q;

export class Sensors {
	private readonly sensorMapper: ModelMapper<Sensor>;

	public constructor(mapper: Mapper) {
		this.sensorMapper = mapper.forModel("Sensor");
	}

	public async getByKey(key: SensorKey): Promise<Sensor | null> {
		return await this.sensorMapper.get(key);
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

	public async updateLastRecord(key: SensorKey, time: Date) {
		const sensor = await this.getByKey(key);

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
			{
				device: reading.device,
				id: reading.sensor_id,
				type: reading.reading_type,
			},
			reading.time,
		);
	}

	public async getByKey(deviceId: string, date: Date): Promise<Reading[]> {
		const result = await this.readingMapper.find({
			device: deviceId,
			date,
		});
		return result.toArray();
	}

	public async getMeasuresByKey<T extends keyof Measures>(
		name: T,
		{ deviceId, date, sensorType, sensorId, processed }: ReadingKey,
	): Promise<Measure<T>[]> {
		const result = await this.readingMapper.find(
			{
				device: deviceId,
				date: date,
				reading_type: sensorType,
				sensor_id: sensorId,
				processed,
			},
			{
				fields: ["time", name],
				orderBy: {
					reading_type: "asc",
					sensor_id: "asc",
					processed: "asc",
					time: "desc",
				},
			},
		);
		return result.toArray();
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

export class MeasureMetas {
	private readonly metadataMapper: ModelMapper<MeasureMetadata>;
	private readonly sensorTypes: SensorTypes;

	public constructor(mapper: Mapper, sensorTypes: SensorTypes) {
		this.metadataMapper = mapper.forModel("MeasureMetadata");
		this.sensorTypes = sensorTypes;
	}

	public async all(): Promise<MeasureMetadata[]> {
		const result = await this.metadataMapper.findAll();
		return result.toArray();
	}

	public async getByIds(ids: string[]): Promise<MeasureMetadata[]> {
		const result = await this.metadataMapper.find({
			id: q.in_(ids),
		});
		return result.toArray();
	}

	public async getBySensorType(type: string): Promise<MeasureMetadata[]> {
		const sensorType = await this.sensorTypes.getById(type);

		if (!sensorType) {
			return [];
		}
		return await this.getByIds(sensorType.measures);
	}

	public async exists(id: string): Promise<boolean> {
		const result = await this.metadataMapper.get({ id });
		return result != null;
	}
}

export class SensorTypes {
	private readonly sensorTypeMapper: ModelMapper<SensorType>;

	public constructor(mapper: Mapper) {
		this.sensorTypeMapper = mapper.forModel("SensorType");
	}

	public async all(): Promise<SensorType[]> {
		const result = await this.sensorTypeMapper.findAll();
		return result.toArray();
	}

	public async getById(id: string): Promise<SensorType | null> {
		return await this.sensorTypeMapper.get({ id });
	}

	public async getByIds(ids: string[]): Promise<SensorType[]> {
		const result = await this.sensorTypeMapper.find({ id: q.in_(ids) });
		return result.toArray();
	}

	public async exists(id: string): Promise<boolean> {
		const result = await this.sensorTypeMapper.get({ id });
		return result != null;
	}
}
