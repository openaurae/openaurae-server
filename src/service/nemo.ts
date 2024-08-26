import axios, { type AxiosInstance } from "axios";

export interface InitParams {
	url: string;
	operator: string;
	password: string;
	company: string;
}

type LoginParams = Omit<InitParams, "url">;

export interface MeasureSetQuery {
	// The device’s serial number as returned by the /devices/ endpoint
	deviceSerialNumber?: string;
	// The start time of the measureSet realize by the device, in seconds since the UnixEpoch
	start?: number;
	// The end time of the measureSet realize by the device, in seconds since the UnixEpoch
	end?: number;
}

export class NemoCloud {
	private readonly httpClient: AxiosInstance;
	private readonly loginParams: LoginParams;

	public constructor({ url, operator, password, company }: InitParams) {
		this.loginParams = { operator: operator, password, company };
		this.httpClient = axios.create({
			baseURL: `${url}/AirQualityAPI`,
			timeout: 120_000,
			headers: {
				"Accept-version": "v4",
			},
		});
	}

	public newSession(): NemoCloudSession {
		return new NemoCloudSession(this.httpClient, this.loginParams);
	}
}

export class NemoCloudSession {
	private readonly httpClient: AxiosInstance;
	private readonly loginParams: LoginParams;

	constructor(httpClient: AxiosInstance, loginParams: LoginParams) {
		this.httpClient = httpClient;
		this.loginParams = loginParams;
	}

	/**
	 * It's better to use a new session for each API call because the cloud server may restart in the middle of the task.
	 * In this case the cloud server invalidates all previous sessions so that all subsequent requests will fail.
	 *
	 * @private
	 */
	private async sessionId(): Promise<string> {
		return await this.login();
	}

	/**
	 * Must be called to access other API endpoints. Session expires after 30 min of inactivity.
	 *
	 * The session API endpoint require authentication. The authentication is performed using the HTPP Digest access scheme described in section authentication and security.
	 */
	public async login(): Promise<string> {
		const resp = await this.httpClient.post<{ sessionId: string }>(
			"/session/login",
			this.loginParams,
			{
				headers: {
					// got 401 if using MD5(A1:nonce:A2), but this default value works...
					Authorization:
						"Digest username=Test,realm=Authorized users of etheraApi,nonce=33e4dbaf2b2fd2c78769b436ffbe9d05,uri=/AirQualityAPI/session/login,response=b9e580f4f3b9d8ffd9205f58f5e18ee8,opaque=f8333b33f212bae4ba905cea2b4819e6",
				},
			},
		);

		return resp.data.sessionId;
	}

	/**
	 * List all devices.
	 *
	 * An operator with administrator right can view all devices.
	 */
	public async devices(): Promise<Device[]> {
		const resp = await this.httpClient.get<Device[]>("/devices/", {
			headers: {
				sessionId: await this.sessionId(),
			},
		});

		return resp.data;
	}

	/**
	 * Get information measure about a device, the name, the serial, the bid, the associated operator,
	 * the device's comment, the last campaign bid associated to the device, the last room bid associated to the device,
	 * the first measureSet, the last measureSet and the number of measureSet for a specific device.
	 *
	 * The values returned correspond to the data to which the operator is associated.
	 * @param deviceSerialNumber
	 */
	public async device(deviceSerialNumber: string): Promise<DetailedDevice> {
		const resp = await this.httpClient.get<DetailedDevice>(
			`/devices/${deviceSerialNumber}`,
			{
				headers: {
					sessionId: await this.sessionId(),
				},
			},
		);

		return resp.data;
	}

	/**
	 * Get a measureSet list by device. The values returned correspond to the data to which the operator is associated.
	 *
	 */
	public async measureSets(
		query: MeasureSetQuery,
	): Promise<DeviceMeasureSets[]> {
		const resp = await this.httpClient.get<DeviceMeasureSets[]>(
			"/measureSets/",
			{
				headers: {
					sessionId: await this.sessionId(),
				},
				params: query,
			},
		);

		return resp.status === 204 ? [] : resp.data;
	}

