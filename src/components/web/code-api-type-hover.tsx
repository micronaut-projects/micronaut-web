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
} from "@/lib/code-api-types";

const CODE_SELECTOR = ".docs-highlighted-code";
const HIGHLIGHT_NAME = "code-api-type";
const OPEN_DELAY_MS = 300;
const CLOSE_DELAY_MS = 250;

type HoveredType = {
  name: string;
  qualifiedName: string;
  href?: string;
  rect: DOMRect;
};

type WordAtPoint = HoveredType & { range: Range; code: HTMLElement };

const summaries = new Map<string, Promise<string | undefined>>();

function summaryOf(href: string) {
  let summary = summaries.get(href);
  if (!summary) {
    summary = href.startsWith("https://micronaut-projects.github.io/")
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

function wordAt(x: number, y: number): WordAtPoint | undefined {
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
  let start = caret!.offset;
  let end = caret!.offset;
  while (start > 0 && /\w/.test(text[start - 1])) start -= 1;
  while (end < text.length && /\w/.test(text[end])) end += 1;
  const name = text.slice(start, end);
  const qualifiedName = /^[A-Z]/.test(name) && typesOnPage().get(name);
  if (!qualifiedName) {
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
    href: javadocHref(qualifiedName),
    rect,
    range,
    code,
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

export function CodeApiTypeHover() {
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
        const word = wordAt(clientX, clientY);
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
      if ((event.metaKey || event.ctrlKey) && word.href) {
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
  }, []);

  useEffect(() => {
    setSummary(undefined);
    if (!hovered?.href) {
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
          {summary ? (
            <p className="text-muted-foreground leading-snug">{summary}</p>
          ) : null}
          {hovered.href ? (
            <a
              href={hovered.href}
              target="_blank"
              rel="noopener"
              className="text-primary inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
            >
              Open Javadoc
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </PopoverContent>
      ) : null}
    </Popover>
  );
}
