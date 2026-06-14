import { test } from "node:test";
import assert from "node:assert/strict";
import { extractFitLetterFromDescription, extractSizeFromDescription } from "./shopifyClient.ts";

// Regression: a letter size must not match the first letter of a following word.
// Vintage shoe listings say "Size: Marked 36" — this used to return "M" (the M of
// "Marked"), mislabeling heels as size M. It must NOT, while real letters still work.
test("extractSizeFromDescription — 'Size: Marked NN' does not return the M of Marked", () => {
 assert.equal(extractSizeFromDescription("Material: leather. Size: Marked 36 - TTS US 6"), null);
 assert.equal(extractSizeFromDescription("Size: Marked 34.5, insole 9in"), null);
});

test("extractSizeFromDescription — real labeled sizes still extract", () => {
 assert.equal(extractSizeFromDescription("Lovely silk top. Size: M. Fits great."), "M");
 assert.equal(extractSizeFromDescription("Size: Medium"), "M");
 assert.equal(extractSizeFromDescription("Size: 8"), "8");
 assert.equal(extractSizeFromDescription("Tagged size: EU 38"), "EU 38");
});

test("extractFitLetterFromDescription — the IT-54 cow-print case (Best Fit M - XL)", () => {
 const desc = "<p>Label: IT54</p><p>Best Fit M - XL (depending on desired fit)</p>";
 assert.equal(extractFitLetterFromDescription(desc), "M-XL");
});

test("extractFitLetterFromDescription — single and word fits", () => {
 assert.equal(extractFitLetterFromDescription("Fits like a large"), "L");
 assert.equal(extractFitLetterFromDescription("Best fit small"), "S");
 assert.equal(extractFitLetterFromDescription("Fit: M-L"), "M-L");
 assert.equal(extractFitLetterFromDescription("best fits medium to large"), "M-L");
 assert.equal(extractFitLetterFromDescription("Best Fit XS-S"), "XS-S");
});

test("extractFitLetterFromDescription — conservative: never guesses", () => {
 assert.equal(extractFitLetterFromDescription("Runs small"), null); // not an explicit fit statement
 assert.equal(extractFitLetterFromDescription("Fits like a glove"), null); // 'glove' isn't a size
 assert.equal(extractFitLetterFromDescription("A beautiful medium-weight wool coat"), null);
 assert.equal(extractFitLetterFromDescription("Label: IT 54"), null); // a tag, not a fit
 assert.equal(extractFitLetterFromDescription(""), null);
 assert.equal(extractFitLetterFromDescription(null), null);
});
