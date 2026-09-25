import { getCollection, type CollectionEntry } from "astro:content";

import type { CodeSnippetExample } from "@/components/web/docs-code-snippet";
import { parseMarkdownCodeSnippetVariants } from "@/lib/code-snippet-markdown";

type CodeExampleEntry = CollectionEntry<"codeExamples">;

export async function getMainCodeShowcaseExamples(): Promise<
  CodeSnippetExample[]
> {
  const entries = await getCollection("codeExamples");
  return entries.sort(byOrderThenTitle).map((entry: CodeExampleEntry) => ({
    id: entry.data.id,
    label: entry.data.label,
    title: entry.data.title,
    description: entry.data.description,
    variants: parseMarkdownCodeSnippetVariants(
      entry.body ?? "",
      `Code example "${entry.id}"`,
    ).map((variant) => ({ ...variant, ...splitLeadingImports(variant.code) })),
  }));
}

const importLinePattern = /^(import\s|from\s+\S+\s+import\b)/;

/**
 * Split a sample into its leading import block and the rest, so the showcase
 * can fold the imports away like an IDE. Blank lines between imports stay in
 * the block; parenthesised Python imports are followed to their closing
 * paren. The copy button still copies the full sample.
 */
function splitLeadingImports(code: string) {
  const lines = code.split("\n");
  let end = 0;
  let open = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (open > 0 || importLinePattern.test(line)) {
      open += countParens(line);
      end = i + 1;
    } else if (line.trim() !== "") {
      break;
    }
  }
  if (end === 0) {
    return {};
  }
  return {
    importsCode: lines.slice(0, end).join("\n").trimEnd(),
    bodyCode: lines.slice(end).join("\n").replace(/^\s*\n/, ""),
  };
}

function countParens(line: string) {
  return (line.match(/\(/g) ?? []).length - (line.match(/\)/g) ?? []).length;
}

function byOrderThenTitle(left: CodeExampleEntry, right: CodeExampleEntry) {
  return (
    left.data.order - right.data.order ||
    left.data.title.localeCompare(right.data.title)
  );
}