	/**
	 * Get the measures information associate to a measureSet BID. Get the BID of measure and associated variable
	 *
	 * @param measureSetBid The measureSet’s BID as returned by the returned by the /measureSets/ endpoint
	 */
	public async measures(measureSetBid: number): Promise<Measure[]> {
		const resp = await this.httpClient.get<Measure[]>(
			`/measureSets/${measureSetBid}/measures`,
			{
				headers: {
					sessionId: await this.sessionId(),
				},
			},
		);
		return resp.data;
	}

	/**
	 * Get the time and the values associate to a measure
	 *
	 * @param measureBid The measure’s bid as return by the /measureSets/{measureSetBid}/measures endpoint
	 */
	public async values(measureBid: number): Promise<Value[]> {
		const resp = await this.httpClient.get<Value[]>(
			`/measures/${measureBid}/values`,
			{
				headers: {
					sessionId: await this.sessionId(),
				},
			},
		);
		return resp.data || [];
	}

	public async sensor(measureSetBid: number): Promise<Sensor> {
		const resp = await this.httpClient.get<Sensor>(
			`/measureSets/${measureSetBid}/sensors`,
			{
				headers: {
					sessionId: await this.sessionId(),
				},
			},
		);
		return resp.data;
	}

	public async room(roomBid: number) {
		const resp = await this.httpClient.get<Room>(`/rooms/${roomBid}`, {
			headers: {
				sessionId: await this.sessionId(),
			},
		});

		return resp.data;
	}
}

export interface Device {
	// device’s bid
	bid: number;
	// device’s serial number
	serial: string;
	// device’s name
	name: string;
}

export interface DetailedDevice extends Device {
	roomBid: number;
	campaignBid: number;
	firstMeasureSet: number;
	lastMeasureSet: number;
	numberMeasureSet: number;
}

export interface DeviceMeasureSets {
	deviceSerialNumber: string;
	measureSets: MeasureSet[];
}

export interface MeasureSet {
	// The measureSet’s BID
	bid: number;
	// The start time of the measureSet realize by the device, in seconds since the UnixEpoch
	start: number;
	// The end time of the measureSet realize by the device, in seconds since the UnixEpoch
	end: number;
	// The number of variables present in the device (strictly positive integer)
	variablesNumber: number;
	// The number of values measured by the device for a variable
	valuesNumber: number;
	// The campaign’s name
	campaign: string;
	// The city’s name
	city: string;
	// The building’s name
	building: string;
	// The room’s name
	room: string;
	// The operator’s name
	operator: string;
}

export interface Measure {
	measureBid: number;
	variable: MeasureVariable;
}

export interface MeasureVariable {
	// Represent the variable for this specific measure
	structure: number;
	// Indicate on which electronic card the variable comes from [0, 14]
	source: number;
	// The unique id for a variable
	id?: string;
	// The variable’s name
	name?: string;
	// The unit of variable
	unit?: string;
}

export interface Value {
	/**
	 * The value's time of the measure associate to a device and a measureSet, in seconds since the UnixEpoch
	 */
	time: number;
	/**
	 * The calibrated value of measure associate to a device and a measureSet.
	 *
	 * Note: value may be `undefined` if value cannot be measured at the moment.
	 */
	value?: number;

	/**
	 * Error code of the measure
	 *
	 * * 0: OK
	 * * 1: Sudden change in humidity
	 * * 2: The sensor is too old
	 * * 3: Doubtful value
	 * * 4: The sensor has expired
	 * * 5: Value below the detection threshold
	 * * 6: Moisture is outside the specification thresholds
	 * * 7: Shifted value
	 * * 8: Incompatible sensor with device
	 */
	errorCode?: number;
}

export interface Sensor {
	// The sensor’s BID
	bid: number;
	// Sensor’s serial number
	serial: string;
	// The date of manufacture of sensor, in seconds since the UnixEpoch
	manufactureDate: number;
	// The date on which the sensor was first used, in seconds since the UnixEpoch
	firstUsedDate: number;
	// The sensor Type’s BID
	sensorTypeBID: number;
	// The exposition reference
	refExposition: string;
	// Number of times a sensor is exposed
	exposedNumber: number;
}

export interface Room {
	bid: number;
	name: string;
	buildingBid: number;
}
