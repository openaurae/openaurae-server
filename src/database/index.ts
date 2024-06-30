import * as cassandra from "cassandra-driver";
import { cassandraHost, cassandraKeyspace } from "../env";
import type { Correction, Device, Reading, Sensor, User } from "./types";

type ModelMapper<T> = cassandra.mapping.ModelMapper<T>;
const q = cassandra.mapping.q;

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
		const mapper = new cassandra.mapping.Mapper(this.client, {
			models: {
				User: { tables: ["user"] },
				Device: { tables: ["device"] },
				Sensor: { tables: ["sensor"] },
				Reading: { tables: ["reading"] },
				Correction: { tables: ["correction"] },
			},
		});
		this.mapper = mapper;
		this.userMapper = mapper.forModel<User>("User");
		this.deviceMapper = mapper.forModel<Device>("Device");
		this.sensorMapper = mapper.forModel<Sensor>("Sensor");
		this.readingMapper = mapper.forModel<Reading>("Reading");
		this.correctionMapper = mapper.forModel<Correction>("Correction");
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
}

export const db = new Database(cassandraHost, cassandraKeyspace);