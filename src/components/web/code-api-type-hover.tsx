import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";

import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  importedTypes,
  javadocHref,
  javadocSummary,
  qualifiedReference,
  wildcardTypes,
} from "@/lib/code-api-types";
import {
  configurationKeyPath,
  isNestedConfigurationLanguage,
  kebabCase,
} from "@/lib/configuration-key-path";
import type { ConfigurationPropertyHint } from "../../../scripts/docs/configuration-references.ts";

const CODE_SELECTOR = ".docs-highlighted-code";
const HIGHLIGHT_NAME = "code-api-type";
const OPEN_DELAY_MS = 300;
const CLOSE_DELAY_MS = 250;

type HoveredType = {
  name: string;
  qualifiedName: string;
  href: string;
  rect: DOMRect;
  property?: ConfigurationPropertyHint;
};

type WordAtPoint = HoveredType & { range: Range; code: HTMLElement };

const summaries = new Map<string, Promise<string | undefined>>();

function summaryOf(href: string) {
  let summary = summaries.get(href);
  if (!summary) {
    // A member link would get its class's summary, so it gets none.
    summary =
      href.startsWith("https://micronaut-projects.github.io/") &&
      !href.includes("#")
        ? fetch(href)
            .then((response) => (response.ok ? response.text() : ""))
            .then((html) => (html ? javadocSummary(html) : undefined))
            .catch(() => undefined)
        : Promise.resolve(undefined);
    summaries.set(href, summary);
  }
  return summary;
}

function caretAt(x: number, y: number) {
  if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(x, y);
    return position && { node: position.offsetNode, offset: position.offset };
  }
  const range = document.caretRangeFromPoint?.(x, y);
  return range && { node: range.startContainer, offset: range.startOffset };
}

/**
 * Imported types on this page, built on first use from the snippets' own
 * imports, including the folded ones, so the page ships no extra markup.
 */
let pageTypes: Map<string, string> | undefined;

function typesOnPage() {
  pageTypes ??= importedTypes(
    Array.from(
      document.querySelectorAll(CODE_SELECTOR),
      (code) => code.textContent || "",
    ),
  );
  return pageTypes;
}

/**
 * A snippet's own imports win over the page's: Micronaut Data's docs import
 * both `jakarta.persistence.Embeddable` and Micronaut's `Embeddable`.
 */
const snippetResolvers = new WeakMap<
  HTMLElement,
  (name: string) => string | undefined
>();

function resolverFor(code: HTMLElement) {
  let resolve = snippetResolvers.get(code);
  if (!resolve) {
    // The folded imports are a code block of their own in the same panel.
    const source =
      (code.closest('[role="tabpanel"]') || code).textContent || "";
    const types = importedTypes([source]);
    const wildcard = wildcardTypes(source);
    resolve = (name) =>
      types.get(name) || typesOnPage().get(name) || wildcard(name);
    snippetResolvers.set(code, resolve);
  }
  return resolve;
}

/** The dotted qualifiers written before a word: `Relation.` for `Kind`. */
function qualifiersBefore(node: Node, offset: number, code: HTMLElement) {
  const line = node.parentElement?.closest(".line") || code;
  const before = document.createRange();
  before.setStart(line, 0);
  before.setEnd(node, offset);
  const qualifiers = /(?:[A-Za-z_]\w*\.)+$/.exec(before.toString())?.[0];
  return qualifiers ? qualifiers.slice(0, -1).split(".") : [];
}

/** The snippet's text before or after an offset in one of its text nodes. */
function textAround(
  code: HTMLElement,
  node: Node,
  offset: number,
  side: "before" | "after",
) {
  const range = document.createRange();
  range.selectNodeContents(code);
  if (side === "before") {
    range.setEnd(node, offset);
  } else {
    range.setStart(node, offset);
  }
  return range.toString();
}

type Properties = Record<string, ConfigurationPropertyHint>;

/** The configuration key or imported type name under the pointer. */
function wordAt(
  x: number,
  y: number,
  properties: Properties,
): WordAtPoint | undefined {
  const caret = caretAt(x, y);
  const node = caret?.node;
  if (!node || node.nodeType !== Node.TEXT_NODE) {
    return undefined;
  }
  const code = node.parentElement?.closest<HTMLElement>(CODE_SELECTOR);
  if (!code) {
    return undefined;
  }
  const text = node.textContent || "";
  const around = (pattern: RegExp) => {
    let start = caret!.offset;
    let end = caret!.offset;
    while (start > 0 && pattern.test(text[start - 1])) start -= 1;
    while (end < text.length && pattern.test(text[end])) end += 1;
    return [start, end] as const;
  };
  let [start, end] = around(/[\w.\-[\]]/);
  let name = text.slice(start, end);
  let property = Object.hasOwn(properties, name) ? properties[name] : undefined;
  if (!property && isNestedConfigurationLanguage(code.dataset.lang)) {
    [start, end] = around(/[\w.-]/);
    name = text.slice(start, end);
    const key =
      name &&
      configurationKeyPath(
        code.dataset.lang!,
        textAround(code, node, start, "before"),
        name,
        textAround(code, node, end, "after"),
      );
    // Groovy configuration spells the keys the Properties tab kebab-cases,
    // and a list key, `addresses:`, is shipped as its first entry.
    const found =
      key &&
      [key, kebabCase(key), `${key}[0]`, `${kebabCase(key)}[0]`].find(
        (candidate) => Object.hasOwn(properties, candidate),
      );
    if (found) {
      property = properties[found];
    }
  }
  let qualifiedName: string | undefined = property?.property;
  let href: string | undefined = property?.href;
  if (!property) {
    [start, end] = around(/\w/);
    name = text.slice(start, end);
    qualifiedName = qualifiedReference(
      [...qualifiersBefore(node, start, code), name],
      resolverFor(code),
    );
    href = qualifiedName && javadocHref(qualifiedName);
  }
  if (!qualifiedName || !href) {
    return undefined;
  }
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const rect = range.getBoundingClientRect();
  // The caret snaps to the nearest character, so check the word is hit.
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    return undefined;
  }
  return {
    name,
    qualifiedName,
    href,
    rect,
    range,
    code,
    property,
  };
}

