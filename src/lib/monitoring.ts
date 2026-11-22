import "server-only";

import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP, BlockList } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

import { and, desc, eq, gte, inArray, isNull, lt, lte, or } from "drizzle-orm";
import { diffWordsWithSpace } from "diff";

import { isAiConfigured, summarizeChange } from "./ai";
import { db } from "./db";
import { isEmailConfigured, sendChangeAlert } from "./email";
import {
  changes,
  checkRuns,
  monitors,
  notifications,
  snapshots,
  user,
  userPreferences,
  type DiffSegment,
  type Monitor,
} from "./schema";
import { frequencyMinutes } from "./plans";

const MAX_BYTES = 2_500_000;
const MAX_TEXT = 80_000;
const CHECK_TIMEOUT_MS = 20_000;
const MAX_EMAIL_ATTEMPTS = 4;
const EMAIL_LOCK_MS = 15 * 60_000;
const EMAIL_RETRY_DELAYS_MS = [5 * 60_000, 30 * 60_000, 2 * 60 * 60_000];

export class MonitorValidationError extends Error {}

const blockedIpv4 = new BlockList();
for (const [subnet, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedIpv4.addSubnet(subnet, prefix, "ipv4");
}

function isPrivateIp(address: string): boolean {
  const normalized = address.replace(/^\[|\]$/g, "").toLowerCase();
  const family = isIP(normalized);
  if (family === 4) return blockedIpv4.check(normalized, "ipv4");
  if (family !== 6) return true;

  // Only globally-routable IPv6 unicast addresses (2000::/3) are accepted.
  // This also rejects loopback, link-local, unique-local, multicast, mapped,
  // translation, documentation, and other special-purpose ranges.
  if (!/^[23]/.test(normalized)) return true;
  return (
    normalized === "2001:db8" ||
    normalized.startsWith("2001:db8:") ||
    normalized.startsWith("2002:")
  );
}

function hostnameOf(url: URL): string {
  return url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
}

export function normalizeMonitorUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new MonitorValidationError("Enter a complete URL, including https://");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new MonitorValidationError("Only http and https URLs can be monitored");
  }
  if (parsed.username || parsed.password) {
    throw new MonitorValidationError("URLs containing usernames or passwords cannot be monitored");
  }

  const hostname = hostnameOf(parsed);
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "metadata.google.internal" ||
    hostname.endsWith(".localhost")
  ) {
    throw new MonitorValidationError("That host is not publicly reachable");
  }

  if (isIP(hostname) && isPrivateIp(hostname)) {
    throw new MonitorValidationError("Private and local network addresses cannot be monitored");
  }

  // The monitor only needs standard web ports. Blocking arbitrary ports avoids
  // turning the service into a scanner for public hosts' internal services.
  const expectedPort = parsed.protocol === "https:" ? "443" : "80";
  if (parsed.port && parsed.port !== expectedPort) {
    throw new MonitorValidationError("Only standard HTTP (80) and HTTPS (443) ports are supported");
  }

  parsed.hash = "";
  return parsed.toString();
}

async function resolvePublicAddress(url: URL): Promise<{ address: string; family: 4 | 6 } | null> {
  const hostname = hostnameOf(url);
  const literalFamily = isIP(hostname);
  if (literalFamily) {
    if (isPrivateIp(hostname)) {
      throw new MonitorValidationError("That address is not publicly reachable");
    }
    return null; // IP literals are connected to directly; no DNS lookup occurs.
  }

  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    if (
      records.length === 0 ||
      records.some((record) => isPrivateIp(record.address))
    ) {
      throw new MonitorValidationError("That host resolves to a private or non-public address");
    }
    const selected = records[0];
    return { address: selected.address, family: selected.family as 4 | 6 };
  } catch (error) {
    if (error instanceof MonitorValidationError) throw error;
    throw new MonitorValidationError("We could not resolve that website's address");
  }
}

