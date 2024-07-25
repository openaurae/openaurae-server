import { types } from "cassandra-driver";
import { type Reading, db } from "database";
import type {
	Measure,
	MeasureSet,
	NemoCloud,
	Device as NemoDevice,
	Value,
} from "service/nemo";
import LocalDate = types.LocalDate;
import { chunks } from "utils";

// bun run src/migration/nemo.ts
const columnMapping: Record<string, keyof Reading> = {
	Temperature: "temperature",
	Humidity: "humidity", // relate humidity (Rh%),
	Pressure: "pressure",
	"Carbon dioxide": "co2",
	"Light Volatile Organic Compounds": "lvocs",
	"Particulate matter 1": "pm1",
	"Particulate matter 2.5": "pm25",
	"Particulate matter 4": "pm4",
	"Particulate matter 10": "pm10",
	Formaldehyde: "ch2o",
	Battery: "battery",
};

export class Migration {
	private readonly cloud: NemoCloud;

	public constructor(cloud: NemoCloud) {
		this.cloud = cloud;
	}

	public async migrate(): Promise<void> {
		const session = this.cloud.newSession();
		const allDevices = await session.devices();

		for (const devices of chunks(allDevices, 10)) {
			await Promise.all(
				devices.map(async (device) => this.migrateDevice(device)),
			);
		}
	}

	private async migrateDevice(device: NemoDevice): Promise<void> {
		await db.upsertDevice({
			id: device.serial,
			name: device.name,
			sensor_types: ["nemo_cloud"],
		});

		const session = this.cloud.newSession();

		const [{ measureSets }] = await session.measureSets(device.serial);

		for (const measureSet of measureSets) {
			await this.migrateMeasureSet(device.serial, measureSet);
		}
	}

	private async migrateMeasureSet(
		deviceSerialNum: string,
		measureSet: MeasureSet,
	): Promise<void> {
		const session = this.cloud.newSession();
		const sensor = await session.sensor(measureSet.bid);

		console.log(
			`device serial: ${deviceSerialNum}, measure set bid: ${measureSet.bid}`,
		);

		await db.insertSensor({
			id: sensor.serial,
			device: deviceSerialNum,
			name: sensor.refExposition,
			type: "nemo_cloud",
		});

		const measures = await session.measures(measureSet.bid);

		await Promise.all(
			measures.map((measure) =>
				this.migrateMeasure(deviceSerialNum, sensor.serial, measure),
			),
		);
	}

	private async migrateMeasure(
		deviceSerialNum: string,
		sensorSerialNum: string,
		measure: Measure,
	): Promise<void> {
		const { name } = measure.variable;

		if (!name) {
			return;
		}

		const session = this.cloud.newSession();
		const values = await session.values(measure.measureBid);

		for (const value of values) {
			await this.migrateMeasureValue(
				deviceSerialNum,
				sensorSerialNum,
				columnMapping[name],
				value,
			);
		}
	}

	private async migrateMeasureValue(
		deviceSerialNum: string,
		sensorSerialNum: string,
		col: keyof Reading,
		{ time, value }: Value,
	): Promise<void> {
		if (!value) {
			return;
		}

		const date = new Date(time * 1000);

		const reading: Reading = {
			device: deviceSerialNum,
			date: LocalDate.fromDate(date),
			time: date,
			reading_type: "nemo_cloud",
			processed: true,
			sensor_id: sensorSerialNum,
		};
		reading[col] = value;
		await db.insertReading(reading);
	}
}
