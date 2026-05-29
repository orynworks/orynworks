# oryn

CLI and SDK for the [Oryn Works](https://oryn.works) capability marketplace.

Install a skill or knowledge pack into your MCP-aware client, or call one directly.

## Install

```bash
# Print a config snippet (default — safe, no file writes)
npx oryn install deep-research

# Write directly into Claude Desktop or Cursor config
npx oryn install deep-research --client claude
npx oryn install deep-research --client cursor
```

## Use programmatically

```ts
import { OrynClient } from "oryn";

const client = new OrynClient({
  gatewayUrl: "https://api.oryn.works",
  authToken: process.env.ORYN_AUTH_TOKEN,
});

const result = await client.query("alpha-feed", {
  prompt: "trending on base, last 24h",
});
```

## CLI commands

```
oryn install <slug> [--client claude|cursor|print] [--gateway URL]
oryn call    <slug> --prompt "..." [--gateway URL] [--auth TOKEN]
oryn query   <slug> --prompt "..." [--gateway URL] [--auth TOKEN]
oryn ping    [--gateway URL]
```

## Env

| Var | Default |
|---|---|
| `ORYN_GATEWAY_URL` | `https://api.oryn.works` |
| `ORYN_AUTH_TOKEN` | none (required for paid capabilities) |

## License

MIT
