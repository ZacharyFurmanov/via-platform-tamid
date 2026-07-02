import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDesign, buildDesignCss } from "./captured-design.ts";

test("empty settings produce no design block (just preserved rest)", () => {
 assert.equal(buildDesignCss({ accent: null, heading: null, body: null }, ".x{color:red}"), ".x{color:red}");
 assert.equal(buildDesignCss({ accent: null, heading: null, body: null }, ""), "");
});

test("build → parse round-trips the settings", () => {
 const settings = { accent: "#5D0F17", heading: "Playfair Display", body: "Inter" };
 const css = buildDesignCss(settings, "");
 const parsed = parseDesign(css);
 assert.deepEqual(parsed.settings, settings);
 assert.match(css, /font-family:'Playfair Display'.*!important/);
 assert.match(css, /body\{font-family:'Inter'/);
 assert.match(css, /background-color:#5D0F17!important/);
 assert.match(css, /fonts\.googleapis\.com/);
});

test("other custom CSS is preserved across a design update", () => {
 // Assistant-added CSS sits after the design block; re-building keeps it.
 const original = buildDesignCss({ accent: "#5D0F17", heading: null, body: null }, ".hero{padding:80px}");
 const { settings, rest } = parseDesign(original);
 assert.equal(rest, ".hero{padding:80px}");
 assert.equal(settings.accent, "#5D0F17");
 // Change only the heading font; the .hero rule must survive.
 const updated = buildDesignCss({ ...settings, heading: "Fraunces" }, rest);
 assert.ok(updated.includes(".hero{padding:80px}"));
 assert.equal(parseDesign(updated).settings.heading, "Fraunces");
});

test("invalid accent / unknown font are ignored", () => {
 const css = buildDesignCss({ accent: "not-a-color", heading: "Comic Sans", body: "Inter" }, "");
 assert.ok(!css.includes("not-a-color"));
 assert.ok(!css.includes("Comic Sans"));
 assert.equal(parseDesign(css).settings.body, "Inter");
 assert.equal(parseDesign(css).settings.accent, null);
});

test("parseDesign on a blob with no design block returns it all as rest", () => {
 const { settings, rest } = parseDesign(".a{color:blue}");
 assert.deepEqual(settings, { accent: null, heading: null, body: null });
 assert.equal(rest, ".a{color:blue}");
});
