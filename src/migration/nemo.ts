import { types } from "cassandra-driver";
import { type Reading, db } from "database";
import type {
	Measure,
	MeasureSet,
	NemoCloud,
	NemoCloudSession,
	Device as NemoDevice,
	Value,
} from "service/nemo";
import LocalDate = types.LocalDate;
import { chunks, retryUntilSuccess } from "utils";

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

export interface MigrateOpts {
	start?: Date;
	end?: Date;
	taskNum?: number;
}

export async function migrate(cloud: NemoCloud, opts?: MigrateOpts) {
	const { start, end, taskNum = 20 } = opts || {};

	const session = cloud.newSession();
	const allDevices = await retryUntilSuccess(() => session.devices());

	for (const devices of chunks(allDevices, taskNum)) {
		await Promise.all(
			devices
				.map(
					(device) =>
						new DeviceMigrationTask(cloud.newSession(), device, start, end),
				)
				.map((task) => task.migrate()),
		);
	}
}

class DeviceMigrationTask {
	private readonly session: NemoCloudSession;
	private readonly device: NemoDevice;
	private readonly start?: number;
	private readonly end?: number;

	public constructor(
		session: NemoCloudSession,
		device: NemoDevice,
		start?: Date,
		end?: Date,
	) {
		this.session = session;
		this.device = device;
		this.start = start ? start.getTime() / 1000 : undefined;
		this.end = end ? end.getTime() / 1000 : undefined;
	}

	public async migrate(): Promise<void> {
		await db.upsertDevice({
			id: this.device.serial,
			name: this.device.name,
			sensor_types: ["nemo_cloud"],
		});

		const deviceMeasureSets = await retryUntilSuccess(() =>
			this.session.measureSets({
				deviceSerialNumber: this.device.serial,
				start: this.start,
				end: this.end,
			}),
		);

		if (deviceMeasureSets.length === 0) {
			return;
		}

		// device serial num is specified so should have only one object for the device
		const [{ measureSets }] = deviceMeasureSets;

		for (const measureSet of measureSets) {
			await this.migrateMeasureSet(this.device.serial, measureSet);
		}
	}

	private async migrateMeasureSet(
		deviceSerialNum: string,
		measureSet: MeasureSet,
	): Promise<void> {
		const sensor = await retryUntilSuccess(() =>
			this.session.sensor(measureSet.bid),
		);

		await db.insertSensor({
			id: sensor.serial,
			device: deviceSerialNum,
			name: sensor.refExposition,
			type: "nemo_cloud",
		});

		const measures = await retryUntilSuccess(() =>
			this.session.measures(measureSet.bid),
		);

		for (const measure of measures) {
			await this.migrateMeasure(deviceSerialNum, sensor.serial, measure);
		}

		console.log(
			`finished device serial: ${deviceSerialNum}, measure set bid: ${measureSet.bid}`,
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

		if (!Object.hasOwn(columnMapping, name)) {
			throw Error(`column mapping not found for variable name: ${name}`);
		}

		const values = await retryUntilSuccess(() =>
			this.session.values(measure.measureBid),
		);

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
