# 🚀 LiteLLM Gateway Upgrade Runbook & Architecture Specification

## 1. Executive Summary & Production Safety Guarantee

This document outlines the **additive, zero-disruption LiteLLM Gateway upgrade** for AgentMark.

> [!IMPORTANT]
> **Production Traffic Safeguard**:
> - `LLM_GATEWAY_ENABLED` defaults to `false` across all environments.
> - When `LLM_GATEWAY_ENABLED=false` (or unset), 100% of LLM traffic continues through the existing direct-provider architecture (`SmartClient` / `ProviderPool`).
> - No requests are made to LiteLLM by default.
> - The upgrade is **strictly opt-in** and can be toggled on or rolled back instantly via environment variables without modifying source code.

---

## 2. Architectural Comparison

### A. Existing Direct-Provider Path (Default & Source of Truth)
```
[Campaign Agent]
       │
       ▼
[get_llm_client()]  ──(LLM_GATEWAY_ENABLED=false)──► [SmartClient]
                                                           │
                      ┌────────────────────────────────────┼──────────────────────────────────┐
                      ▼                                    ▼                                  ▼
             [OpenAI Client]                      [Gemini Client]                      [Groq Client]
           (gpt-4o-mini direct)               (gemini-3.1-flash-lite)                (compound-mini)
```
- In-process `SmartClient` / `RateAwarePool` rotates comma-separated provider API keys.
- Thread-locked `TokenBucket` (capacity=8) and `CircuitBreaker` (5 consecutive failures => 60s cooldown).
- Redis-backed SHA256 prompt caching (24h TTL) with in-memory LRU fallback.

### B. Optional LiteLLM Gateway Path (Opt-In)
```
[Campaign Agent]
       │
       ▼
[get_llm_client()]  ──(LLM_GATEWAY_ENABLED=true)──► [Cached Readiness Probe (30s TTL)]
                                                               │
                           ┌───────────────────────────────────┴───────────────────────────────────┐
                           ▼ (Healthy)                                                             ▼ (Unhealthy)
                   [GatewayClient]                                                        [Safe Direct Fallback]
                          │                                                                         │
                          ▼ (HTTP /v1)                                                              ▼
               [LiteLLM Proxy Container]                                                      [SmartClient]
                 (:4000 pinned v1.63.14)                                                            │
                          │                                                                  [Direct Providers]
       ┌──────────────────┼──────────────────┐
       ▼                  ▼                  ▼
[OpenAI API]        [Gemini API]        [Groq API]
```
- Centralized model routing via `litellm/config.yaml`.
- Pinned container image: `ghcr.io/berriai/litellm:v1.63.14`.
- Centralized proxy rate limiting and multi-provider load balancing.
- Automatic non-blocking fallback to direct `SmartClient` if the gateway service is unreachable or encounters an error.

---

## 3. Environment Variables & Defaults

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `LLM_GATEWAY_ENABLED` | `false` | Master feature flag. Set to `true` to opt in to the LiteLLM Gateway. |
| `LLM_GATEWAY_URL` | `http://localhost:4000` (host) / `http://litellm:4000` (Docker) | Base HTTP URL for the LiteLLM Proxy service. |
| `LLM_GATEWAY_API_KEY` | *(None / Optional)* | Master key for LiteLLM requests (defaults to `LITELLM_MASTER_KEY`). |
| `LLM_GATEWAY_MODEL` | `gpt-4o-mini` | Default model alias routed through the LiteLLM proxy. |
| `LLM_GATEWAY_TIMEOUT` | `15.0` | Client request timeout in seconds. |
| `LLM_GATEWAY_FALLBACK_ON_FAILURE` | `true` | When `true`, any gateway failure automatically falls back to `SmartClient`. |
| `LITELLM_MASTER_KEY` | `sk-agentmark-gateway-dev` (dev) / `""` (prod) | Admin key passed to the LiteLLM container for proxy authorization. |

---

## 4. How to Enable LiteLLM Gateway (Testing / Staging)

### Step 1: Start the LiteLLM Container
In development:
```bash
docker compose up -d litellm
```

Verify the gateway is healthy:
```bash
curl http://localhost:4000/health/readiness
# Expected response: {"status": "healthy"} or HTTP 200
```

### Step 2: Enable the Feature Flag in `ai-service`
In `.env` or container environment:
```env
LLM_GATEWAY_ENABLED=true
LLM_GATEWAY_URL=http://localhost:4000
```

Restart `ai-service`:
```bash
docker compose restart ai-service
```

Verify in logs:
```
INFO: LiteLLM Gateway readiness probe verified at http://litellm:4000
```

---

## 5. Instant Rollback Procedure

To instantly disable LiteLLM and revert 100% of traffic to the direct provider path:

### Step 1: Set Feature Flag to `false`
In your environment or `.env`:
```env
LLM_GATEWAY_ENABLED=false
```

### Step 2: Restart `ai-service`
```bash
docker compose restart ai-service
```

Or when running via process manager:
```bash
# Set environment variable and reload process
export LLM_GATEWAY_ENABLED=false
```

**No database migrations, code modifications, or rebuilds required.**

---

## 6. Verification Status & Operational Boundaries

- **Production Default:** Direct `SmartClient` path (`LLM_GATEWAY_ENABLED=false`).
- **Gateway Readiness (`/health/readiness`):** Live-verified on `litellm/litellm:v1.63.14-stable`.
- **Live Provider Verification:** Gemini (`gemini-2.5-flash`) and Groq (`groq-compound-mini`) live-tested through the proxy.
- **OpenAI Status:** Configured via environment variable (`OPENAI_API_KEY`); not independently smoke-tested in this environment due to absence of live key.
- **Outage Fallback Behavior:** A live LiteLLM outage was tested and the request successfully fell back to the existing `SmartClient` path without an unhandled application error.
