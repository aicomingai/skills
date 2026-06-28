# Model Discovery — Query the Live Model List

> **The single most important rule of this skill:** never hard-code or guess a model ID. Always fetch the live list first. Models on AIComing change constantly.

## Two endpoints — pick the right one

| Endpoint | Auth | Returns | Model id field |
|----------|------|---------|----------------|
| `GET /v1/models` | API key (for access) | OpenAI-standard list of models the gateway can route to. NOT filtered by the key's subscriptions. | `id` |
| `GET /api/v1/models` | none | Rich public catalog (pricing, providers, vendors, latency). | `name` (the `id` here is a numeric DB key) |

> Neither list is per-key. Whether a call actually succeeds is enforced at request time (subscription + balance) — see `account.md`.

## OpenAI-standard list (key required for access)

This is what OpenAI-compatible clients (CC Switch, Codex…) read. Returns `{"object":"list","data":[{"id":"gpt-5.5","object":"model","owned_by":"aicoming"}]}`.

```bash
curl https://api.aicoming.top/v1/models \
  -H "Authorization: Bearer $AICOMING_API_KEY"
```

```python
import os, requests

def gateway_models() -> list:
    resp = requests.get(
        "https://api.aicoming.top/v1/models",
        headers={"Authorization": f"Bearer {os.environ['AICOMING_API_KEY']}"},
        timeout=30,
    )
    resp.raise_for_status()
    return [m["id"] for m in resp.json()["data"]]

for mid in gateway_models():
    print(mid)
```

> Pass the `id` value as `"model"` in your requests.

## Public Catalog — Rich Marketplace Data (no auth)

Use this to browse, compare pricing, or show vendors/providers. Here the model id you pass in requests is the **`name`** field.

```
GET https://api.aicoming.top/api/v1/models
```

```bash
curl https://api.aicoming.top/api/v1/models
```

```python
import requests

def list_models() -> list:
    resp = requests.get("https://api.aicoming.top/api/v1/models", timeout=30)
    resp.raise_for_status()
    data = resp.json()
    # Response is wrapped; the model array is usually under "data".
    return data.get("data", data)

models = list_models()
for m in models[:20]:
    print(m)
```

```typescript
const resp = await fetch('https://api.aicoming.top/api/v1/models');
const json = await resp.json();
const models = json.data ?? json;
console.log(models.slice(0, 20));
```

## Search by Keyword (client-side)

The endpoint returns the full list; filter locally.

```python
def search_models(keyword: str) -> list:
    kw = keyword.lower().replace("-", "").replace("_", "").replace(" ", "")
    out = []
    for m in list_models():
        blob = " ".join(str(v) for v in m.values() if isinstance(v, (str, int))).lower()
        if kw in blob.replace("-", "").replace("_", "").replace(" ", ""):
            out.append(m)
    return out

print(search_models("claude"))
print(search_models("embedding"))
```

## Related Discovery Endpoints (no auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/models` | All available models |
| `GET` | `/api/v1/model-vendors` | Model vendors (OpenAI, Anthropic, Google, ...) |
| `GET` | `/api/v1/providers` | Upstream providers behind the gateway |

## Popular Model IDs (illustrative only — MUST verify via API)

These are hints about what *kind* of models exist. The real, current IDs come from `/api/v1/models`.

Use the `name` field as the `"model"` value. Examples live at the time of writing:

| `name` (example) | Type | Call via |
|------------------|------|----------|
| `gpt-5.5`, `gpt-5.4`, `gpt-5.4-mini` | chat | `/v1/chat/completions` |
| `gpt-5.3-codex` | chat (code) | `/v1/chat/completions` |
| `claude-opus-4-8`, `claude-sonnet-4-6` | chat | `/v1/chat/completions` or `/v1/messages` |
| `deepseek-v4-pro`, `deepseek-v4-flash` | chat | `/v1/chat/completions` |
| `gemini-3.1-pro-preview` | chat | `/v1/chat/completions` or `/v1beta/models/...` |
| `glm-5.1`, `kimi-k2.6` | chat | `/v1/chat/completions` |
| `gpt-image-2-1k`, `gpt-image-2-2k`, `nano-banana-pro` | image | `/v1/images/generations` |
| `bytedance/seedance-2.0/text-to-video` | video | (provider-specific) |

## The Verification Workflow

Before sending any response or code that references a model ID:

1. Fetch `GET https://api.aicoming.top/api/v1/models`.
2. Confirm the exact ID the user wants is present.
3. Use that exact ID. If it's absent, tell the user and suggest the closest available one — do NOT invent an ID.