function requestPinned(
  url: URL,
  pinnedAddress: { address: string; family: 4 | 6 } | null,
): Promise<{ statusCode: number; headers: import("node:http").IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const hostname = hostnameOf(url);
    const options: import("node:http").RequestOptions = {
      protocol: url.protocol,
      hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      method: "GET",
      path: `${url.pathname}${url.search}`,
      headers: {
        "User-Agent": "ChangeRadarBot/1.0 (+https://changeradar.app; website change monitoring)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.8",
        "Accept-Encoding": "identity",
      },
      ...(pinnedAddress
        ? {
            // Pin the socket lookup to the address already checked above.
            // The HTTP client cannot perform a second, attacker-controlled DNS lookup.
            lookup: ((_host: string, lookupOptions: { all?: boolean }, callback: (...args: unknown[]) => void) => {
              if (lookupOptions?.all) {
                callback(null, [{ address: pinnedAddress.address, family: pinnedAddress.family }]);
              } else {
                callback(null, pinnedAddress.address, pinnedAddress.family);
              }
            }) as unknown as import("node:net").LookupFunction,
            family: pinnedAddress.family,
          }
        : {}),
    };

    const handleResponse = (response: import("node:http").IncomingMessage) => {
      const chunks: Buffer[] = [];
      let received = 0;
      const declared = Number(response.headers["content-length"] ?? "0");
      if (declared > MAX_BYTES) {
        response.destroy();
        req.destroy();
        reject(new MonitorValidationError("The page is larger than the 2.5 MB monitoring limit"));
        return;
      }

      response.on("data", (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        received += buffer.byteLength;
        if (received > MAX_BYTES) {
          response.destroy();
          req.destroy();
          reject(new MonitorValidationError("The page is larger than the 2.5 MB monitoring limit"));
          return;
        }
        chunks.push(buffer);
      });
      response.on("end", () => {
        resolve({
          statusCode: response.statusCode ?? 0,
          headers: response.headers,
          body: Buffer.concat(chunks).toString("utf8"),
        });
      });
      response.on("error", reject);
    };

    const req = url.protocol === "https:"
      ? httpsRequest(options, handleResponse)
      : httpRequest(options, handleResponse);

    req.setTimeout(CHECK_TIMEOUT_MS, () => {
      req.destroy(new Error("The website took too long to respond"));
    });
    req.on("error", (error) => {
      reject(error);
    });
    req.end();
  });
}

export async function fetchPage(rawUrl: string) {
  const started = Date.now();
  let current = new URL(rawUrl);

  for (let redirects = 0; redirects <= 5; redirects += 1) {
    if (!["http:", "https:"].includes(current.protocol)) {
      throw new MonitorValidationError("The website redirected to an unsupported protocol");
    }
    if (current.username || current.password) {
      throw new MonitorValidationError("The website redirected to a URL containing credentials");
    }
    const port = current.port;
    const expectedPort = current.protocol === "https:" ? "443" : "80";
    if (port && port !== expectedPort) {
      throw new MonitorValidationError("The website redirected to a non-standard port");
    }

    const pinnedAddress = await resolvePublicAddress(current);
    let response: Awaited<ReturnType<typeof requestPinned>>;
    try {
      response = await requestPinned(current, pinnedAddress);
    } catch (error) {
      if (error instanceof MonitorValidationError) throw error;
      throw new MonitorValidationError(
        error instanceof Error && error.message.includes("too long")
          ? "The website took too long to respond"
          : "We could not securely connect to that website",
      );
    }

    const status = response.statusCode;
    if (status >= 300 && status < 400) {
      const location = response.headers.location;
      if (!location) throw new MonitorValidationError("The website returned an empty redirect");
      try {
        current = new URL(location, current);
      } catch {
        throw new MonitorValidationError("The website returned an invalid redirect URL");
      }
      continue;
    }

    if (status < 200 || status >= 300) {
      throw new MonitorValidationError(`The website responded with HTTP ${status}`);
    }

    const contentType = response.headers["content-type"] ?? "";
    if (
      contentType &&
      !/text\/html|application\/xhtml|text\/plain|application\/xml|text\/xml/i.test(
        Array.isArray(contentType) ? contentType.join(" ") : contentType,
      )
    ) {
      throw new MonitorValidationError("That URL does not return a readable HTML page");
    }

    return {
      html: response.body,
      finalUrl: current.toString(),
      httpStatus: status,
      durationMs: Date.now() - started,
    };
  }

  throw new MonitorValidationError("The website redirected too many times");
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
  copy: "©",
  reg: "®",
  trade: "™",
  middot: "·",
  bull: "•",
  euro: "€",
  pound: "£",
  yen: "¥",
};

