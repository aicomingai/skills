/**
 * Generic, secret-safe API caller for AIComing (aicoming.top).
 *
 *   node api.js <METHOD> <PATH> [JSON_BODY]
 *
 * - Reads the key from AICOMING_API_KEY (never pass it on the command line).
 * - Adds `Authorization: Bearer $AICOMING_API_KEY` automatically.
 * - Masks any sk-... key in the response before printing, so secrets never
 *   reach AI-readable output.
 *
 * Examples:
 *   node api.js GET  /v1/models
 *   node api.js GET  /v1/balance
 *   node api.js POST /v1/chat/completions '{"model":"gpt-5.4-mini","messages":[{"role":"user","content":"hi"}],"max_tokens":50}'
 *
 * Zero dependencies — native fetch + JSON. Runs on node (>=18), bun, deno.
 */

const { API_KEY, BASE_URL } = require("./env");
const { sanitize, walk } = require("./sanitize");

const [method, urlPath, body] = process.argv.slice(2);

if (!method || !urlPath) {
  console.error("Usage: node api.js <METHOD> <PATH> [JSON_BODY]");
  console.error("  e.g. node api.js GET /v1/models");
  process.exit(1);
}

async function main() {
  const opts = {
    method: method.toUpperCase(),
    headers: { Authorization: `Bearer ${API_KEY}` },
  };
  if (body) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = body;
  }

  const res = await fetch(`${BASE_URL}${urlPath.startsWith("/") ? "" : "/"}${urlPath}`, opts);
  const text = await res.text();

  if (res.status >= 400) {
    console.error(`HTTP ${res.status}:`);
    console.error(sanitize(text));
    process.exit(1);
  }

  // Mask any secrets before printing.
  try {
    console.log(JSON.stringify(walk(JSON.parse(text)), null, 2));
  } catch {
    console.log(sanitize(text));
  }
}

main().catch((err) => {
  console.error(sanitize(String(err && err.message ? err.message : err)));
  process.exit(1);
});
