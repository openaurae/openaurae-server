import { describe, expect, it } from "bun:test";
import { chunks } from "./utils.ts";

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
