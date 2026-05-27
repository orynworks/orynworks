"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/get-session";
import {
  createCapability,
  getCapabilityBySlug,
  upsertWalletByAddress,
} from "@oryn/db";
import { toSlug } from "@/lib/slug";

const FormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(80),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase, alphanumeric, or hyphens"),
  type: z.enum(["skill", "knowledge"]),
  category: z.enum(["data", "action", "knowledge", "utility"]),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000),
  hostUrl: z.string().url("Must be a valid URL").max(500),
  priceUsdc: z
    .string()
    .regex(/^\d+(\.\d{1,6})?$/, "Must be a valid USDC amount (max 6 decimals)")
    .default("0"),
  tokenGated: z.string().optional(),
  requiredToken: z.string().optional(),
});

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function createCapabilityAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Not signed in" };
  }

  const raw = Object.fromEntries(formData);
  const parsed = FormSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return { ok: false, error: "Validation failed", fieldErrors };
  }
  const data = parsed.data;

  const db = getDb();

  // Check slug uniqueness
  const existing = await getCapabilityBySlug(db, data.slug);
  if (existing) {
    return { ok: false, error: "Slug already taken", fieldErrors: { slug: "Already taken" } };
  }

  // Upsert wallet to get builder id
  const walletRecord = await upsertWalletByAddress(db, session.address);

  try {
    await createCapability(db, {
      slug: data.slug,
      type: data.type,
      builderId: walletRecord.id,
      name: data.name,
      description: data.description,
      category: data.category,
      hostUrl: data.hostUrl,
      priceUsdc: data.priceUsdc,
      tokenGated: data.tokenGated === "on",
      requiredToken: data.requiredToken && data.requiredToken.length > 0 ? data.requiredToken : null,
      status: "published",
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to create capability",
    };
  }

  redirect(`/capability/${data.slug}`);
}

export async function suggestSlugAction(name: string): Promise<string> {
  return toSlug(name);
}
