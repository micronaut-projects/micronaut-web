// Link resolution for the `api:`, `ann:`, `mnapi:`, `jdk:`, `jee:`, `rs:`,
// `rx:`, `reactor:` and `pkg:` inline macros. Pure functions so the mapping
// from macro target to href can be tested without Asciidoctor.
import {
  type MacroAttributes,
  macroAttribute,
  macroText,
} from "./extensions/macro-attributes.ts";

export const API_MACRO_KINDS = [
  "api",
  "ann",
  "mnapi",
  "jdk",
  "jee",
  "rs",
  "rx",
  "reactor",
] as const;

export type ApiKind = (typeof API_MACRO_KINDS)[number];

export type ApiMacroContext = Record<string, unknown> & {
  project?: {
    slug?: string;
    repositoryName?: string;
    version?: string;
  };
  attributes?: Record<string, unknown>;
};

type ParsedApiTarget = {
  classTarget: string;
  methodRef: string;
  propRef: string;
  shortName: string;
};

type ApiLibrary = {
  defaultUri: string;
  packagePrefix: string | null;
  attributeKey: string | null;
};

export type ResolvedLink = { href: string; label: string };

/**
 * Canonical published javadoc for the current project. `api:`/`ann:`/`pkg:`
 * links used to target a local `assets/{slug}/docs/api` tree, but the
 * pipeline never generates or copies javadoc, so every one of those links
 * returned 404 on the published site.
 *
 * The release the docs describe wins over `latest`, so a reader on a pinned
 * docs version is not handed the API of a newer one. Core's javadoc is
 * published by the platform release to the `micronaut-docs` Pages site;
 * `docs.micronaut.io/latest/api` was that tree's old address and now 404s,
 * because this site took the host over.
 */
export function projectApiBaseUri(context: ApiMacroContext): string {
  const version = context.project?.version || "latest";
  return `${projectPagesUri(context)}/${version}/api`;
}

/**
 * The GitHub Pages site a project's build publishes its javadoc and
 * `guide/configurationreference.html` to. Core's own `micronaut-core` site
 * stopped at 3.4.0; the platform release publishes Core's to `micronaut-docs`.
 */
export function projectPagesUri(context: ApiMacroContext): string {
  const projectSlug =
    context.project?.slug || String(context.attributes?.projectSlug || "core");
  // The repository wins over the slug: a project known only by its
  // repository must not fall back to the `core` default slug.
  const repositoryName =
    context.project?.repositoryName || `micronaut-${projectSlug}`;
  return `https://micronaut-projects.github.io/${
    repositoryName === "micronaut-core" ? CORE_API_REPOSITORY : repositoryName
  }`;
}

const CORE_API_REPOSITORY = "micronaut-docs";

/** The framework's own javadoc, for content that links it from elsewhere. */
export const coreApiBaseUri = `https://micronaut-projects.github.io/${CORE_API_REPOSITORY}/latest/api`;

export function packageLink(
  context: ApiMacroContext,
  target: string,
  attrs: MacroAttributes,
): ResolvedLink {
  let packageName = target;
  if (!packageName.startsWith("io.micronaut.")) {
    packageName = `io.micronaut.${packageName}`;
  }
  return {
    href: `${projectApiBaseUri(context)}/${packageName.replaceAll(".", "/")}/package-summary.html`,
    label: macroText(attrs) || packageName,
  };
}

export function apiLink(
  context: ApiMacroContext,
  kind: ApiKind,
  target: string,
  attrs: MacroAttributes,
): ResolvedLink {
  const parsed = parseApiTarget(target);
  const library = apiLibrary(context, kind, attrs);
  let baseUri = apiBaseUri(context, library.attributeKey, library);
  const module = apiModule(parsed.classTarget, attrs);
  if (module) {
    baseUri = `${baseUri}/${module}`;
  }

  let label = macroText(attrs) || parsed.shortName;
  if (kind === "ann") {
    label = `@${label}`;
  }

  const href =
    `${baseUri}/${targetPathUrl(parsed.classTarget, library.packagePrefix)}.html${parsed.methodRef}${parsed.propRef}`.replaceAll(
      "$",
      ".",
    );
  return { href, label };
}

