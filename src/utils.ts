import retry from "async-retry";
import { formatISO } from "date-fns";

export function chunks<T>(array: T[], size = 10): T[][] {
	if (array.length === 0) {
		return [];
	}

	const chunks: T[][] = [];

	for (let i = 0; i < array.length; i = Math.min(i + size, array.length)) {
		chunks.push(array.slice(i, i + size));
	}

	return chunks;
}

export async function retryUntilSuccess<T>(f: () => Promise<T>): Promise<T> {
	return retry(f, {
		forever: true,
		onRetry: (err) => {
			console.log(err);
		},
	});
}

export function formatISODate(date: Date): string {
	return formatISO(date, { representation: "date" });
}

export function fromSeconds(seconds: number): Date {
	return new Date(seconds * 1000);
}
