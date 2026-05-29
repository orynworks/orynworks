#!/usr/bin/env node
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { OrynClient, OrynError } from "./index.js";

const VERSION = "0.1.0";

type ParsedArgs = {
  command: string | undefined;
  positional: string[];
  flags: Record<string, string | boolean>;
};

function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];
    if (!token) continue;
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(token);
    }
  }
  return { command, positional, flags };
}

function help(): void {
  process.stdout.write(
    [
      "oryn — capability marketplace for AI agents",
      "",
      "Usage:",
      "  oryn install <slug> [--client claude|cursor|print] [--gateway URL]",
      "  oryn call <slug> --prompt \"...\" [--gateway URL] [--auth TOKEN]",
      "  oryn query <slug> --prompt \"...\" [--gateway URL] [--auth TOKEN]",
      "  oryn ping [--gateway URL]",
      "  oryn --version",
      "",
      "Env vars:",
      "  ORYN_GATEWAY_URL    Override default gateway",
      "  ORYN_AUTH_TOKEN     x402 session bearer token",
      "",
      "More: https://oryn.works/docs",
      "",
    ].join("\n")
  );
}

async function runInstall(args: ParsedArgs): Promise<number> {
  const slug = args.positional[0];
  if (!slug) {
    process.stderr.write("error: install requires a slug\n");
    return 2;
  }
  const client =
    typeof args.flags.client === "string" ? args.flags.client : "print";
  const gateway =
    typeof args.flags.gateway === "string"
      ? args.flags.gateway
      : process.env.ORYN_GATEWAY_URL ?? "https://api.oryn.works";

  const entry = {
    [`oryn-${slug}`]: {
      type: "http",
      url: `${gateway.replace(/\/$/, "")}/v1/skills/${slug}/call`,
    },
  };

  if (client === "print") {
    process.stdout.write(
      `# Add to your MCP-aware client config:\n\n${JSON.stringify(
        { mcpServers: entry },
        null,
        2
      )}\n`
    );
    return 0;
  }

  let targetPath: string;
  if (client === "claude") {
    if (process.platform === "darwin") {
      targetPath = path.join(
        homedir(),
        "Library",
        "Application Support",
        "Claude",
        "claude_desktop_config.json"
      );
    } else if (process.platform === "win32") {
      targetPath = path.join(
        process.env.APPDATA ?? homedir(),
        "Claude",
        "claude_desktop_config.json"
      );
    } else {
      targetPath = path.join(homedir(), ".config", "Claude", "claude_desktop_config.json");
    }
  } else if (client === "cursor") {
    targetPath = path.join(homedir(), ".cursor", "mcp.json");
  } else {
    process.stderr.write(`error: unknown client "${client}"\n`);
    return 2;
  }

  let existing: any = { mcpServers: {} };
  try {
    const raw = await fs.readFile(targetPath, "utf8");
    existing = JSON.parse(raw);
    if (!existing.mcpServers) existing.mcpServers = {};
  } catch {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
  }

  Object.assign(existing.mcpServers, entry);
  await fs.writeFile(targetPath, JSON.stringify(existing, null, 2) + "\n");
  process.stdout.write(`✓ Installed ${slug} into ${client} config\n`);
  process.stdout.write(`  ${targetPath}\n`);
  process.stdout.write(`  Restart ${client} to load the capability.\n`);
  return 0;
}

async function runCall(args: ParsedArgs, mode: "call" | "query"): Promise<number> {
  const slug = args.positional[0];
  if (!slug) {
    process.stderr.write(`error: ${mode} requires a slug\n`);
    return 2;
  }
  const prompt =
    typeof args.flags.prompt === "string" ? args.flags.prompt : undefined;
  if (!prompt) {
    process.stderr.write(`error: ${mode} requires --prompt "..."\n`);
    return 2;
  }

  const client = new OrynClient({
    gatewayUrl:
      typeof args.flags.gateway === "string" ? args.flags.gateway : undefined,
    authToken:
      typeof args.flags.auth === "string" ? args.flags.auth : undefined,
  });

  try {
    const result =
      mode === "call"
        ? await client.call(slug, { prompt })
        : await client.query(slug, { prompt });
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    return 0;
  } catch (e) {
    if (e instanceof OrynError) {
      process.stderr.write(`error: ${e.message}\n`);
    } else {
      process.stderr.write(
        `error: ${e instanceof Error ? e.message : String(e)}\n`
      );
    }
    return 1;
  }
}

async function runPing(args: ParsedArgs): Promise<number> {
  const client = new OrynClient({
    gatewayUrl:
      typeof args.flags.gateway === "string" ? args.flags.gateway : undefined,
  });
  try {
    const result = await client.ping();
    process.stdout.write(`${result.ok ? "ok" : "fail"} ${client.gatewayUrl}\n`);
    return result.ok ? 0 : 1;
  } catch (e) {
    process.stderr.write(
      `error: ${e instanceof Error ? e.message : String(e)}\n`
    );
    return 1;
  }
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  if (args.flags.version || args.command === "--version" || args.command === "-v") {
    process.stdout.write(`oryn v${VERSION}\n`);
    return 0;
  }
  if (!args.command || args.command === "help" || args.flags.help) {
    help();
    return 0;
  }
  switch (args.command) {
    case "install":
      return runInstall(args);
    case "call":
      return runCall(args, "call");
    case "query":
      return runCall(args, "query");
    case "ping":
      return runPing(args);
    default:
      process.stderr.write(`error: unknown command "${args.command}"\n\n`);
      help();
      return 2;
  }
}

main().then(
  (code) => process.exit(code),
  (e) => {
    process.stderr.write(`fatal: ${e instanceof Error ? e.stack : String(e)}\n`);
    process.exit(1);
  }
);
