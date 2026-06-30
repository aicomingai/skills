# API Key Security — Handling `AICOMING_API_KEY`

The AIComing key (`sk-...`) is a bearer credential: anyone holding it can spend the account's balance. Treat it like a password. These rules are mandatory for this skill.

## Rules

1. **Never print, echo, or write a full `sk-` key** into chat, code, files, logs, commit messages, screenshots, or command-line arguments. A key pasted into any of these is compromised — tell the user to rotate it.
2. **Read the key only from the environment variable** `AICOMING_API_KEY`. Do not hardcode it in source, config committed to git, or example snippets.
   ```python
   api_key = os.environ["AICOMING_API_KEY"]   # ✅
   api_key = "sk-07305a..."                    # ❌ never
   ```
3. **When you must show a key, mask it**: `sk-0730**********24bb3`. Use `scripts/sanitize.js` (`maskKey`).
4. **Don't ask the user to paste their key into the chat.** Have them export it instead:
   ```bash
   export AICOMING_API_KEY="sk-..."          # add to ~/.bashrc / ~/.zshrc to persist
   ```
   If a key has already been pasted into a chat/issue/PR, treat it as leaked and tell the user to regenerate it in the console.
5. **Prefer the provided scripts over ad-hoc `curl`** for calling AIComing — `scripts/api.js` adds the auth header from the env var and masks any secret in the response, so keys never land in tool output.
6. **`.gitignore` the real key.** `.env` must never be committed; only `.env.example` (with a placeholder) belongs in git.

## Using the key without exposing it

- **In code**: reference `os.environ["AICOMING_API_KEY"]` / `process.env.AICOMING_API_KEY`. The literal never appears in your source.
- **In the shell / one-off calls**: the env var expands without you typing the value:
  ```bash
  curl https://api.aicoming.top/v1/balance -H "Authorization: Bearer $AICOMING_API_KEY"
  ```
- **Via the skill's caller** (auto-auth + auto-mask):
  ```bash
  node scripts/api.js GET /v1/balance
  node scripts/api.js GET /v1/models
  ```

## Rotation

If a key is leaked (or you're unsure), rotate it: AIComing Console → API keys → regenerate, then re-export the new value. Old key stops working immediately.
