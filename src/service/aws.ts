import axios, { type AxiosInstance } from "axios";
import { types } from "cassandra-driver";
import type { Device, Reading, Sensor } from "database/types";
import LocalDate = types.LocalDate;

type _Reading = Omit<Reading, "date" | "time"> & {
	date: string;
	time: string;
};

type QueryReadingsResult = {
	data: {
		readings: _Reading[];
	};
};

type DeviceWithSensors = Device & { sensors: Sensor[] };

export type QueryDevicesResult = {
	data: {
		devices: DeviceWithSensors[];
	};
};

/**
 * Query device and readings using GraphQL API of the app deployed in an AWS EKS cluster.
 */
export class AwsOpenAurae {
	private readonly api: AxiosInstance;

	public constructor() {
		this.api = axios.create({
			baseURL: "https://app.openaurae.org/api",
			timeout: 120_000,
		});
	}

	public async queryReadings(
		deviceId: string,
		type: string,
		date: string,
		processed = true,
	): Promise<Reading[]> {
		const resp = await this.api.post<QueryReadingsResult>("/graphql", {
			operationName: null,
			variables: {},
			query: `{
  readings(device: "${deviceId}", processed: ${processed}, start: "${date}", end: "${date}", type: ${type}) {
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
	}

	async queryDevices(): Promise<DeviceWithSensors[]> {
		const resp = await this.api.post<QueryDevicesResult>("/graphql", {
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
	}
}