function decodeEntities(value: string): string {
  const decodeCodePoint = (raw: string, radix: number, original: string) => {
    const codePoint = Number.parseInt(raw, radix);
    if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
      return original;
    }
    try {
      return String.fromCodePoint(codePoint);
    } catch {
      return original;
    }
  };

  return value
    .replace(/&#(\d+);/g, (match, code: string) => decodeCodePoint(code, 10, match))
    .replace(/&#x([0-9a-f]+);/gi, (match, code: string) => decodeCodePoint(code, 16, match))
    .replace(/&([a-z][a-z0-9]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match);
}

function removeNonContentElements(html: string): string {
  let cleaned = html.replace(/<!--[\s\S]*?-->/g, " ");

  // These elements are not useful page copy and often contain large, volatile
  // payloads. Handle both paired elements and stray opening tags.
  cleaned = cleaned.replace(
    /<(script|style|noscript|svg|template|iframe|object|canvas|video|audio|head)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
    " ",
  );
  cleaned = cleaned.replace(/<(script|style|noscript|svg|template|iframe|object|canvas|video|audio|head)\b[^>]*\/?\s*>/gi, " ");

  // Hidden elements should not affect snapshots. This deliberately targets
  // explicit HTML hiding signals rather than guessing from arbitrary CSS.
  cleaned = cleaned.replace(
    /<([a-z][\w:-]*)\b(?=[^>]*(?:\bhidden(?:\s|=|>)|\baria-hidden\s*=\s*["']true["']|\bstyle\s*=\s*["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden)[^"']*["']))[^>]*>[\s\S]*?<\/\1\s*>/gi,
    " ",
  );

  return cleaned;
}

function stripTimestamps(line: string): string {
  return line
    .replace(
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(st|nd|rd|th)?,?\s+\d{2,4}\b/gi,
      "[date]",
    )
    .replace(/\b\d{4}-\d{2}-\d{2}(t\d{2}:\d{2}(:\d{2})?(\.\d+)?z?)?\b/gi, "[date]")
    .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, "[date]")
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?\s*(utc|gmt|[a-z]{2,4})?\b/gi, "[time]")
    .replace(
      /\b(\d+\s*(seconds?|minutes?|hours?|days?|weeks?|months?)\s+ago)\b/gi,
      "[time]",
    )
    .replace(/\b(last|next)\s+(updated|checked|modified)\b:?/gi, "$1 updated");
}

export function extractReadableText(html: string): string {
  let text = removeNonContentElements(html)
    .replace(/<(br|hr)\b[^>]*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|section|article|header|footer|main|li|tr|h[1-6]|blockquote|pre|table|ul|ol|form|nav)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<[^>]+>/g, " ");

  text = decodeEntities(text);

  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/[\t\u00a0]+/g, " ").replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 1 && /[\p{L}\p{N}]/u.test(line))
    .map((line) => stripTimestamps(line.normalize("NFC")));

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(line);
  }

  return unique.join("\n").slice(0, MAX_TEXT);
}

export function prepareContent(
  text: string,
  {
    keywords,
    ignoreKeywords,
  }: { keywords: string[]; ignoreKeywords: string[] },
): string {
  let lines = text.split("\n");

  const ignored = ignoreKeywords
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);
  if (ignored.length > 0) {
    lines = lines.filter(
      (line) => !ignored.some((word) => line.toLowerCase().includes(word)),
    );
  }

  const tracked = keywords.map((word) => word.trim().toLowerCase()).filter(Boolean);
  if (tracked.length > 0) {
    const matched = lines.filter((line) =>
      tracked.some((word) => line.toLowerCase().includes(word)),
    );
    // Keep a stable, non-empty baseline when none of the tracked terms exist.
    // This means unrelated page edits stay silent, while a tracked term
    // appearing later becomes a real change instead of a failed check.
    return matched.length > 0 ? matched.join("\n") : "No tracked keywords found.";
  }

  return lines.join("\n") || "No content remains after exclusions.";
}

