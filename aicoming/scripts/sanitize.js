/**
 * Masks AIComing/OpenAI-style secret keys in any text so they never reach
 * AI-readable output, logs, or chat.
 *
 *   sk-07305a87...bb3  ->  sk-0730**********24bb3
 *
 * Zero dependencies. Runs on node (>=18), bun, deno.
 */

function maskKey(value) {
  if (typeof value !== "string") return value;
  const m = value.match(/^sk-(.+)$/);
  const raw = m ? m[1] : value;
  if (!raw) return value;
  const masked =
    raw.length <= 4
      ? "*".repeat(raw.length)
      : raw.length <= 8
        ? raw.slice(0, 2) + "****" + raw.slice(-2)
        : raw.slice(0, 4) + "**********" + raw.slice(-4);
  return (m ? "sk-" : "") + masked;
}

// Replace any sk-... token embedded in free text.
function sanitize(text) {
  if (typeof text !== "string") return text;
  return text.replace(/sk-[A-Za-z0-9_\-]{6,}/g, (tok) => maskKey(tok));
}

// Recursively mask `key`/`secret`/`api_key` fields and sk- values in an object.
function walk(node) {
  if (Array.isArray(node)) return node.map(walk);
  if (node !== null && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] =
        typeof v === "string" && /^(key|secret|api_key|token)$/i.test(k)
          ? maskKey(v)
          : walk(v);
    }
    return out;
  }
  if (typeof node === "string") return sanitize(node);
  return node;
}

module.exports = { maskKey, sanitize, walk };
