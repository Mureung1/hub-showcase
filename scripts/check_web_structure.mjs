import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(scriptDir, "..");
const rootArg = process.argv.indexOf("--root");
const root = rootArg >= 0 ? path.resolve(process.argv[rootArg + 1]) : defaultRoot;
const requireFromWeb = createRequire(path.join(root, "product/apps/web/package.json"));
const ts = requireFromWeb("typescript");

function relative(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function sourceFiles(directory) {
  const found = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!new Set(["node_modules", "dist", "fixtures"]).has(entry.name)) {
        found.push(...sourceFiles(target));
      }
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.includes(".test.") &&
      !entry.name.endsWith(".d.ts")
    ) {
      found.push(target);
    }
  }
  return found;
}

function functionName(node, sourceFile) {
  if (ts.isFunctionDeclaration(node)) return node.name?.text ?? "<anonymous>";
  if (ts.isMethodDeclaration(node)) return node.name?.getText(sourceFile) ?? "<method>";
  if (
    ts.isVariableDeclaration(node) &&
    node.initializer &&
    (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
  ) {
    return node.name.getText(sourceFile);
  }
  return null;
}

function inspectText(text, file, budgets, defaultBudget) {
  const sourceFile = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const violations = [];
  const seen = new Set();

  function visit(node) {
    const name = functionName(node, sourceFile);
    if (name && node.body) {
      const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      const end = sourceFile.getLineAndCharacterOfPosition(node.end).line + 1;
      const lines = end - start + 1;
      const key = `${file}#${name}`;
      const budget = budgets[key];
      if (budget) seen.add(key);
      if (lines > (budget?.maxLines ?? defaultBudget)) {
        violations.push(`${key}:${start} is ${lines} lines (budget ${budget?.maxLines ?? defaultBudget}).`);
      } else if (budget && lines < budget.maxLines) {
        violations.push(`${key}:${start} decreased to ${lines} lines; reduce or remove stale budget ${budget.maxLines}.`);
      }
    }

    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text.replaceAll("\\", "/");
      if (specifier.includes("fixtures/test") || specifier.includes("test/fixtures")) {
        violations.push(`${file} imports test fixture from ${specifier}.`);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { violations, seen };
}

function main() {
  const policy = JSON.parse(
    fs.readFileSync(path.join(root, ".harness/policies/code-structure-budget.json"), "utf8"),
  );
  const budgets = policy.webFunctionBudgets;
  const allViolations = [];
  const seen = new Set();
  for (const absolute of sourceFiles(path.join(root, "product/apps/web/src"))) {
    const file = relative(absolute);
    const result = inspectText(
      fs.readFileSync(absolute, "utf8"),
      file,
      budgets,
      policy.defaults.webFunctionLines,
    );
    allViolations.push(...result.violations);
    result.seen.forEach((key) => seen.add(key));
  }

  for (const key of Object.keys(budgets)) {
    if (!seen.has(key)) allViolations.push(`Stale or missing Web budget: ${key}.`);
    if (!budgets[key].reason?.trim()) allViolations.push(`Web budget has no reason: ${key}.`);
  }

  if (allViolations.length) {
    console.error("Web structure check failed:");
    allViolations.forEach((violation) => console.error(`- ${violation}`));
    return 1;
  }
  console.log(`Web structure check passed: ${Object.keys(budgets).length} temporary budget(s).`);
  return 0;
}

if (process.argv.includes("--self-test")) {
  const longBody = Array.from({ length: 205 }, (_, index) => `const value${index} = ${index};`).join(
    "\n",
  );
  const result = inspectText(`function TooLarge() {\n${longBody}\n}`, "sample.ts", {}, 200);
  if (result.violations.length !== 1) process.exit(1);
  const stale = inspectText(
    "function Smaller() {\n  return 1;\n}",
    "sample.ts",
    { "sample.ts#Smaller": { maxLines: 10, reason: "self-test" } },
    200,
  );
  if (stale.violations.length !== 1 || !stale.violations[0].includes("stale budget")) {
    process.exit(1);
  }
  console.log("Web structure checker self-test passed.");
  process.exit(0);
}

process.exit(main());
