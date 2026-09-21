import assert from "node:assert/strict";
import { test } from "node:test";

import {
  configurationReferenceRows,
  parseConfigurationReference,
} from "../../docs/configuration-references.ts";

const BASE_URL =
  "https://micronaut-projects.github.io/micronaut-fixture/latest/guide/configurationreference.html";

const page = [
  "<h1>Configuration Reference</h1>",
  '<table class="tableblock">',
  '<caption class="title">Table 1. Configuration Properties for <a href="../api/io/micronaut/fixture/EarlyConfiguration.html">EarlyConfiguration</a></caption>',
  "<thead><tr><th>Property</th><th>Type</th><th>Description</th><th>Default value</th></tr></thead>",
  "<tbody>",
  "<tr><td><p><code>fixture.early.enabled</code></p></td><td><p>boolean</p></td><td><p>Runs before any section heading.</p></td><td><p>true</p></td></tr>",
  "</tbody></table>",
  '<h3 id="a">Micronaut Fixture Config Properties</h3>',
  '<a id="io.micronaut.fixture.FixtureConfiguration$Inner" href="#io.micronaut.fixture.FixtureConfiguration$Inner">&#128279;</a>',
  '<table class="tableblock">',
  '<caption class="title">Table 2. Configuration Properties for <a href="../api/io/micronaut/fixture/FixtureConfiguration.html">FixtureConfiguration</a></caption>',
  "<thead><tr><th>Property</th><th>Type</th><th>Description</th><th>Default value</th></tr></thead>",
  "<tbody>",
  '<tr><td><p><code>fixture.name</code></p></td><td><p><a href="../api/io/micronaut/fixture/Name.html">Name</a></p></td><td><p>The name. It isn&#8217;t optional.</p></td><td><p><code>fixture</code></p></td></tr>',
  "<tr><td><p><code>fixture.count</code></p></td><td><p>int</p></td><td><p>How many.</p></td><td></td></tr>",
  "</tbody></table>",
  '<table class="tableblock">',
  '<caption class="title">Table 3. Something unrelated</caption>',
  "<tbody><tr><td><p><code>not.a.property.table</code></p></td><td><p>skip me</p></td></tr></tbody></table>",
  '<h3 id="b">Micronaut Fixture Config Properties</h3>',
  '<table class="tableblock">',
  "<thead><tr><th>Property</th><th>Type</th><th>Description</th><th>Default value</th></tr></thead>",
  "<tbody><tr><td><p><code>fixture.extra</code></p></td><td><p>String</p></td><td><p>No caption on this one.</p></td><td></td></tr></tbody></table>",
  "<h3>Empty Trailer</h3>",
].join("\n");

test("parseConfigurationReference reads sections, owners, and rows", () => {
  const sections = parseConfigurationReference(page, BASE_URL);

  assert.deepEqual(
    sections.map((section) => [section.id, section.title]),
    [
      ["configuration-properties", "Configuration Properties"],
      [
        "micronaut-fixture-config-properties",
        "Micronaut Fixture Config Properties",
      ],
      [
        "micronaut-fixture-config-properties-2",
        "Micronaut Fixture Config Properties",
      ],
    ],
  );

  const [early, main, extra] = sections;
  assert.equal(early.tables[0].owner, "EarlyConfiguration");
  assert.equal(
    early.tables[0].ownerHref,
    "https://micronaut-projects.github.io/micronaut-fixture/latest/api/io/micronaut/fixture/EarlyConfiguration.html",
  );

  // The unrelated table is dropped; the captioned one keeps its rows.
  assert.equal(main.tables.length, 1);
  // Old links target a table by the anchor written ahead of it.
  assert.equal(early.tables[0].id, undefined);
  assert.equal(
    main.tables[0].id,
    "io.micronaut.fixture.FixtureConfiguration$Inner",
  );
  const [name, count] = main.tables[0].rows;
  assert.deepEqual(name, {
    property: "fixture.name",
    type: "Name",
    typeHref:
      "https://micronaut-projects.github.io/micronaut-fixture/latest/api/io/micronaut/fixture/Name.html",
    // Numeric entities decode; the published pages are full of &#8217;.
    description: "The name. It isn’t optional.",
    defaultValue: "fixture",
  });
  assert.deepEqual(count, {
    property: "fixture.count",
    type: "int",
    description: "How many.",
    defaultValue: "",
  });

  assert.equal(extra.tables[0].owner, undefined);
  assert.equal(extra.tables[0].rows[0].property, "fixture.extra");

  assert.deepEqual(
    configurationReferenceRows({ sourceUrl: BASE_URL, sections }).map(
      (row) => row.property,
    ),
    ["fixture.early.enabled", "fixture.name", "fixture.count", "fixture.extra"],
  );
});
