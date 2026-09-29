import assert from "node:assert/strict";
import { test } from "node:test";

import { configurationKeyPath } from "../../../src/lib/configuration-key-path.ts";

/** The flat key of the `|`-marked word in a snippet. */
function keyAt(language: string, snippet: string) {
  const start = snippet.indexOf("|");
  const end = snippet.indexOf("|", start + 1);
  return configurationKeyPath(
    language,
    snippet.slice(0, start),
    snippet.slice(start + 1, end),
    snippet.slice(end + 1),
  );
}

test("rebuilds flat keys from nested configuration formats", () => {
  const yaml = [
    "micronaut:",
    "  server:",
    "    port: 8080",
    "  router:",
    "    static-resources:",
    "      - paths: classpath:a",
    "      - paths: classpath:b",
    "        |mapping|: /b/**",
  ].join("\n");
  assert.equal(
    keyAt("yaml", yaml),
    "micronaut.router.static-resources[1].mapping",
  );
  assert.equal(
    keyAt("yaml", "micronaut:\n  server:\n    |port|: 8080"),
    "micronaut.server.port",
  );
  assert.equal(
    keyAt("yaml", "micronaut:\n  server:\n    port: |8080|"),
    undefined,
  );

  const toml = [
    "[[micronaut.introspection.reflective]]",
    'types = "a"',
    "[[micronaut.introspection.reflective]]",
    'types = "b"',
    "[[micronaut.introspection.reflective.indexed]]",
    '|member| = "value"',
  ].join("\n");
  assert.equal(
    keyAt("toml", toml),
    "micronaut.introspection.reflective[1].indexed[0].member",
  );

  const braced = "micronaut {\n  server {\n    |port| = 8080\n  }\n}";
  assert.equal(keyAt("hocon", braced), "micronaut.server.port");
  assert.equal(keyAt("groovy-config", braced), "micronaut.server.port");
  assert.equal(
    keyAt(
      "json-config",
      '{\n  "micronaut": {\n    "server": { "ssl": true },\n    "executors": { "io": { "|nThreads|": 8 } }\n  }\n}',
    ),
    "micronaut.executors.io.nThreads",
  );
});
