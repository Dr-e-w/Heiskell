import crypto from "node:crypto";

export function createGhostClient({ adminApiUrl, adminApiKey, adminApiVersion }) {
  const [id, secret] = adminApiKey.split(":");
  if (!adminApiUrl || !id || !secret) {
    throw new Error("Ghost Admin API config is incomplete.");
  }

  const token = createAdminJwt(id, secret);
  const baseUrl = `${adminApiUrl}/ghost/api/admin/${adminApiVersion}`;

  return {
    async createDraft(post) {
      const response = await fetch(`${baseUrl}/posts/?source=html`, {
        method: "POST",
        headers: {
          Authorization: `Ghost ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          posts: [
            {
              title: post.title,
              slug: post.slug,
              html: post.html,
              status: "draft",
              excerpt: post.excerpt,
              tags: post.tags.map((name) => ({ name }))
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Ghost draft creation failed: ${response.status} ${await response.text()}`);
      }

      return response.json();
    }
  };
}

function createAdminJwt(id, secret) {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT", kid: id }));
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = base64Url(JSON.stringify({
    iat: issuedAt,
    exp: issuedAt + 5 * 60,
    aud: "/admin/"
  }));

  const unsigned = `${header}.${payload}`;
  const signature = crypto
    .createHmac("sha256", Buffer.from(secret, "hex"))
    .update(unsigned)
    .digest("base64url");

  return `${unsigned}.${signature}`;
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}