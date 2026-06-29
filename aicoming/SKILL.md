---
name: aicoming
description: "AIComing unified AI API gateway integration skill — call OpenAI, Claude, Gemini, DeepSeek and 100+ models through ONE OpenAI-compatible endpoint with smart routing and automatic failover. Use this skill when the user needs to integrate AI model calls into their project via AIComming / aicoming.top, configure AICOMING_API_KEY, call chat completions (streaming or not), generate images, create embeddings, rerank documents, transcribe audio, use the Anthropic Messages format, use the Google Gemini format, submit Midjourney tasks, query the available model list, manage API keys, or check wallet balance and usage. Applicable scenarios include: building an AI app, switching from OpenAI/OpenRouter to a unified gateway, multi-model routing, failover between providers, OpenAI SDK base_url replacement, text-to-image, embeddings, RAG retrieval reranking, speech-to-text. Even if the user doesn't explicitly mention AIComing, this skill should be considered whenever unified AI API gateway integration is involved."
---

# AIComing API Integration Guide

AIComing (aicoming.top) is a unified AI API gateway and model marketplace — an OpenRouter-style platform. Call OpenAI, Claude, Gemini, DeepSeek and many more models through a single OpenAI-compatible API, with smart routing, second-level failover, and session stickiness. This skill helps you quickly integrate the AIComing API into any project.

## Quick Start

### 1. Get an API Key

Register and create an API Key in the [AIComing Console](https://aicoming.top/console).

### 2. Set Environment Variable

```bash
export AICOMING_API_KEY="sk-your-api-key-here"
```

To persist across terminal sessions, add this line to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.).

### 3. The OpenAI SDK Works Out of the Box

AIComing's relay API is OpenAI-compatible. The fastest integration is to point the official OpenAI SDK at AIComing's base URL — no other code changes:

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-your-api-key",
    base_url="https://api.aicoming.top/v1",
)
resp = client.chat.completions.create(
    model="gpt-5.4-mini",                      # verify via /api/v1/models first
    messages=[{"role": "user", "content": "Hello!"}],
)
print(resp.choices[0].message.content)
```

## API Architecture

AIComing exposes two API surfaces:

| Surface | Base URL | Auth | Purpose |
|---------|----------|------|---------|
| **Relay API** | `https://api.aicoming.top/v1` | `Authorization: Bearer $AICOMING_API_KEY` | Model calls — chat, images, embeddings, rerank, audio, Anthropic, Gemini |
| **Console API** | `https://api.aicoming.top/api/v1` | JWT (login) or public | Account, API keys, wallet, model list, vendors |

All relay requests require:
```
Authorization: Bearer $AICOMING_API_KEY
Content-Type: application/json
```

### Relay Endpoints (API Key auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/v1/models` | OpenAI-standard model list (key required for access; not subscription-filtered) |
| `GET`  | `/v1/balance` | Wallet balance via API key (no JWT needed) |
| `POST` | `/v1/chat/completions` | OpenAI chat completions (streaming + non-streaming) |
| `POST` | `/v1/completions` | Legacy text completions |
| `POST` | `/v1/responses` | OpenAI Responses API |
| `POST` | `/v1/embeddings` | Text embeddings / vectorization |
| `POST` | `/v1/images/generations` | Text-to-image |
| `POST` | `/v1/images/edits` | Image editing |
| `POST` | `/v1/videos/generations` | Text/image-to-video (async — returns a task) |
| `GET`  | `/v1/videos/generations/{id}` | Poll video generation task |
| `POST` | `/v1/rerank` | Document reranking |
| `POST` | `/v1/audio/transcriptions` | Speech-to-text |
| `POST` | `/v1/audio/translations` | Audio translation |
| `POST` | `/v1/messages` | Anthropic Messages format (Claude) |
| `POST` | `/v1beta/models/{model}:{action}` | Google Gemini format (generateContent / streamGenerateContent) |
| `POST` | `/mj/submit/imagine` | Midjourney async task submit |
| `GET`  | `/mj/task/{taskId}/fetch` | Midjourney task result poll |

> The whole `/v1/*` surface is also mirrored under `/v1/v1/*` as an alias, for clients that wrongly append `/v1` to a base URL that already ends in `/v1`.

