import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
// Resolve the dependency from Firebase's actual caller without executing auth:import.
const firebaseRequire = createRequire(require.resolve("firebase-tools/lib/commands/auth-import.js"));
const { parse } = firebaseRequire("csv-parse");

function parseChunks(input, chunkSize, options) {
  return new Promise((resolve, reject) => {
    const parser = options === undefined ? parse() : parse(options);
    const records = [];
    // Firebase consumes default array records through this readable/read/end API.
    parser.on("readable", () => {
      let record;
      while ((record = parser.read()) !== null) records.push(record);
    });
    parser.once("error", reject);
    parser.once("end", () => resolve(records));
    const bytes = Buffer.from(input);
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      parser.write(bytes.subarray(offset, offset + chunkSize));
    }
    parser.end();
  });
}

for (const newline of ["\n", "\r\n"]) {
  for (const chunkSize of [1, 7, 4096]) {
    test(`Firebase default CSV records survive ${JSON.stringify(newline)} and ${chunkSize}-byte chunks`,
      { timeout: 5000 }, async () => {
        const input = [
          'uid-1,player@example.invalid,"João, Player","quote ""inside""",',
          `uid-2,second@example.invalid,"two${newline}lines",false,0`,
        ].join(newline) + newline;
        assert.deepEqual(await parseChunks(input, chunkSize), [
          ["uid-1", "player@example.invalid", "João, Player", 'quote "inside"', ""],
          ["uid-2", "second@example.invalid", `two${newline}lines`, "false", "0"],
        ]);
      });
  }
}

test("CSV parser propagates malformed input errors", { timeout: 5000 }, async () => {
  await assert.rejects(parseChunks('uid,"unterminated', 1), /Quote Not Closed/i);
});

test("duplicate __proto__ columns cannot replace a record prototype", { timeout: 5000 }, async () => {
  const [record] = await parseChunks("__proto__,__proto__,name\nfirst,second,player\n", 1, {
    columns: true,
    group_columns_by_name: true,
  });
  assert.equal(Object.getPrototypeOf(record), Object.prototype);
  assert.equal(Object.hasOwn(record, "__proto__"), true);
  assert.deepEqual(record.__proto__, ["first", "second"]);
  assert.equal(record.name, "player");
});
