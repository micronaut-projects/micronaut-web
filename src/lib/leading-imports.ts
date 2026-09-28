const importLinePattern = /^(package\s|import\s|from\s+\S+\s+import\b)/;

/**
 * Split a sample into its leading package and import block and the rest, so
 * snippets can fold the imports away like an IDE. Blank lines between imports
 * stay in the block; parenthesised Python imports are followed to their
 * closing paren. The copy button still copies the full sample.
 */
export function splitLeadingImports(code: string): {
  importsCode?: string;
  bodyCode?: string;
} {
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
  const bodyCode = lines
    .slice(end)
    .join("\n")
    .replace(/^\s*\n/, "");
  // A sample that is all imports has nothing to fold them above.
  if (end === 0 || !bodyCode.trim()) {
    return {};
  }
  return {
    importsCode: lines.slice(0, end).join("\n").trimEnd(),
    bodyCode,
  };
}

function countParens(line: string) {
  return (line.match(/\(/g) ?? []).length - (line.match(/\)/g) ?? []).length;
}
