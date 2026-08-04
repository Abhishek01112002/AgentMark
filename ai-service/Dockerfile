# syntax=docker/dockerfile:1

FROM python:3.12-slim-bookworm

WORKDIR /app

# Install uv for deterministic dependency resolution
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy only dependency specification files first for caching
COPY pyproject.toml uv.lock ./

# Install dependencies using uv sync without dev dependencies
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# Copy source code, templates, and configurations
COPY . ./

# Ensure Python runs from the uv virtual environment
ENV PATH="/app/.venv/bin:$PATH"

# Install curl for healthcheck since Debian slim doesn't include it by default
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Pre-compile Python bytecode
RUN python -m compileall main.py run.py api/ agents/ domain/ llm/ routers/ schemas/ services/ utils/ workflow/

# Non-root user setup
RUN useradd -m -U appuser && chown -R appuser:appuser /app
USER appuser

ENV PORT=5002
EXPOSE 5002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:5002/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5002"]
