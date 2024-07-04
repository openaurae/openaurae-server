import axios, { type AxiosInstance } from "axios";
import { types } from "cassandra-driver";
import { eachDayOfInterval, formatISO } from "date-fns";
import {
	type Device,
	type Reading,
	type Sensor,
	type SensorType,
	db,
	sensorTypes,
} from "../database";
import LocalDate = types.LocalDate;

/**
 * GraphQL API of the app deployed in an AWS EKS cluster.
 */
const api: AxiosInstance = axios.create({
	baseURL: "https://app.openaurae.org/api",
	timeout: 20_000,
});

type _Reading = Omit<Reading, "date" | "time"> & {
	date: string;
	time: string;
};

type QueryReadingsResult = {
	data: {
		readings: _Reading[];
	};
};

const queryReadings = async (
	deviceId: string,
	type: SensorType,
	date: string,
): Promise<Reading[]> => {
	const resp = await api.post<QueryReadingsResult>("/graphql", {
		operationName: null,
		variables: {},
		query: `{
  readings(device: "${deviceId}", processed: true, start: "${date}", end: "${date}", type: ${type}) {
    device
    date
    reading_type
    processed
    time
    action
    angle
    angle_x
    angle_x_absolute
    angle_y
    angle_y_absolute
    angle_z
    ch2o
    co2
    consumption
    contact
    humidity
    illuminance
    ip_address
    latitude
    longitude
    occupancy
    pd05
    pd10
    pd100
    pd100g
    pd25
    pd50
    pm1
    pm10
    pm25
    pmv10
    pmv100
    pmv25
    pmv_total
    power
    sensor_id
    state
    temperature
    tvoc
    voltage
  }
}
`,
	});
	return resp.data.data.readings.map((reading) => ({
		...reading,
		date: LocalDate.fromString(reading.date),
		time: new Date(reading.time),
	}));
};

type DeviceWithSensors = Device & { sensors: Sensor[] };

export type QueryDevicesResult = {
	data: {
		devices: DeviceWithSensors[];
	};
};

const queryDevices = async (): Promise<DeviceWithSensors[]> => {
	const resp = await api.post<QueryDevicesResult>("/graphql", {
		operationName: null,
		variables: {},
		query: `{
  devices {
    id
    name
    latitude
    longitude
    last_record
    sensors {
      device
      id
      type
      name
      comments
      last_record
    }
  }
}
`,
	});

	return resp.data.data.devices;
};

const migrateDeviceReadings = async (
	deviceId: string,
	start: string | Date,
	end: string | Date,
): Promise<void> => {
	const dates = eachDayOfInterval({ start, end })
		.reverse()
		.map((date) => formatISO(date, { representation: "date" }));

	for (const date of dates) {
		for (const type of sensorTypes) {
			const readings = await queryReadings(deviceId, type, date);

			for (const reading of readings) {
				if (!reading.sensor_id) {
					console.log(
						`new schema uses sensor_id as CK but this record doesn't have one: ${reading.device}, ${reading.reading_type}, ${reading.time}`,
					);
					continue;
				}

				// console.log(reading);
				await db.insertReading(reading);
			}
		}
	}
};

export const migrateDevices = async () => {
	const devices = await queryDevices();

	for (const device of devices) {
		await db.upsertDevice(device);

		for (const sensor of device.sensors) {
			await db.insertSensor(sensor);
		}
	}
};

export const migrateReadings = async (
	deviceIds: string[],
	start: string | Date,
	end: string | Date,
) => {
	for (const deviceId of deviceIds) {
		await migrateDeviceReadings(deviceId, start, end);
	}
	// await Promise.all(deviceIds.map(deviceId => migrateDeviceReadings(deviceId, start, end)))
};
