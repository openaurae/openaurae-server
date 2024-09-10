import * as cassandra from "cassandra-driver";
import {
	Corrections,
	Devices,
	MetricMetas,
	Readings,
	SensorMetas,
	Sensors,
	Users,
} from "database/tables";
import { cassandraHost, cassandraKeyspace } from "env";

export class Database {
	public readonly client: cassandra.Client;
	private readonly mapper: cassandra.mapping.Mapper;

	public readonly devices: Devices;
	public readonly sensors: Sensors;
	public readonly readings: Readings;
	public readonly users: Users;
	public readonly sensorMetas: SensorMetas;
	public readonly metricMetas: MetricMetas;
	public readonly corrections: Corrections;

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
				MetricMetadata: { tables: ["metric_metadata"] },
				SensorMetadata: { tables: ["sensor_metadata"] },
			},
		});
		this.users = new Users(this.mapper);
		this.sensors = new Sensors(this.mapper);
		this.devices = new Devices(this.mapper, this.users);
		this.readings = new Readings(this.mapper, this.devices, this.sensors);
		this.sensorMetas = new SensorMetas(this.mapper);
		this.metricMetas = new MetricMetas(this.mapper, this.sensorMetas);
		this.corrections = new Corrections(this.mapper, this.users);
	}

	public async connect(): Promise<void> {
		await this.client.connect();
	}

	public async shutdown(): Promise<void> {
		await this.client.shutdown();
	}
}

export const db = new Database(cassandraHost, cassandraKeyspace);
