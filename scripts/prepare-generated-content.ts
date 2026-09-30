import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

type GeneratedContentTask = readonly [
  label: string,
  surfaces: Array<"docs" | "guides">,
  command: string,
  args: string[],
];

// Guide pages show the configuration references in their snippet hovers, so
// both surfaces collect them.
const tasks: GeneratedContentTask[] = [
  ["docs", ["docs"], process.execPath, ["scripts/render-docs.ts"]],
  [
    "configuration references",
    ["docs", "guides"],
    process.execPath,
    ["scripts/fetch-configuration-references.ts"],
  ],
  ["guides", ["guides"], process.execPath, ["scripts/render-guides.ts"]],
];

const selectedTasks = tasksForDeploymentSurface();

if (selectedTasks.length === 0) {
  console.log("Skipping generated docs and guides content preparation.");
} else {
  await Promise.all(
    selectedTasks.map(([label, , command, args]) => run(label, command, args)),
  );
}

function run(label: string, command: string, args: string[]): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectDirectory,
      env: process.env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${label} render failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}`,
        ),
      );
    });
  });
}

function shouldSkipGeneratedContent(): boolean {
  const value = process.env.MICRONAUT_PREPARE_GENERATED_CONTENT;
  return value === "false" || value === "0" || value === "none";
}

function tasksForDeploymentSurface(): GeneratedContentTask[] {
  if (shouldSkipGeneratedContent()) {
    return [];
  }
  const surface = process.env.MICRONAUT_DEPLOY_SURFACE;
  if (surface === "docs" || surface === "guides") {
    return tasks.filter(([, surfaces]) => surfaces.includes(surface));
  }
  if (surface === "main") {
    return [];
  }
  return tasks;
}
