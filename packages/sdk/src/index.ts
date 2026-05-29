// Programmatic entry. Most users go through the CLI; this is for
// embedding in TypeScript/Node code.

export type OrynClientConfig = {
  gatewayUrl?: string;
  authToken?: string;
};

const DEFAULT_GATEWAY = "https://api.oryn.works";

export class OrynClient {
  readonly gatewayUrl: string;
  readonly authToken: string | undefined;

  constructor(config: OrynClientConfig = {}) {
    this.gatewayUrl = (config.gatewayUrl ?? process.env.ORYN_GATEWAY_URL ?? DEFAULT_GATEWAY).replace(/\/$/, "");
    this.authToken = config.authToken ?? process.env.ORYN_AUTH_TOKEN;
  }

  async call(slug: string, body: unknown): Promise<unknown> {
    return this.request(`/v1/skills/${encodeURIComponent(slug)}/call`, body);
  }

  async query(slug: string, body: unknown): Promise<unknown> {
    return this.request(`/v1/knowledge/${encodeURIComponent(slug)}/query`, body);
  }

  async ping(): Promise<{ ok: boolean }> {
    const res = await fetch(`${this.gatewayUrl}/health`);
    return { ok: res.ok };
  }

  private async request(path: string, body: unknown): Promise<unknown> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.authToken) headers["Authorization"] = `Bearer ${this.authToken}`;
    const res = await fetch(`${this.gatewayUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new OrynError(res.status, text);
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}

export class OrynError extends Error {
  readonly status: number;
  readonly body: string;
  constructor(status: number, body: string) {
    super(`HTTP ${status}: ${body.slice(0, 200)}`);
    this.status = status;
    this.body = body;
  }
}