export function contentHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function compactDiff(parts: DiffSegment[]): DiffSegment[] {
  const merged: DiffSegment[] = [];
  for (const part of parts) {
    const text = part.text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const previous = merged[merged.length - 1];
    if (previous && previous.type === part.type) {
      previous.text = `${previous.text} ${text}`.slice(0, 4000);
    } else {
      merged.push({ type: part.type, text: text.slice(0, 4000) });
    }
  }
  return merged.slice(0, 400);
}

export function buildDiff(before: string, after: string) {
  const parts = diffWordsWithSpace(before.slice(0, MAX_TEXT), after.slice(0, MAX_TEXT));
  const segments: DiffSegment[] = compactDiff(
    parts.map((part) => ({
      type: part.added ? "added" : part.removed ? "removed" : "unchanged",
      text: part.value,
    })),
  );

  const addedText = segments
    .filter((segment) => segment.type === "added")
    .map((segment) => segment.text)
    .join(" ")
    .slice(0, 12_000);
  const removedText = segments
    .filter((segment) => segment.type === "removed")
    .map((segment) => segment.text)
    .join(" ")
    .slice(0, 12_000);

  const changedSignificant = `${addedText} ${removedText}`.replace(
    /[^\p{L}\p{N}]/gu,
    "",
  );
  const isMeaningful = changedSignificant.length >= 3;
  const denominator = Math.max(before.length, after.length, 1);
  const changeScore = Math.min(
    100,
    Math.round(((addedText.length + removedText.length) / denominator) * 100),
  );

  return {
    segments,
    addedText,
    removedText,
    isMeaningful,
    changeScore,
    summary: buildSummary({ addedText, removedText, segments }),
  };
}

function buildSummary({
  addedText,
  removedText,
  segments,
}: {
  addedText: string;
  removedText: string;
  segments: DiffSegment[];
}) {
  const addedCount = segments.filter((segment) => segment.type === "added").length;
  const removedCount = segments.filter((segment) => segment.type === "removed").length;

  if (addedText && removedText) {
    const pricePattern = /\b(USD|EUR|GBP|INR)\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)|(\$|€|£|₹)\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/gi;
    const parsePrices = (text: string) =>
      Array.from(text.matchAll(pricePattern), (match) => {
        const currency = (match[1] ?? match[3]).toUpperCase();
        const amountText = match[2] ?? match[4];
        const amount = Number(amountText.replace(/,/g, ""));
        return {
          currency,
          amount,
          label: match[1] ? `${currency} ${amountText}` : `${currency}${amountText}`,
        };
      }).filter((price) => Number.isFinite(price.amount));

    const removedPrices = parsePrices(removedText);
    const addedPrices = parsePrices(addedText);
    if (removedPrices.length === 1 && addedPrices.length === 1) {
      const [previousPrice] = removedPrices;
      const [nextPrice] = addedPrices;
      if (previousPrice.currency === nextPrice.currency && previousPrice.amount !== nextPrice.amount) {
        const direction = nextPrice.amount > previousPrice.amount ? "increased" : "decreased";
        const percentage = previousPrice.amount > 0
          ? Math.round(((nextPrice.amount - previousPrice.amount) / previousPrice.amount) * 100)
          : null;
        const movement = percentage === null
          ? ""
          : ` (${percentage > 0 ? "+" : ""}${percentage}%)`;
        return `Price ${direction}: ${previousPrice.label} → ${nextPrice.label}${movement}.`;
      }
    }

    return `Text was modified in ${Math.max(addedCount, removedCount)} place${Math.max(addedCount, removedCount) === 1 ? "" : "s"}, with ${removedText.length} characters removed and ${addedText.length} added.`;
  }
  if (addedText) {
    return `${addedText.length} new characters of text appeared on the page.`;
  }
  if (removedText) {
    return `${removedText.length} characters of text were removed from the page.`;
  }
  return "The page content changed.";
}

function nextCheckFrom(frequency: string): Date {
  return new Date(Date.now() + frequencyMinutes(frequency) * 60_000);
}

function appBaseUrl(): string {
  return (
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:4000"
  ).replace(/\/$/, "");
}

async function updateEmailDeliveryBestEffort(
  notificationId: string,
  values: Partial<typeof notifications.$inferInsert>,
) {
  try {
    await db.update(notifications).set(values).where(eq(notifications.id, notificationId));
  } catch (error) {
    console.error("Could not update notification delivery status", notificationId, error);
  }
}

