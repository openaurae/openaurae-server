import axios, { type AxiosInstance } from "axios";
import { addMinutes } from "date-fns";

export interface InitParams {
	url: string;
	operator: string;
	password: string;
	company: string;
}

type LoginParams = Omit<InitParams, "url">;

export class NemoCloud {
	private readonly httpClient: AxiosInstance;
	private readonly loginParams: LoginParams;

	public constructor({ url, operator, password, company }: InitParams) {
		this.loginParams = { operator: operator, password, company };
		this.httpClient = axios.create({
			baseURL: `${url}/AirQualityAPI`,
			timeout: 30_000,
			headers: {
				"Accept-version": "v4",
			},
		});
	}

	public newSession(): NemoCloudSession {
		return new NemoCloudSession(this.httpClient, this.loginParams);
	}
}

class NemoCloudSession {
	private readonly httpClient: AxiosInstance;
	private readonly loginParams: LoginParams;
	private id = "";
	private expiresAt: Date = new Date(0);

	constructor(httpClient: AxiosInstance, loginParams: LoginParams) {
		this.httpClient = httpClient;
		this.loginParams = loginParams;
	}

	private async sessionId(): Promise<string> {
		if (new Date() >= this.expiresAt) {
			await this.login();
		}
		return this.id;
	}

	/**
	 * Must be called to access other API endpoints. Session expires after 30 min of inactivity.
	 *
	 * The session API endpoint require authentication. The authentication is performed using the HTPP Digest access scheme described in section authentication and security.
	 * @private
	 */
	private async login(): Promise<void> {
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

		this.id = resp.data.sessionId;
		this.expiresAt = addMinutes(new Date(), 25);
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
	 * Get a measureSet list by device. The values returned correspond to the data to which the operator is associated.
	 *
	 * @param deviceSerialNumber The device’s serial number as returned by the /devices/ endpoint
	 */
	public async measureSets(
		deviceSerialNumber?: string,
	): Promise<DeviceMeasureSets[]> {
		const resp = await this.httpClient.get<DeviceMeasureSets[]>(
			"/measureSets/",
			{
				headers: {
					sessionId: await this.sessionId(),
				},
				params: {
					deviceSerialNumber,
				},
			},
		);
		return resp.data;
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
}

export interface Device {
	// device’s bid
	bid: number;
	// device’s serial number
	serial: string;
	// device’s name
	name: string;
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
