# 🏛️ AgentMark Architecture Principles (Baseline v1.0)

**Baseline Version**: `v1.0`  
**Governance Body**: Architecture Review Board (ARB)  
**Modification Policy**: Governed and Frozen by Default (Requires ADR + Evidence)  

---

### 🌟 Core Engineering Principles

1. **Normalize Once**: Raw state and external inputs are parsed, canonicalized, and deduplicated exactly once at the boundary (`RawNormalizer`).
2. **Mutate in One Place**: State mutations occur strictly within pure reducers (`campaignReducer`). No component or side effect directly mutates private state.
3. **Derive Through Selectors & Builders**: Compute UI views and prompt payloads via pure functions/selectors (`campaignSelectors`, `PromptContextBuilder`) rather than copying data into local states.
4. **Immutable Domain Objects**: All context objects (`NormalizedCampaignContext`, `ReviewerContext`, `PromptContext`) are frozen value objects. Downstream consumers cannot mutate context.
5. **Provider-Independent Interfaces**: Agent logic emits provider-neutral `PromptContext` objects. Provider-specific headers, prefixes, and cache rules are isolated inside `PromptCacheStrategy` adapters.
6. **Telemetry Before Optimization**: Every campaign execution is fully instrumented (`PipelineTracer`, `TokenDiagnostics`). No performance optimization is merged without empirical telemetry baseline comparisons.
7. **Evidence Before Architectural Change**: Structural redesigns require quantitative telemetry evidence and a formally approved Architecture Decision Record (ADR).
8. **Fail Gracefully & Decouple Concerns**: Downstream execution steps operate with strict fallback defaults (`SafeDict`, non-blocking rate limiters) to prevent cascading failures.

---

### 📊 Operational Maturity Exit Criteria

| Maturity Level | Target | Objective Exit Criteria |
| :--- | :--- | :--- |
| **Level L1 (Functional)** | Completed | Functional correctness & byte-identical outputs demonstrated. |
| **Level L2 (Reliable)** | Completed | System meets SLA success targets (≥99.5%) under baseline traffic. |
| **Level L3 (Observable)** | **Current (v1.0)** | End-to-end telemetry tracing, OTEL export, and diagnostic reports active. |
| **Level L4 (Self-Healing)** | Phase 1 & 2 Target | Automated recovery & non-blocking fallback from defined dependency failures. |
| **Level L5 (Adaptive)** | Phase 3 & 4 Target | Telemetry-driven dynamic model routing and context budget optimization. |
| **Level L6 (Autonomous)** | Phase 5 & 6 Target | Controlled autonomous scaling, self-tuning prompt budgets, and automated regression triage. |