export type CheckResult = {
  status: "baseline" | "unchanged" | "changed" | "failed";
  changeId?: string;
  summary?: string;
  error?: string;
  httpStatus?: number;
};

export async function runMonitorCheck(
  monitor: Monitor,
  options: { notify?: boolean } = {},
): Promise<CheckResult> {
  try {
    // Network I/O stays outside the database transaction. The transaction below
    // serializes commits for this monitor and persists each result atomically.
    const fetched = await fetchPage(monitor.url);
    const rawText = extractReadableText(fetched.html);
    if (!rawText.trim()) {
      throw new MonitorValidationError(
        "No readable text was found. The page may render content with JavaScript.",
      );
    }

    const compared = prepareContent(rawText, {
      keywords: monitor.keywords,
      ignoreKeywords: monitor.ignoreKeywords,
    });

    const hash = contentHash(compared);
    const checkedAt = new Date();

    const persisted = await db.transaction(async (tx) => {
      // Lock the monitor while reading its latest snapshot and writing this run.
      // This also protects manual checks that do not pass through the cron claim.
      const [lockedMonitor] = await tx
        .select()
        .from(monitors)
        .where(eq(monitors.id, monitor.id))
        .for("update");

      if (!lockedMonitor) {
        throw new MonitorValidationError("This monitor no longer exists");
      }

      const [previous] = await tx
        .select()
        .from(snapshots)
        .where(eq(snapshots.monitorId, monitor.id))
        .orderBy(desc(snapshots.createdAt))
        .limit(1);

      const nextCheckAt = nextCheckFrom(lockedMonitor.frequency);

      if (!previous) {
        const [snapshot] = await tx
          .insert(snapshots)
          .values({
            monitorId: monitor.id,
            content: compared,
            contentHash: hash,
            wordCount: compared.split(/\s+/).length,
          })
          .returning();

        await tx
          .update(monitors)
          .set({
            latestSnapshotId: snapshot.id,
            status: "active",
            lastCheckedAt: checkedAt,
            lastError: null,
            nextCheckAt,
            updatedAt: checkedAt,
          })
          .where(eq(monitors.id, monitor.id));

        await tx.insert(checkRuns).values({
          monitorId: monitor.id,
          userId: lockedMonitor.userId,
          status: "baseline",
          httpStatus: fetched.httpStatus,
          durationMs: fetched.durationMs,
        });

        return { status: "baseline" as const };
      }

      if (previous.contentHash === hash) {
        await tx
          .update(monitors)
          .set({
            status: "active",
            lastCheckedAt: checkedAt,
            lastError: null,
            nextCheckAt,
            updatedAt: checkedAt,
          })
          .where(eq(monitors.id, monitor.id));

        await tx.insert(checkRuns).values({
          monitorId: monitor.id,
          userId: lockedMonitor.userId,
          status: "unchanged",
          httpStatus: fetched.httpStatus,
          durationMs: fetched.durationMs,
        });

        return { status: "unchanged" as const };
      }

      const diff = buildDiff(previous.content, compared);
      const [snapshot] = await tx
        .insert(snapshots)
        .values({
          monitorId: monitor.id,
          content: compared,
          contentHash: hash,
          wordCount: compared.split(/\s+/).length,
        })
        .returning();

      if (!diff.isMeaningful) {
        await tx
          .update(monitors)
          .set({
            latestSnapshotId: snapshot.id,
            status: "active",
            lastCheckedAt: checkedAt,
            lastError: null,
            nextCheckAt,
            updatedAt: checkedAt,
          })
          .where(eq(monitors.id, monitor.id));

        await tx.insert(checkRuns).values({
          monitorId: monitor.id,
          userId: lockedMonitor.userId,
          status: "unchanged",
          httpStatus: fetched.httpStatus,
          durationMs: fetched.durationMs,
        });

        return { status: "unchanged" as const };
      }

      const [change] = await tx
        .insert(changes)
        .values({
          monitorId: monitor.id,
          userId: lockedMonitor.userId,
          fromSnapshotId: previous.id,
          toSnapshotId: snapshot.id,
          summary: diff.summary,
          addedText: diff.addedText,
          removedText: diff.removedText,
          diff: diff.segments,
          changeScore: diff.changeScore,
        })
        .returning();

      await tx
        .update(monitors)
        .set({
          latestSnapshotId: snapshot.id,
          status: "active",
          lastCheckedAt: checkedAt,
          lastChangedAt: checkedAt,
          lastError: null,
          nextCheckAt,
          updatedAt: checkedAt,
        })
        .where(eq(monitors.id, monitor.id));

      await tx.insert(checkRuns).values({
        monitorId: monitor.id,
        userId: lockedMonitor.userId,
        status: "changed",
        httpStatus: fetched.httpStatus,
        durationMs: fetched.durationMs,
        changeId: change.id,
      });

      const [notification] = await tx
        .insert(notifications)
        .values({
          userId: lockedMonitor.userId,
          monitorId: monitor.id,
          changeId: change.id,
          type: "change",
          title: `${lockedMonitor.name} changed`,
          body: diff.summary,
          emailStatus:
            options.notify !== false && lockedMonitor.notifyEmail
              ? "pending"
              : "disabled",
        })
        .returning();

      return {
        status: "changed" as const,
        changeId: change.id,
        notificationId: notification.id,
        previousContent: previous.content,
        diffSummary: diff.summary,
        notifyEmail: lockedMonitor.notifyEmail,
        monitorName: lockedMonitor.name,
        monitorUrl: lockedMonitor.url,
      };
    });

    if (persisted.status !== "changed") {
      return { status: persisted.status, httpStatus: fetched.httpStatus };
    }

    // External services are deliberately called only after the DB transaction
    // commits. Their failures update delivery metadata, not the check result.
    let finalSummary = persisted.diffSummary;
    let aiSummary: string | null = null;
    if (isAiConfigured()) {
      try {
        aiSummary = await summarizeChange({
          siteName: persisted.monitorName,
          before: persisted.previousContent,
          after: compared,
        });
        if (aiSummary && !persisted.diffSummary.startsWith("Price ")) {
          finalSummary = aiSummary;
          await db
            .update(changes)
            .set({ aiSummary })
            .where(eq(changes.id, persisted.changeId));
          await db
            .update(notifications)
            .set({ body: aiSummary })
            .where(eq(notifications.id, persisted.notificationId));
        }
      } catch (error) {
        console.error("AI change summary failed", persisted.changeId, error);
      }
    }

    if (options.notify !== false && persisted.notifyEmail) {
      const [preferences] = await db
        .select({ emailAlerts: userPreferences.emailAlerts })
        .from(userPreferences)
        .where(eq(userPreferences.userId, monitor.userId))
        .limit(1);
      if (preferences?.emailAlerts === false) {
        await updateEmailDeliveryBestEffort(persisted.notificationId, {
          emailStatus: "disabled",
          emailError: null,
          emailLockedUntil: null,
          emailNextAttemptAt: null,
        });
      } else if (!isEmailConfigured()) {
        await updateEmailDeliveryBestEffort(persisted.notificationId, {
          emailStatus: "not_configured",
          emailError: null,
        });
      } else {
        const lockUntil = new Date(Date.now() + EMAIL_LOCK_MS);
        let claimedForImmediateSend = false;
        try {
          const [claimed] = await db.update(notifications).set({
            emailStatus: "sending",
            emailAttempts: 1,
            emailLockedUntil: lockUntil,
            emailNextAttemptAt: null,
            emailError: null,
          }).where(eq(notifications.id, persisted.notificationId)).returning({ id: notifications.id });
          claimedForImmediateSend = Boolean(claimed);
        } catch (error) {
          console.error("Could not claim notification for immediate email delivery", persisted.notificationId, error);
        }

        if (claimedForImmediateSend) {
          try {
            const [owner] = await db
              .select({ email: user.email })
              .from(user)
              .where(eq(user.id, monitor.userId))
              .limit(1);

            if (!owner?.email) throw new Error("No email address is available for this account.");

            const delivery = await sendChangeAlert({
              to: owner.email,
              siteName: persisted.monitorName,
              siteUrl: persisted.monitorUrl,
              summary: finalSummary,
              monitorUrl: `${appBaseUrl()}/dashboard/monitors/${monitor.id}`,
              idempotencyKey: `changeradar-notification-${persisted.notificationId}`,
            });
            await updateEmailDeliveryBestEffort(persisted.notificationId, {
              emailStatus: "sent",
              emailError: null,
              emailLockedUntil: null,
              emailNextAttemptAt: null,
              emailSentAt: new Date(),
              emailProviderId: delivery.id ?? null,
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Email failed";
            await updateEmailDeliveryBestEffort(persisted.notificationId, {
              emailStatus: "failed",
              emailError: message.slice(0, 500),
              emailLockedUntil: null,
              emailNextAttemptAt: new Date(Date.now() + EMAIL_RETRY_DELAYS_MS[0]),
            });
          }
        }
      }
    }

    return {
      status: "changed",
      changeId: persisted.changeId,
      summary: finalSummary,
      httpStatus: fetched.httpStatus,
    };
  } catch (error) {
    const message =
      error instanceof MonitorValidationError
        ? error.message
        : error instanceof Error && error.name === "TimeoutError"
          ? "The website did not respond within 20 seconds"
          : error instanceof Error
            ? error.message
            : "The check failed";

    // A failed check's monitor state and check-run record must agree. If either
    // write fails, PostgreSQL rolls both back and the caller can retry safely.
    await db.transaction(async (tx) => {
      const [updatedMonitor] = await tx
        .update(monitors)
        .set({
          status: "error",
          lastCheckedAt: new Date(),
          lastError: message,
          nextCheckAt: nextCheckFrom(monitor.frequency),
          updatedAt: new Date(),
        })
        .where(eq(monitors.id, monitor.id))
        .returning({ id: monitors.id });

      // The monitor may have been deleted while its HTTP request was running.
      // In that case there is no longer a valid check-run parent row.
      if (updatedMonitor) {
        await tx.insert(checkRuns).values({
          monitorId: monitor.id,
          userId: monitor.userId,
          status: "failed",
          error: message,
        });
      }
    });

    return { status: "failed", error: message };
  }
}

const SCHEDULED_CHECK_CONCURRENCY = 10;
const SCHEDULED_CHECK_LEASE_MS = 2 * 60_000;
const MAX_SCHEDULED_CHECKS_PER_RUN = 10;

/** Retry transient email failures and recover notifications left in-flight by a timed-out function. */
export async function retryPendingNotificationEmails(limit = 20) {
  if (!isEmailConfigured()) return { attempted: 0, sent: 0, failed: 0 };

  const now = new Date();
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
  const claimed = await db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: notifications.id,
        attempts: notifications.emailAttempts,
      })
      .from(notifications)
      .where(and(
        or(
          lt(notifications.emailAttempts, MAX_EMAIL_ATTEMPTS),
          and(
            eq(notifications.emailStatus, "sending"),
            lte(notifications.emailLockedUntil, now),
            gte(notifications.emailAttempts, MAX_EMAIL_ATTEMPTS),
          ),
        ),
        or(
          eq(notifications.emailStatus, "pending"),
          eq(notifications.emailStatus, "failed"),
          and(
            eq(notifications.emailStatus, "sending"),
            lte(notifications.emailLockedUntil, now),
          ),
        ),
        or(isNull(notifications.emailNextAttemptAt), lte(notifications.emailNextAttemptAt, now)),
      ))
      .orderBy(notifications.createdAt)
      .limit(safeLimit)
      .for("update", { skipLocked: true });

    const ready: Array<{ id: string; attempts: number }> = [];
    for (const row of rows) {
      if (row.attempts >= MAX_EMAIL_ATTEMPTS) {
        await tx.update(notifications).set({
          emailStatus: "failed",
          emailError: "Email delivery timed out after the maximum number of attempts.",
          emailLockedUntil: null,
          emailNextAttemptAt: null,
        }).where(eq(notifications.id, row.id));
        continue;
      }
      await tx.update(notifications).set({
        emailStatus: "sending",
        emailAttempts: row.attempts + 1,
        emailLockedUntil: new Date(Date.now() + EMAIL_LOCK_MS),
        emailNextAttemptAt: null,
        emailError: null,
      }).where(eq(notifications.id, row.id));
      ready.push({ id: row.id, attempts: row.attempts + 1 });
    }

    return ready;
  });

  let sent = 0;
  let failed = 0;
  for (const item of claimed) {
    try {
      const [details] = await db
        .select({
          email: user.email,
          siteName: monitors.name,
          siteUrl: monitors.url,
          summary: notifications.body,
          monitorId: notifications.monitorId,
          emailAlerts: userPreferences.emailAlerts,
        })
        .from(notifications)
        .innerJoin(user, eq(user.id, notifications.userId))
        .innerJoin(monitors, eq(monitors.id, notifications.monitorId))
        .leftJoin(userPreferences, eq(userPreferences.userId, notifications.userId))
        .where(eq(notifications.id, item.id))
        .limit(1);

      if (!details?.email || !details.monitorId) {
        throw new Error("The notification recipient or monitored page is no longer available.");
      }
      if (details.emailAlerts === false) {
        await db.update(notifications).set({
          emailStatus: "disabled",
          emailError: null,
          emailLockedUntil: null,
          emailNextAttemptAt: null,
        }).where(eq(notifications.id, item.id));
        continue;
      }

      const delivery = await sendChangeAlert({
        to: details.email,
        siteName: details.siteName,
        siteUrl: details.siteUrl,
        summary: details.summary,
        monitorUrl: `${appBaseUrl()}/dashboard/monitors/${details.monitorId}`,
        idempotencyKey: `changeradar-notification-${item.id}`,
      });

      await db.update(notifications).set({
        emailStatus: "sent",
        emailError: null,
        emailLockedUntil: null,
        emailNextAttemptAt: null,
        emailSentAt: new Date(),
        emailProviderId: delivery.id ?? null,
      }).where(eq(notifications.id, item.id));
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email failed";
      const retryDelay = EMAIL_RETRY_DELAYS_MS[item.attempts - 1];
      await db.update(notifications).set({
        emailStatus: "failed",
        emailError: message.slice(0, 500),
        emailLockedUntil: null,
        emailNextAttemptAt: retryDelay ? new Date(Date.now() + retryDelay) : null,
      }).where(eq(notifications.id, item.id));
      failed += 1;
    }
  }

  return { attempted: claimed.length, sent, failed };
}

