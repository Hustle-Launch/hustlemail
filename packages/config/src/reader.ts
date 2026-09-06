import ts from "typescript";
import { parseMailConfig, type MailConfig } from "./index";

/** Read a TypeScript config as data. It is never imported, evaluated, or transpiled. */
export function parseConfigText(
  text: string,
  filename = "mail.config.ts",
): MailConfig {
  if (filename.endsWith(".json")) return parseMailConfig(JSON.parse(text));
  const file = ts.createSourceFile(
    filename,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const diagnostics = (
    file as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }
  ).parseDiagnostics;
  if (diagnostics?.length)
    throw new Error("Invalid TypeScript syntax in mail configuration");
  let expression: ts.Expression | undefined;
  let imported = false;
  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement)) {
      if (
        imported ||
        statement.importClause?.name ||
        statement.importClause?.isTypeOnly
      )
        throw new Error("Only one named defineMailConfig import is allowed");
      if (
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        statement.moduleSpecifier.text !== "@hustlemail/config"
      )
        throw new Error("Only the defineMailConfig import is allowed");
      const bindings = statement.importClause?.namedBindings;
      if (
        !bindings ||
        !ts.isNamedImports(bindings) ||
        bindings.elements.length !== 1 ||
        bindings.elements[0].name.text !== "defineMailConfig" ||
        bindings.elements[0].propertyName
      )
        throw new Error("Only import { defineMailConfig } is allowed");
      imported = true;
      continue;
    }
    if (
      ts.isExportAssignment(statement) &&
      !statement.isExportEquals &&
      !expression
    ) {
      expression = statement.expression;
      continue;
    }
    throw new Error(
      "Configuration must contain only an optional defineMailConfig import and one default export",
    );
  }
  if (!expression) throw new Error("Configuration requires a default export");
  if (ts.isCallExpression(expression)) {
    if (
      !ts.isIdentifier(expression.expression) ||
      expression.expression.text !== "defineMailConfig" ||
      expression.arguments.length !== 1
    )
      throw new Error("Only defineMailConfig({...}) is allowed");
    expression = expression.arguments[0];
  }
  return parseMailConfig(readLiteral(expression));
}

function readLiteral(node: ts.Expression): unknown {
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node)
  )
    return readLiteral(node.expression);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isArrayLiteralExpression(node))
    return node.elements.map((item) => readLiteral(item));
  if (ts.isObjectLiteralExpression(node)) {
    const result: Record<string, unknown> = Object.create(null);
    for (const property of node.properties) {
      if (
        !ts.isPropertyAssignment(property) ||
        !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
      )
        throw new Error(
          "Use literal properties; functions, spreads, shorthand and computed keys are not allowed",
        );
      const key = property.name.text;
      if (
        ["__proto__", "constructor", "prototype"].includes(key) ||
        Object.hasOwn(result, key)
      )
        throw new Error("Duplicate or unsafe configuration property");
      result[key] = readLiteral(property.initializer);
    }
    return result;
  }
  throw new Error(
    "Configuration values must be literals. Environment lookups, function calls and executable expressions are not allowed.",
  );
}
