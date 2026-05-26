import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../src/server.js";
import type { FastifyInstance } from "fastify";

describe("GET /me", () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it("rejects requests with no session cookie", async () => {
    const res = await server.inject({ method: "GET", url: "/me" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: "no session" });
  });

  it("rejects requests with an invalid session token", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/me",
      headers: { cookie: "oryn_session=not-a-real-jwt" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: "invalid session" });
  });
});
