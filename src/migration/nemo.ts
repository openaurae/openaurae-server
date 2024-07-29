import { types } from "cassandra-driver";
import { db } from "database";
import type {
	Measure,
	MeasureSet,
	NemoCloud,
	NemoCloudTask,
	Device as NemoDevice,
	Value,
} from "service/nemo";
import LocalDate = types.LocalDate;
import type { Reading } from "database/types";
import { chunks, fromSeconds, retryUntilSuccess } from "utils";

const columnMapping: Record<string, NemoMeasures> = {
	Battery: "battery",
	Formaldehyde: "ch2o",
	Temperature: "temperature",
	Humidity: "humidity", // relative humidity (Rh%),
	Pressure: "pressure",
	"Carbon dioxide": "co2",
	"Light Volatile Organic Compounds": "lvocs",
	"Particulate matter 1": "pm1",
	"Particulate matter 2.5": "pm25",
	"Particulate matter 4": "pm4",
	"Particulate matter 10": "pm10",
};

type NemoMeasures =
	| "battery"
	| "ch2o"
	| "co2"
	| "temperature"
	| "humidity"
	| "pressure"
	| "lvocs"
	| "pm1"
	| "pm25"
	| "pm4"
	| "pm10";

export interface MigrateNemoOpts {
	deviceSerialNums?: string[];
	start?: Date;
	end?: Date;
	taskNum?: number;
}

export async function migrate(cloud: NemoCloud, opts?: MigrateNemoOpts) {
	const { deviceSerialNums, start, end, taskNum = 20 } = opts || {};

	const session = cloud.newTask();
	let targetDevices = await retryUntilSuccess(() => session.devices());

	if (deviceSerialNums) {
		targetDevices = targetDevices.filter((device) =>
			deviceSerialNums.includes(device.serial),
		);
	}

	for (const devices of chunks(targetDevices, taskNum)) {
		const tasks = devices.map(
			(device) => new DeviceMigrationTask(cloud.newTask(), device, start, end),
		);
		await Promise.all(tasks.map((task) => task.migrate()));
	}
}

class DeviceMigrationTask {
	private readonly session: NemoCloudTask;
	private readonly device: NemoDevice;
	private readonly start?: number;
	private readonly end?: number;

	public constructor(
		session: NemoCloudTask,
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
		await db.devices.upsert({
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

		await db.sensors.upsert({
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
			`[Nemo migration] finished ${JSON.stringify({
				deviceSerialNum,
				measureSetBid: measureSet.bid,
				valuesNumber: measureSet.valuesNumber,
				start: fromSeconds(measureSet.start).toISOString(),
				end: fromSeconds(measureSet.end).toISOString(),
			})}`,
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
		col: NemoMeasures,
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
		await db.readings.upsert(reading);
	}
}
