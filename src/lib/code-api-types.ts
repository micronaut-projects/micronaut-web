// Resolves type names in rendered code snippets to their javadoc from the
// imports the snippets already carry, so the pages need no per-token markup.

const IMPORT_PATTERN =
  /^[ \t]*import[ \t]+(static[ \t]+)?([A-Za-z_][\w.]*)\.(\w+)(?:[ \t]+as[ \t]+(\w+))?[ \t]*;?[ \t]*$/gm;

// Python: `from micronaut.http.client import HttpClient, HttpRequest as Req`,
// optionally parenthesised across lines.
const PYTHON_IMPORT_PATTERN =
  /^[ \t]*from[ \t]+([A-Za-z_][\w.]*)[ \t]+import[ \t]+(\([^)]*\)|[^\n#]+)/gm;

/** Maps each imported simple name (or its alias) to its class. */
export function importedTypes(sources: Iterable<string>) {
  const types = new Map<string, string>();
  const add = (name: string, qualifiedName: string) => {
    if (!types.has(name)) {
      types.set(name, qualifiedName);
    }
  };
  for (const source of sources) {
    for (const [, isStatic, owner, simpleName, alias] of source.matchAll(
      IMPORT_PATTERN,
    )) {
      // A static import names a member: `MediaType.TEXT_PLAIN`, `assertEquals`.
      if (isStatic) {
        add(alias || simpleName, `${owner}#${simpleName}`);
      } else if (/^[A-Z]/.test(simpleName)) {
        add(alias || simpleName, `${owner}.${simpleName}`);
      }
    }
    for (const [, module, names] of source.matchAll(PYTHON_IMPORT_PATTERN)) {
      // Micronaut's Python modules mirror the Java packages under `io.`.
      const javaPackage = module.startsWith("micronaut.")
        ? `io.${module}`
        : module;
      for (const entry of names.replace(/[()\\]/g, "").split(",")) {
        const [, simpleName, alias] =
          /^\s*([A-Z]\w*)(?:\s+as\s+(\w+))?\s*$/.exec(entry) || [];
        if (simpleName) {
          add(alias || simpleName, `${javaPackage}.${simpleName}`);
        }
      }
    }
  }
  return types;
}

const PAGES = "https://micronaut-projects.github.io";

// Top-level `io.micronaut.*` packages whose javadoc the platform release
// publishes with Core's; every other one belongs to `micronaut-{segment}`.
const CORE_PACKAGES = new Set([
  "annotation",
  "aop",
  "ast",
  "buffer",
  "context",
  "core",
  "discovery",
  "expressions",
  "function",
  "graal",
  "health",
  "http",
  "inject",
  "jackson",
  "json",
  "logging",
  "management",
  "messaging",
  "module",
  "retry",
  "runtime",
  "scheduling",
  "web",
  "websocket",
]);

const MODULE_REPOSITORIES: Record<string, string> = {
  serde: "micronaut-serialization",
};

// Packages of the documentation's own example code, which has no javadoc.
const EXAMPLE_PACKAGES = new Set(["docs", "example", "examples"]);

/**
 * The javadoc page of a class, or of a `Class#member`, or undefined when no
 * known site hosts it.
 */
export function javadocHref(qualifiedName: string): string | undefined {
  const [typeName, member] = qualifiedName.split("#");
  const segments = typeName.split(".");
  const packageIndex = segments.findIndex((segment) => /^[A-Z]/.test(segment));
  const packages = segments.slice(0, packageIndex);
  if (
    packageIndex <= 0 ||
    packages.some((segment) => EXAMPLE_PACKAGES.has(segment))
  ) {
    return undefined;
  }
  const packagePath = packages.join("/");
  const classPath = segments.slice(packageIndex).join(".");
  const anchor = member ? `#${member}` : "";
  if (segments[0] === "io" && segments[1] === "micronaut") {
    const module = segments[2];
    const repository = CORE_PACKAGES.has(module)
      ? "micronaut-docs"
      : MODULE_REPOSITORIES[module] || `micronaut-${module}`;
    return `${PAGES}/${repository}/latest/api/${packagePath}/${classPath}.html${anchor}`;
  }
  if (segments[0] === "java" || segments[0] === "javax") {
    return `https://docs.oracle.com/en/java/javase/21/docs/api/search.html?q=${classPath}`;
  }
  if (segments[0] === "jakarta") {
    // The platform javadoc covers every spec: inject, validation, persistence.
    return `https://jakarta.ee/specifications/platform/11/apidocs/${packagePath}/${classPath}.html${anchor}`;
  }
  if (segments[0] === "reactor") {
    return `https://projectreactor.io/docs/core/release/api/${packagePath}/${classPath}.html${anchor}`;
  }
  if (segments[0] === "org" && segments[1] === "junit") {
    // JUnit's javadoc is split by module, named after its first packages.
    const module = packages.slice(0, 4).join(".");
    return `https://docs.junit.org/current/api/${module}/${packagePath}/${classPath}.html${anchor}`;
  }
  return undefined;
}

/** The first sentence of a javadoc class page's description. */
export function javadocSummary(pageHtml: string): string | undefined {
  const document = new DOMParser().parseFromString(pageHtml, "text/html");
  const block = document.querySelector(
    ".class-description .block, .description .block",
  );
  const text = block?.textContent?.replace(/\s+/g, " ").trim();
  if (!text) {
    return undefined;
  }
  const sentence = /^.*?[.!?](?=\s|$)/.exec(text)?.[0] || text;
  return sentence.length > 240 ? `${sentence.slice(0, 237)}…` : sentence;
}