export function parseApiTarget(target: string): ParsedApiTarget {
  const methodIndex = target.lastIndexOf("(");
  const propIndex = target.lastIndexOf("#");
  let classTarget = target;
  let methodRef = "";
  let propRef = "";
  let shortName: string;

  if (methodIndex > -1 && target.endsWith(")")) {
    const signature = target.slice(methodIndex + 1, -1);
    const withoutSignature = target.slice(0, methodIndex);
    const methodSeparator = withoutSignature.lastIndexOf(".");
    if (methodSeparator < 0) {
      shortName = target;
    } else {
      const methodName = withoutSignature.slice(methodSeparator + 1);
      classTarget = withoutSignature.slice(0, methodSeparator);
      methodRef = `#${methodName}-${signature.split(",").join("-")}-`;
      shortName = `${simpleName(classTarget)}.${methodName}(${signature})`;
    }
  } else if (propIndex > -1) {
    propRef = target.slice(propIndex);
    classTarget = target.slice(0, propIndex);
    shortName = propRef.slice(1);
  } else {
    shortName = simpleName(target);
  }

  return { classTarget, methodRef, propRef, shortName };
}

function apiLibrary(
  context: ApiMacroContext,
  kind: ApiKind,
  attrs: MacroAttributes,
): ApiLibrary {
  const projectApi = projectApiBaseUri(context);
  const libraries: Record<ApiKind, ApiLibrary> = {
    api: {
      defaultUri: projectApi,
      packagePrefix: "io.micronaut.",
      attributeKey: null,
    },
    ann: {
      defaultUri: projectApi,
      packagePrefix: "io.micronaut.",
      attributeKey: null,
    },
    mnapi: {
      defaultUri: coreApiBaseUri,
      packagePrefix: "io.micronaut.",
      attributeKey: "micronautApi",
    },
    jdk: {
      defaultUri: "https://docs.oracle.com/en/java/javase/21/docs/api",
      packagePrefix: null,
      attributeKey: "jdkapi",
    },
    jee: {
      defaultUri: "https://docs.oracle.com/javaee/6/api",
      packagePrefix: null,
      attributeKey: "jeeapi",
    },
    rs: {
      defaultUri:
        "https://www.reactive-streams.org/reactive-streams-1.0.3-javadoc",
      packagePrefix: "org.reactivestreams.",
      attributeKey: "rsapi",
    },
    rx: {
      defaultUri: "http://reactivex.io/RxJava/2.x/javadoc",
      packagePrefix: "io.reactivex.",
      attributeKey: "rxapi",
    },
    reactor: {
      defaultUri: "https://projectreactor.io/docs/core/release/api",
      packagePrefix: "reactor.core.publisher.",
      attributeKey: "reactorapi",
    },
  };
  const library = { ...libraries[kind] };
  const defaultUri = macroAttribute(attrs, "defaultUri");
  const packagePrefix = macroAttribute(attrs, "packagePrefix");
  if (defaultUri !== undefined) {
    library.defaultUri = defaultUri;
  }
  if (packagePrefix !== undefined) {
    library.packagePrefix = packagePrefix;
  }
  return library;
}

function apiBaseUri(
  context: ApiMacroContext,
  attributeKey: string | null,
  library: ApiLibrary,
): string {
  if (attributeKey) {
    const configured =
      context.attributes?.[attributeKey] ||
      context.attributes?.[attributeKey.toLowerCase()];
    if (configured) {
      return String(configured);
    }
  }
  return library.defaultUri;
}

function apiModule(classTarget: string, attrs: MacroAttributes): string {
  const configured = macroAttribute(attrs, "module");
  if (configured !== undefined) {
    return configured;
  }
  return classTarget.startsWith("java") ? "java.base" : "";
}

function targetPathUrl(target: string, packagePrefix: string | null): string {
  let result = target;
  if (packagePrefix && !target.startsWith(packagePrefix)) {
    result = `${packagePrefix}${target}`;
  }
  return scapeDots(result);
}

function scapeDots(value: string): string {
  const tokens = value.split(".");
  let result = "";
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token) {
      continue;
    }
    result += token;
    if (/^[A-Z]/.test(token)) {
      if (index !== tokens.length - 1) {
        result += ".";
      }
    } else {
      result += "/";
    }
  }
  return result;
}

function simpleName(className: string): string {
  return className.split(".").filter(Boolean).at(-1) || className;
}
