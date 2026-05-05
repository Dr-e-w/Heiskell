import { loadConfig } from "./config.js";
import { createGhostClient } from "./ghost.js";
import { buildDraftFromSources } from "./draft.js";
import fs from "node:fs/promises";

const slot = resolveSlot(process.argv.slice(2));
const config = loadConfig();

if (!config.ghostAdminApiUrl || !config.ghostAdminApiKey) {
  throw new Error("Set GHOST_ADMIN_API_URL and GHOST_ADMIN_API_KEY before running.");
}

const sources = await loadSources(config);
const draft = await buildDraftFromSources({
  slot,
  sources,
  openAiApiKey: config.openAiApiKey,
  openAiModel: config.openAiModel
});
const ghost = createGhostClient({
  adminApiUrl: config.ghostAdminApiUrl,
  adminApiKey: config.ghostAdminApiKey,
  adminApiVersion: config.ghostAdminApiVersion
});

const result = await ghost.createDraft(draft);
console.log(JSON.stringify({
  ok: true,
  slot,
  title: draft.title,
  slug: draft.slug,
  ghostId: result.posts?.[0]?.id || null
}, null, 2));

async function loadSources({ sourceFeedUrls, sourceManifestPath }) {
  const manifestUrls = await loadSourceManifest(sourceManifestPath);
  const allUrls = Array.from(new Set([...sourceFeedUrls, ...manifestUrls]));

  if (allUrls.length === 0) {
    return [
      { title: "Add source feeds", summary: "Set SOURCE_FEED_URLS or sources.txt to enable live ingestion." }
    ];
  }

  const items = [];
  for (const url of allUrls) {
    const xml = await fetch(url).then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load source feed ${url}: ${res.status}`);
      }
      return res.text();
    });
    items.push(...parseRssItems(xml, url));
  }

  return items.slice(0, 12);
}

async function loadSourceManifest(sourceManifestPath) {
  try {
    const file = await fs.readFile(sourceManifestPath, "utf8");
    return file
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function parseRssItems(xml, sourceUrl) {
  const items = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const block of itemBlocks.slice(0, 6)) {
    items.push({
      title: extractTag(block, "title") || `Story from ${sourceUrl}`,
      summary: stripHtml(extractTag(block, "description") || extractTag(block, "summary") || ""),
      url: extractTag(block, "link") || sourceUrl,
      publishedAt: extractTag(block, "pubDate") || null
    });
  }
  return items;
}

function extractTag(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\/${tagName}>`, "i"));
  return match ? decodeEntities(match[1].trim()) : "";
}

function stripHtml(value) {
  return decodeEntities(String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function decodeEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function resolveSlot(args) {
  const slotArgIndex = args.indexOf("--slot");
  if (slotArgIndex >= 0 && args[slotArgIndex + 1]) {
    return args[slotArgIndex + 1];
  }
  return "manual";
}