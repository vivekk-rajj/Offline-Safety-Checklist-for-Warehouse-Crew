const test = require("node:test");
const assert = require("node:assert/strict");
const {
  sanitizeText,
  validateSubmission,
  filterItems
} = require("../app.js");

test("sanitizeText escapes HTML and script payloads", () => {
  assert.equal(
    sanitizeText('<img src=x onerror="alert(1)">'),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
  );
});

test("validateSubmission reports missing required fields", () => {
  assert.deepEqual(
    validateSubmission({ workerName: "", location: "  ", shift: "" }),
    {
      workerName: "Enter a crew member name.",
      location: "Enter a warehouse location.",
      shift: "Select a shift."
    }
  );
});

test("validateSubmission accepts complete values", () => {
  assert.deepEqual(
    validateSubmission({ workerName: "Alex", location: "Dock 2", shift: "Morning" }),
    {}
  );
});

test("filterItems returns empty for unmatched searches and supports case-insensitive matches", () => {
  const items = ["Fire exits are clear", "PPE is available"];
  assert.deepEqual(filterItems(items, "ppe"), ["PPE is available"]);
  assert.deepEqual(filterItems(items, "missing"), []);
  assert.deepEqual(filterItems(items, ""), items);
});
