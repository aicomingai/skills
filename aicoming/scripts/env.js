/**
 * Resolves AIComing config from the environment.
 * Zero dependencies. Runs on node (>=18), bun, deno.
 *
 * Env:
 *   AICOMING_API_KEY   (required) — the sk-... relay key
 *   AICOMING_BASE_URL  (optional) — defaults to https://api.aicoming.top
 */

const API_KEY = process.env.AICOMING_API_KEY || "";
const BASE_URL = (process.env.AICOMING_BASE_URL || "https://api.aicoming.top").replace(/\/+$/, "");

if (!API_KEY) {
  console.error(
    "AICOMING_API_KEY is not set. Export it first:\n" +
      '  export AICOMING_API_KEY="sk-..."   (get one at https://aicoming.top/console)'
  );
  process.exit(1);
}

module.exports = { API_KEY, BASE_URL };
