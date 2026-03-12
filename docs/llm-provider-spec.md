# LLM Provider Specification

## Purpose

This document defines the model access layer for the project.

The project should not bind planning and rewriting logic directly to one model vendor.

Instead, it should use a provider abstraction so the rest of the system can call:

- `planning`
- `rewriting`
- future `style-preview`

without caring whether the backend model is:

- Anthropic
- OpenAI
- an OpenAI-compatible endpoint
- a local model

## Core Principle

The project should be:

`provider-agnostic at the application layer`

This means:

- planner does not know the vendor
- rewriter does not know the vendor
- UI does not know the vendor
- only the provider adapter knows the vendor-specific API shape

## Why This Matters

If provider logic leaks into the planner or UI:

- prompt handling becomes hard to change
- swapping vendors becomes expensive
- testing becomes harder
- local-model support becomes painful

This project should avoid that from the beginning.

## Layer Position

Recommended stack:

1. `Input Layer`
2. `Planner`
3. `Rewriter`
4. `Renderer`
5. `Provider Layer`

Operationally:

- planner and rewriter will call the provider layer
- provider layer will call the actual model API

## Phase 1 Goal

The first version of the provider layer should make one thing reliable:

`send structured prompt requests and return normalized text output`

It does not need advanced tool calling yet.
It does need stable request and response contracts.

## Recommended Interface

The provider layer should expose a simple interface like:

```ts
type GenerateRequest = {
  task: 'planning' | 'rewriting' | 'style_preview';
  system_prompt: string;
  user_input: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: 'text' | 'json';
};

type GenerateResponse = {
  provider: string;
  model: string;
  output_text: string;
  raw?: unknown;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
};
```

## Minimum Methods

Phase 1 only needs these methods:

- `generate(request)`
- `healthCheck()`

Optional later:

- `listModels()`
- `supportsJsonMode()`
- `supportsToolUse()`

## Request Contract

Every provider request should include:

- `task`
- `system_prompt`
- `user_input`

Optional:

- `temperature`
- `max_tokens`
- `response_format`

The application layer should not pass vendor-specific fields directly.

For example, avoid doing this outside adapters:

- `anthropic_version`
- `messages`
- `response_format: { type: ... }`
- vendor-specific role names

Those belong inside adapters.

## Response Contract

Every provider response should normalize to:

- `provider`
- `model`
- `output_text`
- `raw`
- `usage`

This is enough for:

- planner output parsing
- rewriter output parsing
- debugging

## Provider Types

Phase 1 should support this conceptual set:

### `anthropic`

Useful for:

- planning
- rewriting
- long-context content understanding

### `openai`

Useful for:

- general compatibility
- future structured output support

### `openai-compatible`

Useful for:

- vendor flexibility
- local model gateways
- self-hosted endpoints

### `local`

Useful for:

- privacy-first use cases
- offline experimentation

## Suggested Environment Variables

Keep environment variables simple and explicit.

### Common

- `LLM_PROVIDER`
- `LLM_MODEL`
- `LLM_BASE_URL`
- `LLM_API_KEY`

### Examples

#### Anthropic

```bash
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-20250514
LLM_API_KEY=...
```

#### OpenAI

```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-4.1
LLM_API_KEY=...
```

#### OpenAI-compatible

```bash
LLM_PROVIDER=openai-compatible
LLM_MODEL=qwen-max
LLM_BASE_URL=https://example.com/v1
LLM_API_KEY=...
```

## Adapter Responsibilities

Each adapter must handle:

1. request translation
2. authentication
3. vendor-specific payload shape
4. vendor-specific error translation
5. normalized output conversion

This means adapters are the only place where vendor differences should appear.

## Error Model

The provider layer should return normalized failures.

Recommended categories:

- `auth_error`
- `rate_limit`
- `network_error`
- `provider_error`
- `invalid_response`
- `timeout`

Recommended normalized shape:

```ts
type ProviderError = {
  type:
    | 'auth_error'
    | 'rate_limit'
    | 'network_error'
    | 'provider_error'
    | 'invalid_response'
    | 'timeout';
  provider: string;
  message: string;
  raw?: unknown;
};
```

## JSON vs Text

The provider layer should support both:

- plain text output
- structured JSON-style output

But Phase 1 should be conservative.

Recommendation:

- ask the model for text when reliability is enough
- use JSON output only where the downstream parser really benefits

For this project:

- planning will likely benefit from structured JSON
- rewriting can start with text or markdown output

## Planner Integration

Planner should call something like:

```ts
provider.generate({
  task: 'planning',
  system_prompt: PLANNING_SYSTEM_PROMPT,
  user_input: raw_input,
  response_format: 'json'
});
```

Expected output:

- normalized text that can be parsed into a slide plan

## Rewriter Integration

Rewriter should call something like:

```ts
provider.generate({
  task: 'rewriting',
  system_prompt: REWRITING_SYSTEM_PROMPT,
  user_input: JSON.stringify(slide_plan),
  response_format: 'text'
});
```

Expected output:

- markdown or structured text suitable for the renderer pipeline

## Local Model Considerations

If local models are supported later:

- prompt size may need reduction
- output stability may be weaker
- JSON reliability may be worse

So the application layer should not assume all providers behave equally well.

This means:

- provider metadata should be available
- capability flags may be useful later

## Phase 1 Non-Goals

The provider layer should not do these yet:

- tool calling
- multi-agent orchestration
- automatic retries with strategy switching
- vendor-side prompt caching optimization
- streaming UI integration

Those can come later.

## Implementation Guidance

A minimal Phase 1 implementation can look like:

```text
src/
  llm/
    provider.ts
    providers/
      anthropic.ts
      openai.ts
      openai-compatible.ts
```

Recommended architecture:

- one provider interface
- one adapter per vendor
- one factory for selecting active adapter from env vars

## Selection Strategy

The application should choose provider in this order:

1. explicit user config
2. environment config
3. default provider fallback

Do not hardcode provider selection inside planner or renderer.

## Next Step

After this spec, the next practical implementation target should be:

`provider interface + one concrete adapter + mock adapter for testing`