export async function runDueMonitors(limit = MAX_SCHEDULED_CHECKS_PER_RUN) {
  // Claim due rows inside a short transaction. FOR UPDATE SKIP LOCKED makes
  // overlapping cron invocations take different monitors instead of checking
  // the same monitor twice. Moving nextCheckAt forward is also a crash-safe
  // lease: if this worker dies, the monitor becomes eligible again after the
  // lease expires.
  const requestedLimit = Number.isFinite(limit) ? Math.floor(limit) : MAX_SCHEDULED_CHECKS_PER_RUN;
  const safeLimit = Math.max(1, Math.min(requestedLimit, MAX_SCHEDULED_CHECKS_PER_RUN));
  const claimedAt = new Date();
  const leaseUntil = new Date(claimedAt.getTime() + SCHEDULED_CHECK_LEASE_MS);

  const due = await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(monitors)
      .where(
        and(
          inArray(monitors.status, ["active", "error"]),
          lte(monitors.nextCheckAt, claimedAt),
        ),
      )
      .orderBy(monitors.nextCheckAt)
      .limit(safeLimit)
      .for("update", { skipLocked: true });

    if (rows.length > 0) {
      await tx
        .update(monitors)
        .set({ nextCheckAt: leaseUntil, updatedAt: claimedAt })
        .where(inArray(monitors.id, rows.map((monitor) => monitor.id)));
    }

    return rows;
  });

  const results: Array<{ monitorId: string; result: CheckResult }> = [];
  for (let index = 0; index < due.length; index += SCHEDULED_CHECK_CONCURRENCY) {
    const batch = due.slice(index, index + SCHEDULED_CHECK_CONCURRENCY);
    const settled = await Promise.all(
      batch.map(async (monitor) => {
        try {
          return { monitorId: monitor.id, result: await runMonitorCheck(monitor) };
        } catch (error) {
          console.error("Scheduled check crashed", monitor.id, error);
          return {
            monitorId: monitor.id,
            result: { status: "failed", error: "Unexpected error while checking" } as CheckResult,
          };
        }
      }),
    );
    results.push(...settled);
  }
  return results;
}
