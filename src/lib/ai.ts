import "server-only";

export function isAiConfigured(): boolean {
  return Boolean(process.env.ZAI_API_KEY && process.env.ZAI_API_BASE);
}

export async function summarizeChange({
  siteName,
  before,
  after,
}: {
  siteName: string;
  before: string;
  after: string;
}): Promise<string | null> {
  const apiKey = process.env.ZAI_API_KEY;
  const baseUrl = process.env.ZAI_API_BASE;

  if (!apiKey || !baseUrl) return null;

  const model = process.env.ZAI_MODEL ?? "glm-4-flash";
  const endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content:
              "You summarise changes to monitored website pages. Write two short sentences: first state precisely what changed, then why it may matter to someone tracking this page. Be factual and neutral. Never invent details that are not in the provided text.",
          },
          {
            role: "user",
            content: `Website: ${siteName}\n\nBEFORE:\n${before.slice(0, 5000)}\n\nAFTER:\n${after.slice(0, 5000)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI summary failed", response.status);
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const summary = data.choices?.[0]?.message?.content?.trim();
    return summary ? summary.slice(0, 900) : null;
  } catch (error) {
    console.error("AI summary request failed", error);
    return null;
  }
}
