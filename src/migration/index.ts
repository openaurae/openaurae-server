import { endOfToday, startOfYesterday } from "date-fns";
import { AwsMigration, type MigrateAWSOps } from "migration/aws";
import { type MigrateNemoOpts, migrate as migrateNemo } from "migration/nemo";
import { NemoCloud } from "service/nemo";

const awsAurae = new AwsMigration();

const nemo = new NemoCloud({
	url: Bun.env.NEMO_URL,
	company: Bun.env.NEMO_COMPANY,
	operator: Bun.env.NEMO_OPERATOR,
	password: Bun.env.NEMO_PASSWORD,
});

const nemoS5 = new NemoCloud({
	url: Bun.env.NEMO_S5_URL,
	company: Bun.env.NEMO_S5_COMPANY,
	operator: Bun.env.NEMO_S5_OPERATOR,
	password: Bun.env.NEMO_S5_PASSWORD,
});

export async function migrateAWSDevices() {
	await awsAurae.migrateDevices();
}

export async function migrateAWSReadings(opts: MigrateAWSOps) {
	await awsAurae.migrateReadings(opts);
}

export async function migrateAWSReadingsFromYesterday(deviceIds?: string[]) {
	await migrateAWSReadings({
		deviceIds,
		start: startOfYesterday(),
		end: endOfToday(),
		taskNum: 20,
	});
}

export async function migrateNemoReadings(opts?: MigrateNemoOpts) {
	for (const cloud of [nemo, nemoS5]) {
		await migrateNemo(cloud, opts);
	}
}

export async function migrateNemoReadingsFromYesterday() {
	await migrateNemoReadings({
		start: startOfYesterday(),
	});
}

export async function migrateReadingsFromYesterday() {
	await migrateAWSReadingsFromYesterday();
	await migrateNemoReadingsFromYesterday();
}
