import type { Auth0Variables } from "app/middleware/auth0";
import type { HonoEnv } from "app/types";
import type { Device, MetricName, Sensor } from "database/types";

export type DeviceVariables = Auth0Variables & {
	device: Device;
};

export type SensorVariables = DeviceVariables & {
	sensor: Sensor;
};

export type SensorMetricVariables = SensorVariables & {
	metricName: MetricName;
};

export type DeviceEnv = HonoEnv<DeviceVariables>;
export type DeviceSensorEnv = HonoEnv<SensorVariables>;
export type DeviceSensorMetricEnv = HonoEnv<SensorMetricVariables>;
