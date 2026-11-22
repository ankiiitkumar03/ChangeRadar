import { NextResponse } from "next/server";
import { z } from "zod";

import { badRequest, getApiSession, serverError, unauthorized } from "@/lib/api";
import {
  extractReadableText,
  fetchPage,
  MonitorValidationError,
  normalizeMonitorUrl,
  prepareContent,
} from "@/lib/monitoring";

const previewSchema = z.object({
  url: z.string().trim().min(1, "Enter the page URL").max(2048),
  keywords: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  ignoreKeywords: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
});

export async function POST(request: Request) {
  const session = await getApiSession(request);
  if (!session) return unauthorized();

  const parsed = previewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("Check the URL and filters, then try again.");

  try {
    const url = normalizeMonitorUrl(parsed.data.url);
    const fetched = await fetchPage(url);
    const rawText = extractReadableText(fetched.html);
    if (!rawText.trim()) {
      throw new MonitorValidationError(
        "We could not find readable text. This page may require JavaScript or a browser session.",
      );
    }

    const text = prepareContent(rawText, {
      keywords: parsed.data.keywords,
      ignoreKeywords: parsed.data.ignoreKeywords,
    });
    const maxPreviewCharacters = 1800;

    return NextResponse.json({
      preview: {
        finalUrl: fetched.finalUrl,
        httpStatus: fetched.httpStatus,
        durationMs: fetched.durationMs,
        lineCount: text.split("\n").filter(Boolean).length,
        characterCount: text.length,
        text: text.slice(0, maxPreviewCharacters),
        truncated: text.length > maxPreviewCharacters,
      },
    });
  } catch (error) {
    if (error instanceof MonitorValidationError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("Failed to preview monitor page", error);
    return serverError("We could not preview this page. Please try again.");
  }
}
