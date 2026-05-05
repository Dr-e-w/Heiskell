export function loadConfig(env = process.env) {
  const ghostAdminApiUrl = trimTrailingSlash(env.GHOST_ADMIN_API_URL || "");
  const ghostAdminApiKey = env.GHOST_ADMIN_API_KEY || "";
  const ghostAdminApiVersion = env.GHOST_ADMIN_API_VERSION || "v5.0";
  const openAiApiKey = env.OPENAI_API_KEY || "";
  const openAiModel = env.OPENAI_MODEL || "gpt-5.2";
  const sourceFeedUrls = parseList(env.SOURCE_FEED_URLS || "");
  const sourceManifestPath = env.SOURCE_MANIFEST_PATH || "sources.txt";
  const dryRun = env.DRY_RUN === "true";

  return {
    ghostAdminApiUrl,
    ghostAdminApiKey,
    ghostAdminApiVersion,
    openAiApiKey,
    openAiModel,
    sourceFeedUrls,
    sourceManifestPath,
    dryRun
  };
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function parseList(value) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}