import { test } from "node:test";
import assert from "node:assert/strict";
import { gateSegment, gateSegments, type RawSegment } from "./privacy.ts";

const base: RawSegment = {
 segmentType: "brand", segmentValue: "Cavalli",
 demandIndex: 82, demandTrend: "rising", supplyGapScore: 70,
 sellThroughPct: 25, priceP25: 40, priceMedian: 80, priceP75: 120,
 activeSupply: 50, storeCount: 7, txnCount: 9,
};
const P = { minStores: 5, minTransactions: 5 } as const;

test("hides a segment built from too few stores", () => {
 assert.equal(gateSegment({ ...base, storeCount: 4 }, P), null);
 assert.equal(gateSegment({ ...base, storeCount: 1 }, P), null);
});

test("blanks price + sell-through below the transaction floor, keeps demand", () => {
 const g = gateSegment({ ...base, storeCount: 6, txnCount: 3 }, P);
 assert.ok(g);
 assert.equal(g.demandIndex, 82); // engagement signal still shown
 assert.equal(g.supplyGapScore, 70);
 assert.equal(g.hasPriceData, false);
 assert.equal(g.priceMedian, null);
 assert.equal(g.sellThroughPct, null);
});

test("shows everything when both floors are met", () => {
 const g = gateSegment(base, P);
 assert.ok(g);
 assert.equal(g.hasPriceData, true);
 assert.equal(g.priceMedian, 80);
 assert.equal(g.sellThroughPct, 25);
 assert.equal(g.storeCount, 7);
});

test("never leaks txnCount into the seller-facing shape", () => {
 const g = gateSegment(base, P)!;
 assert.equal((g as Record<string, unknown>).txnCount, undefined);
});

test("gateSegments drops all hidden segments", () => {
 const rows = [base, { ...base, segmentValue: "Tiny", storeCount: 2 }, { ...base, segmentValue: "Mid", txnCount: 1 }];
 const out = gateSegments(rows, P);
 assert.equal(out.length, 2); // 'Tiny' hidden; 'Cavalli' + 'Mid' kept
 assert.deepEqual(out.map((s) => s.segmentValue).sort(), ["Cavalli", "Mid"]);
 assert.equal(out.find((s) => s.segmentValue === "Mid")!.priceMedian, null);
});