### Console Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`  | `/api/v1/models` | none | Full public marketplace catalog (browsing) |
| `GET`  | `/api/v1/model-vendors` | none | List model vendors |
| `GET`  | `/api/v1/providers` | none | List upstream providers |
| `POST` | `/api/v1/auth/register` | none | Register a new account |
| `POST` | `/api/v1/auth/login` | none | Login → returns JWT |
| `GET`  | `/api/v1/keys` | JWT | List your API keys |
| `POST` | `/api/v1/keys` | JWT | Create a new API key |
| `DELETE` | `/api/v1/keys/{id}` | JWT | Delete an API key |
| `GET`  | `/api/v1/wallet/balance` | JWT | Wallet balance |
| `POST` | `/api/v1/wallet/topup` | JWT | Top up the wallet |
| `GET`  | `/api/v1/user/usage` | JWT | Usage statistics |

## Supported Protocols

AIComing accepts requests in three formats and routes them to the right upstream model. Use whichever matches your existing code:

- **OpenAI** — `/v1/chat/completions`, `/v1/completions`, `/v1/embeddings`, `/v1/images/generations`. Drop-in compatible with the OpenAI SDK (just change `base_url`).
- **Anthropic** — `/v1/messages`. Drop-in compatible with the Anthropic SDK (change `base_url`).
- **Google Gemini** — `/v1beta/models/{model}:generateContent`. Compatible with the Gemini REST format.

## CRITICAL: Never Fabricate — Always Fetch the Model List

> **This rule is non-negotiable.** Available models and their IDs change constantly, and **which models are usable depends on the API key** (its subscriptions, plan, and sub-station). Any model ID written into a prompt, code snippet, or reply MUST come from a live API response — not from memory, not from a training snapshot, not inferred by pattern, not copied from the examples below.

### There are TWO model-list endpoints — know the difference

| Endpoint | Auth | Returns |
|----------|------|---------|
| `GET https://api.aicoming.top/v1/models` | **API key required (for access)** | The set of models the gateway can route to, in **OpenAI-standard format** (`{"object":"list","data":[{"id":"gpt-5.5","object":"model","owned_by":"aicoming"}]}`). This is what OpenAI-compatible clients (CC Switch, Codex, etc.) read. Use the `id` field as the `"model"` value. **Note:** this list is the platform/station-wide routable set — it is NOT filtered by the key's subscriptions. |
| `GET https://api.aicoming.top/api/v1/models` | none | The rich public marketplace catalog (pricing, providers, vendors, latency). Use the `name` field as the model id (`id` here is a numeric DB key). Good for browsing/comparison. |

### The workflow

