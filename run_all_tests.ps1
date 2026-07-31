$ErrorActionPreference = 'Continue'

Write-Host "=== Running Backend Tests ==="
cd e:\AgentMark\AgentMark\backend
npm run test

Write-Host "`n=== Running Frontend Tests ==="
cd e:\AgentMark\AgentMark\frontend
npm run test

Write-Host "`n=== Running E2E Tests ==="
cd e:\AgentMark\AgentMark
npm run test:e2e

Write-Host "`n=== Running ai-service Tests (excluding rate limiter) ==="
cd e:\AgentMark\AgentMark\ai-service
if (Test-Path .venv) {
    .venv\Scripts\python -m pytest tests --ignore=tests/test_rate_limit_resilience.py
} else {
    python -m pytest tests --ignore=tests/test_rate_limit_resilience.py
}
