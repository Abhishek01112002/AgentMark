# 📜 AgentMark Architecture Decision Records (ADR Register)

**Baseline Version**: `v1.0`  
**Governance Status**: Approved, Governed & Frozen by Default (Pending Evidence-Driven Change)  
**Governance Body**: Architecture Review Board (ARB)  

---

### 📋 ADR Summary Table

| ADR ID | Decision Title | Status | Owner | Date | Supersedes | Impact Summary |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| **ADR-001** | Normalized Frontend Reducer Engine | **Accepted** | Platform Team | 2026-07 | — | Single source of truth state ownership; eliminated state wipes on socket updates. |
| **ADR-002** | Singleton LangGraph Compilation | **Accepted** | AI Pipeline Team | 2026-07 | — | Pre-compiled graph compiled during lifespan startup; removed 27s of artificial sleeps. |
| **ADR-003** | Layered Immutable Context Pipeline | **Accepted** | AI Pipeline Team | 2026-07 | — | `RawNormalizer` ──► `NormalizedCampaignContext` [Immutable] ──► `ContextEnricher` ──► `PromptContextBuilder`. |
| **ADR-004** | Capability-Based Provider Cache Strategy | **Accepted** | AI Pipeline Team | 2026-07 | — | Isolated prompt caching capabilities (`supports_prefix_cache`, `serialize_payload`) via `PromptCacheStrategy`. |
| **ADR-005** | OpenTelemetry Compatibility & Telemetry | **Accepted** | Observability Team | 2026-07 | — | End-to-end tracing, P50/P95/P99 SLA percentiles, execution classifications, and alert hooks. |

---

### 📖 Detailed Architecture Decision Records

#### ADR-001: Normalized Frontend Reducer Engine
- **Context**: Prior UI state synchronization copied socket events into duplicated `useState` hooks, causing race conditions and state overwrites.
- **Decision**: Implemented `NormalizedCampaign` entity layer and `campaignReducer` as the single source of state mutation.
- **Consequences**: State wipes eliminated; 100% deterministic React UI rendering.

#### ADR-002: Singleton LangGraph Compilation
- **Context**: Every HTTP request constructed and re-compiled a new `StateGraph()` and checkpointer.
- **Decision**: Pre-compile `StateGraph` once during FastAPI `lifespan` startup into a thread-safe singleton (`get_compiled_campaign_graph()`).
- **Consequences**: Removed 27 seconds of hardcoded `time.sleep(4.5)` artificial delays and 300ms compilation overhead.

#### ADR-003: Layered Immutable Context Pipeline
- **Context**: Each agent parsed JSON, deduplicated fields, and built prompts independently, leading to prompt bloat and duplication.
- **Decision**: Introduced a clean, layered pipeline: `RawNormalizer` ──► `NormalizedCampaignContext` [Immutable] ──► `ContextEnricher` ──► `TokenBudgetManager` ──► `PromptContextBuilder`.
- **Consequences**: Single source of truth for prompt context; eliminated duplicate string allocations and context bloat.

#### ADR-004: Capability-Based Provider Cache Strategy
- **Context**: Prompt caching logic risked leaking Anthropic, OpenAI, or Gemini-specific API rules throughout agent node implementations.
- **Decision**: Introduced `PromptCacheStrategy` capability interface (`supports_prefix_cache()`, `supports_ephemeral_cache()`, `serialize_payload()`).
- **Consequences**: Complete provider independence; agents emit provider-neutral `PromptContext` objects.

#### ADR-005: OpenTelemetry Compatibility & Telemetry
- **Context**: Lack of execution metrics prevented data-driven optimization decisions.
- **Decision**: Created `PipelineTracer`, `TokenDiagnostics`, `ExecutionReport`, and `ExecutionAnalyzer` with OpenTelemetry `to_otel_span()` export capability.
- **Consequences**: Real-time SLA budget tracking, percentile latency calculations (P50/P95/P99), and automatic diagnostic alerts.
