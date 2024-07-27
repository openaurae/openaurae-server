import { type SensorType, db } from "database";
import { eachDayOfInterval } from "date-fns";
import { AwsOpenAurae } from "service/aws.ts";
import { chunks, formatISODate, retryUntilSuccess } from "utils";

const sensorTypes: SensorType[] = [
	"ptqs1005",
	"pms5003st",
	"zigbee_temp",
	"zigbee_occupancy",
	"zigbee_contact",
	"zigbee_vibration",
	"zigbee_power",
];

export interface MigrateAWSOps {
	deviceIds?: string[];
	start: string | Date;
	end?: string | Date;
	taskNum?: number;
}

export class AwsMigration {
	private readonly api: AwsOpenAurae;

	public constructor() {
		this.api = new AwsOpenAurae();
	}

	public async migrateDevices() {
		const devices = await retryUntilSuccess(() => this.api.queryDevices());

		for (const { sensors, ...device } of devices) {
			await db.upsertDevice(device);

			for (const sensor of sensors) {
				await db.insertSensor(sensor);
			}
		}
	}

	public async migrateReadings({
		deviceIds,
		start,
		end = new Date(),
		taskNum = 20,
	}: MigrateAWSOps): Promise<void> {
		const dates = eachDayOfInterval({ start, end })
			.reverse()
			.map((date) => formatISODate(date));

		const targetDeviceIds =
			deviceIds || (await this.api.queryDevices()).map((device) => device.id);

		for (const deviceIds of chunks(targetDeviceIds, taskNum)) {
			await Promise.all(
				deviceIds.map((deviceId) =>
					this.migrateDeviceReadings(deviceId, dates),
				),
			);
		}
	}

	private async migrateDeviceReadings(deviceId: string, dates: string[]) {
		for (const date of dates) {
			await this.migrateDeviceReadingsOfDate(deviceId, date);
		}
	}

	private async migrateDeviceReadingsOfDate(deviceId: string, date: string) {
		for (const sensorType of sensorTypes) {
			for (const precessed of [true, false]) {
				const readings = await retryUntilSuccess(() =>
					this.api.queryReadings(deviceId, sensorType, date, precessed),
				);

				for (const reading of readings) {
					await db.insertReading(reading);
				}
			}
		}
		console.log(
			`[AWS migration] finished ${JSON.stringify({ deviceId, date })}`,
		);
	}
}