function paint(word: WordAtPoint | undefined) {
  if (typeof Highlight === "undefined" || !CSS.highlights) {
    return;
  }
  if (word) {
    CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(word.range));
  } else {
    CSS.highlights.delete(HIGHLIGHT_NAME);
  }
}

export function CodeApiTypeHover({
  properties = {},
}: {
  /** The documented configuration keys the page's snippets mention. */
  properties?: Properties;
}) {
  const [hovered, setHovered] = useState<HoveredType>();
  const [summary, setSummary] = useState<string>();
  const openTimer = useRef<number>(undefined);
  const closeTimer = useRef<number>(undefined);
  const overPopover = useRef(false);
  const current = useRef<WordAtPoint>(undefined);

  useEffect(() => {
    let frame = 0;
    const clearTimers = () => {
      window.clearTimeout(openTimer.current);
      window.clearTimeout(closeTimer.current);
    };
    const leaveWord = () => {
      if (!current.current) {
        return;
      }
      current.current.code.style.cursor = "";
      current.current = undefined;
      paint(undefined);
      window.clearTimeout(openTimer.current);
      window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(() => {
        if (!overPopover.current) {
          setHovered(undefined);
        }
      }, CLOSE_DELAY_MS);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") {
        return;
      }
      const { clientX, clientY, target } = event;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!(target instanceof Element) || !target.closest(CODE_SELECTOR)) {
          leaveWord();
          return;
        }
        const word = wordAt(clientX, clientY, properties);
        if (
          word &&
          current.current?.range.startContainer === word.range.startContainer &&
          current.current.range.startOffset === word.range.startOffset
        ) {
          return;
        }
        leaveWord();
        if (!word) {
          return;
        }
        current.current = word;
        word.code.style.cursor = "pointer";
        paint(word);
        clearTimers();
        openTimer.current = window.setTimeout(
          () => setHovered(word),
          OPEN_DELAY_MS,
        );
      });
    };
    const onClick = (event: MouseEvent) => {
      const word = current.current;
      if (!word || !document.getSelection()?.isCollapsed) {
        return;
      }
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        window.open(word.href, "_blank", "noopener");
        return;
      }
      clearTimers();
      setHovered(word);
    };
    const onScroll = () => {
      leaveWord();
      setHovered(undefined);
    };
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("click", onClick);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      clearTimers();
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onScroll);
    };
  }, [properties]);

  useEffect(() => {
    setSummary(undefined);
    if (!hovered || hovered.property) {
      return;
    }
    let active = true;
    void summaryOf(hovered.href).then((text) => {
      if (active) setSummary(text);
    });
    return () => {
      active = false;
    };
  }, [hovered?.href]);

  const rect = hovered?.rect;
  return (
    <Popover
      open={Boolean(hovered)}
      onOpenChange={(open) => {
        if (!open) setHovered(undefined);
      }}
    >
      {rect ? (
        <PopoverAnchor
          virtualRef={{ current: { getBoundingClientRect: () => rect } }}
        />
      ) : null}
      {hovered ? (
        <PopoverContent
          side="top"
          align="start"
          className="w-auto max-w-sm space-y-2 p-3 text-sm"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onPointerEnter={() => {
            overPopover.current = true;
            window.clearTimeout(closeTimer.current);
          }}
          onPointerLeave={() => {
            overPopover.current = false;
            closeTimer.current = window.setTimeout(
              () => setHovered(undefined),
              CLOSE_DELAY_MS,
            );
          }}
        >
          <p className="font-mono text-xs break-all">
            <span className="text-muted-foreground">
              {hovered.qualifiedName.replace(/[^.]*$/, "")}
            </span>
            <span className="font-semibold">
              {hovered.qualifiedName.replace(/^.*\./, "")}
            </span>
          </p>
          {hovered.property ? (
            <>
              <p className="text-muted-foreground font-mono text-xs break-all">
                {hovered.property.type}
                {hovered.property.defaultValue
                  ? ` = ${hovered.property.defaultValue}`
                  : null}
              </p>
              {hovered.property.description ? (
                <p className="text-muted-foreground leading-snug">
                  {hovered.property.description}
                </p>
              ) : null}
              <a
                href={hovered.href}
                className="text-primary inline-flex font-medium underline-offset-4 hover:underline"
              >
                Configuration reference
              </a>
            </>
          ) : (
            <>
              {summary ? (
                <p className="text-muted-foreground leading-snug">{summary}</p>
              ) : null}
              <a
                href={hovered.href}
                target="_blank"
                rel="noopener"
                className="text-primary inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
              >
                Open Javadoc
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </>
          )}
        </PopoverContent>
      ) : null}
    </Popover>
  );
}
