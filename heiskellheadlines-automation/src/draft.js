export function buildDraft({ slot, sources }) {
  const date = new Date().toISOString().slice(0, 10);
  const title = `Hagerstown local briefing: ${date}`;
  const slug = `hagerstown-local-briefing-${date}-${slot}`;
  const lead = `A quick local briefing for ${formatSlot(slot)} with the most relevant Hagerstown-area items found in the current source set.`;
  const highlights = sources.slice(0, 3).map((item) => item.title);
  const body = renderDraftHtml({ date, slot, lead, highlights, sources });

  return {
    title,
    slug,
    excerpt: lead,
    html: body,
    tags: ["Hagerstown", "Maryland", "Local News", "Briefing", slot]
  };
}

export async function buildDraftFromSources({
  slot,
  sources,
  openAiApiKey,
  openAiModel
}) {
  const date = new Date().toISOString().slice(0, 10);
  const normalizedSources = sources.slice(0, 8);

  if (!openAiApiKey) {
    return buildDraft({ slot, sources: normalizedSources });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: openAiModel,
      input: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: [
                "You write concise local-news drafts for a superlocal outlet.",
                "Make the copy sound like a real newsroom briefing, not a generic roundup.",
                "Prefer a direct lead, a 'Why it matters' section, and source-specific bullet points.",
                "Return only valid JSON matching the requested schema.",
                "Keep claims grounded in the provided source items."
              ].join(" ")
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: JSON.stringify({
                date,
                slot,
                sources: normalizedSources
              })
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "ghost_post_draft",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              slug: { type: "string" },
              excerpt: { type: "string" },
              lead: { type: "string" },
              html: { type: "string" },
              tags: {
                type: "array",
                items: { type: "string" },
                minItems: 3
              }
            },
            required: ["title", "slug", "excerpt", "lead", "html", "tags"]
          }
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI draft generation failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  const text = payload.output_text || "";
  const draft = JSON.parse(text);
  return {
    ...draft,
    html: draft.html || renderDraftHtml({
      date,
      slot,
      lead: draft.lead || draft.excerpt || "",
      highlights: normalizedSources.slice(0, 3).map((item) => item.title),
      sources: normalizedSources
    }),
    tags: Array.from(new Set([...(draft.tags || []), "Hagerstown", "Maryland", "Briefing", slot]))
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderDraftHtml({ date, slot, lead, highlights, sources }) {
  const highlightList = highlights.length
    ? `<ul class="post-highlights">${highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "<p>No top items were identified.</p>";

  const sourceCards = sources.map((item) => {
    const link = item.url ? `<a href="${escapeHtml(item.url)}" rel="nofollow noopener noreferrer">Read source</a>` : "";
    const dateLine = item.publishedAt ? `<p class="source-meta">${escapeHtml(item.publishedAt)}</p>` : "";
    return [
      '<article class="source-card">',
      `<h3>${escapeHtml(item.title)}</h3>`,
      dateLine,
      `<p>${escapeHtml(item.summary || "No summary available.")}</p>`,
      link ? `<p>${link}</p>` : "",
      "</article>"
    ].join("");
  }).join("");

  return [
    `<p class="post-meta"><strong>${escapeHtml(date)}</strong> · ${escapeHtml(formatSlot(slot))}</p>`,
    `<p class="post-lead">${escapeHtml(lead)}</p>`,
    "<h2>Top lines</h2>",
    highlightList,
    "<h2>Source items</h2>",
    `<div class="source-grid">${sourceCards}</div>`,
    "<hr>",
    "<p><em>Editorial note:</em> This draft was assembled automatically from the current source set and should be checked before publishing.</p>"
  ].join("");
}

function formatSlot(slot) {
  if (slot === "morning") return "morning edition";
  if (slot === "evening") return "evening edition";
  return slot;
}