1. **To get valid model IDs for a request** → call `GET /v1/models` with the key and use an `id` from the response. (Or use the public catalog's `name` field.)
2. **To browse/compare** (pricing, vendors) → use the public `GET /api/v1/models` (no auth).
3. **Whether a specific call succeeds** is enforced at request time, not in the list: a model may be listed but still rejected if the account hasn't subscribed to a provider that offers it, or the wallet is empty. See "Using a Model Your Key Doesn't Have Yet" below.

The tables in this skill are **illustrative only**. They go stale. Treat them as hints about what *kind* of models exist, never as a source of truth for an actual request.

## Using a Model Your Key Doesn't Have Yet

**Access is group-based (verified).** Every model belongs to a permission **group** (e.g. an "图像视频" / image-video group). An API key can only call models in the groups its key/account is entitled to. A model can appear in `GET /v1/models` (the gateway-wide list) yet still be uncallable by your key.

The signature of this is a **403** on the call, not a missing-model error:

```json
{"error":{"message":"无权访问 图像视频 分组","type":"new_api_error"}}
```

This means: the request body was fine; the key's group simply doesn't include that model's category. To fix it, the model's group must be enabled for the key/account — do this in the **console** (account/key group or model-access settings at `https://aicoming.top/console`). If the option isn't self-serve for that group, the user must contact the AIComing operator to grant access. Also make sure the wallet has balance (`GET /v1/balance`).

> Do NOT tell the user to "get a new key" or to retry — a 403 group error won't change by retrying. The fix is a group/permission grant, then make sure the model id you send is exactly the `id` from `GET /v1/models`.
>
> (Note: the platform also has provider-subscription endpoints under `POST /api/v1/providers/{id}/subscribe` for the marketplace UI; whether subscribing affects relay group access was not verified — prefer the console group/permission settings above.)

## Code Templates

For full implementation code with streaming, polling, and error handling, read the reference files:

- **`references/chat.md`** — OpenAI chat completions, including SSE streaming (Python / Node.js / cURL)
- **`references/anthropic.md`** — Anthropic Messages format (`/v1/messages`)
- **`references/gemini.md`** — Google Gemini format (`/v1beta/models`)
- **`references/images-embeddings.md`** — Text-to-image, embeddings, and rerank
- **`references/account.md`** — Register / login / API key management / wallet / usage
- **`references/models.md`** — Model list query + popular model quick reference

Read the corresponding reference file when you need to write specific integration code.

## Error Handling

| HTTP Status | Meaning | Suggested Action |
|-------------|---------|-----------------|
| 401 | Invalid or expired API Key | Check `AICOMING_API_KEY` |
| 402 | Insufficient balance | Top up at [Wallet](https://aicoming.top/console/wallet) |
| 403 `无权访问 ... 分组` (`new_api_error`) | Key's group lacks access to that model category | Enable the model's group for the key/account in the console — see "Using a Model Your Key Doesn't Have Yet". Do NOT retry. |
| 429 | Rate limited (100 req/min per key) | Wait and retry with exponential backoff |
| 5xx | Upstream/server error | Smart routing usually retries automatically; otherwise retry |

### Timeouts (important for images/video)

- **Chat**: non-streaming `120s`, streaming `300s`.
- **Image generation** (synchronous): set an explicit long timeout, **180s**. Never leave a raw HTTP call with no timeout.
- **Video generation**: always **async** — submit returns a task id, then poll `GET /v1/videos/generations/{id}`. Use a bounded poll loop (e.g. 120 × 5s = 10 min cap), never a single long-held request and never an unbounded `while True`.
- **Midjourney**: same async submit-then-poll pattern with a bounded loop.

### Retry Strategy

- **GET requests** (model list, balance): safe to retry up to 3 times with exponential backoff (1s → 2s → 4s).
- **POST generation requests**: AIComing's smart router already fails over between providers. Do NOT blindly retry the same chat/image request — it may double-charge.

## Popular Models (snapshot — MUST re-verify via `/api/v1/models` before use)

The model `id` in the list response is a numeric primary key. **The string you pass as `"model"` in a request is the `name` field** (which equals `slug`). Examples below were live at the time of writing:

| `name` (use this) | Type | Call via |
|-------------------|------|----------|
| `gpt-5.5`, `gpt-5.4`, `gpt-5.4-mini` | chat | `/v1/chat/completions` |
| `gpt-5.3-codex` | chat (code) | `/v1/chat/completions` |
| `claude-opus-4-8`, `claude-sonnet-4-6` | chat | `/v1/chat/completions` or `/v1/messages` |
| `deepseek-v4-pro`, `deepseek-v4-flash` | chat | `/v1/chat/completions` |
| `gemini-3.1-pro-preview` | chat | `/v1/chat/completions` or `/v1beta/models` |
| `glm-5.1`, `kimi-k2.6` | chat | `/v1/chat/completions` |
| `gpt-image-2-1k`, `gpt-image-2-2k`, `nano-banana-pro` | image | `/v1/images/generations` |
| `bytedance/seedance-2.0/text-to-video` | video | (see provider docs) |

> Models change constantly. The real, current list lives at `GET https://api.aicoming.top/api/v1/models` (no auth, response wrapped in `{"data":[...]}`). Always fetch it and use the `name` field verbatim before quoting a model ID. Note: embeddings / rerank / audio endpoints exist, but a matching model must be present in the list — verify before using.

## MCP Server (Optional)

If AIComing later ships an MCP server, install it for direct tool execution in any MCP client. Until then, this skill works purely by teaching the agent to call the HTTP API directly.

## Smart Routing & Sub-stations

- **Smart routing**: AIComing automatically selects the best provider per request and fails over on errors, with session stickiness. You don't manage providers manually — just call the model ID.
- **Route policy**: advanced users can set per-key routing preferences via `PUT /api/v1/keys/{id}/route-policy` (JWT auth). See `references/account.md`.
- **Sub-stations**: white-label resellers run on custom domains; the same relay API works under those domains too.
