import { describe, expect, it } from "bun:test";
import { chunks, formatISODate } from "utils";

// bun test src/utils.test.ts
describe("test chunks", () => {
	it("should handle normal case", () => {
		const result = chunks([1, 2, 3, 4], 2);
		expect(result).toEqual([
			[1, 2],
			[3, 4],
		]);
	});

	it("should handle large size", () => {
		const result = chunks([1, 2, 3], 10);
		expect(result).toEqual([[1, 2, 3]]);
	});

	it("should handle tails", () => {
		const result = chunks([1, 2, 3, 4, 5], 2);
		expect(result).toEqual([[1, 2], [3, 4], [5]]);
	});

	it("should handle empty array", () => {
		const result = chunks([], 2);
		expect(result).toEqual([]);
	});
});

describe("test format ISO date", () => {
	it("should format Date to date string", () => {
		const date = new Date("2024-07-27T07:36:57.604Z");
		const result = formatISODate(date);

		expect(result).toEqual("2024-07-27");
	});
});
