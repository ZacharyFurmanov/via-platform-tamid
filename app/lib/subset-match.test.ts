import { test } from "node:test";
import assert from "node:assert/strict";
import { uniqueSubsetForTotal } from "./subset-match.ts";

// The real WVV case: belt $150 + Roberto Cavalli halter $195 = $345.
test("recovers the exact two-item order (belt + Cavalli = $345)", () => {
 const soldOut = [
 { title: "Christian Dior Brown Leather Belt Size S/M", price: 150 },
 { title: "Roberto Cavalli Halter Top Size XS/S", price: 195 },
 ];
 const out = uniqueSubsetForTotal(soldOut, 345);
 assert.ok(out);
 assert.equal(out!.length, 2);
 assert.deepEqual(out!.map((i) => i.price).sort((a, b) => a - b), [150, 195]);
});

test("matches a single sold-out item to its own total", () => {
 const out = uniqueSubsetForTotal([{ title: "A", price: 150 }, { title: "B", price: 195 }], 150);
 assert.ok(out);
 assert.equal(out!.length, 1);
 assert.equal(out![0].productName, "A");
});

test("returns null when no combination matches", () => {
 const out = uniqueSubsetForTotal([{ title: "A", price: 100 }, { title: "B", price: 120 }], 345);
 assert.equal(out, null);
});

test("returns null when the match is AMBIGUOUS (two subsets hit the total)", () => {
 // {100,50} and {150} both sum to 150 → ambiguous → refuse to guess.
 const items = [
 { title: "A", price: 100 },
 { title: "B", price: 50 },
 { title: "C", price: 150 },
 ];
 assert.equal(uniqueSubsetForTotal(items, 150), null);
});

test("respects the ±$1 tolerance (rounding / minor fees)", () => {
 const out = uniqueSubsetForTotal([{ title: "A", price: 149.5 }, { title: "B", price: 195 }], 150);
 assert.ok(out);
 assert.equal(out![0].productName, "A");
});

test("does not combine more than maxSize items", () => {
 // Four $25 items sum to 100, but maxSize=3 → no 4-item subset; nothing else hits 100.
 const items = [
 { title: "A", price: 25 },
 { title: "B", price: 25 },
 { title: "C", price: 25 },
 { title: "D", price: 25 },
 ];
 assert.equal(uniqueSubsetForTotal(items, 100, 3), null);
});

test("empty input yields null", () => {
 assert.equal(uniqueSubsetForTotal([], 345), null);
});
