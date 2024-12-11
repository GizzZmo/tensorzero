import { z } from "zod";

// Base provider configs
export const AnthropicProviderConfig = z.object({
  type: z.literal("anthropic"),
  model_name: z.string(),
});
export type AnthropicProviderConfig = z.infer<typeof AnthropicProviderConfig>;

export const AWSBedrockProviderConfig = z.object({
  type: z.literal("aws_bedrock"),
  model_id: z.string(),
  region: z.string().optional(),
});
export type AWSBedrockProviderConfig = z.infer<typeof AWSBedrockProviderConfig>;

export const AzureProviderConfig = z.object({
  type: z.literal("azure"),
  deployment_id: z.string(),
  endpoint: z.string().url(),
});
export type AzureProviderConfig = z.infer<typeof AzureProviderConfig>;

export const DummyProviderConfig = z.object({
  type: z.literal("dummy"),
  model_name: z.string(),
});
export type DummyProviderConfig = z.infer<typeof DummyProviderConfig>;

export const FireworksProviderConfig = z.object({
  type: z.literal("fireworks"),
  model_name: z.string(),
});
export type FireworksProviderConfig = z.infer<typeof FireworksProviderConfig>;

export const GCPVertexAnthropicProviderConfig = z.object({
  type: z.literal("gcp_vertex_anthropic"),
  model_id: z.string(),
  location: z.string(),
  project_id: z.string(),
});
export type GCPVertexAnthropicProviderConfig = z.infer<
  typeof GCPVertexAnthropicProviderConfig
>;

export const GCPVertexGeminiProviderConfig = z.object({
  type: z.literal("gcp_vertex_gemini"),
  model_id: z.string(),
  location: z.string(),
  project_id: z.string(),
});
export type GCPVertexGeminiProviderConfig = z.infer<
  typeof GCPVertexGeminiProviderConfig
>;

export const GoogleAIStudioGeminiProviderConfig = z.object({
  type: z.literal("google_ai_studio_gemini"),
  model_name: z.string(),
});
export type GoogleAIStudioGeminiProviderConfig = z.infer<
  typeof GoogleAIStudioGeminiProviderConfig
>;

export const MistralProviderConfig = z.object({
  type: z.literal("mistral"),
  model_name: z.string(),
});
export type MistralProviderConfig = z.infer<typeof MistralProviderConfig>;

export const OpenAIProviderConfig = z.object({
  type: z.literal("openai"),
  model_name: z.string(),
  api_base: z.string().url().optional(),
});
export type OpenAIProviderConfig = z.infer<typeof OpenAIProviderConfig>;

export const TogetherProviderConfig = z.object({
  type: z.literal("together"),
  model_name: z.string(),
});
export type TogetherProviderConfig = z.infer<typeof TogetherProviderConfig>;

export const VLLMProviderConfig = z.object({
  type: z.literal("vllm"),
  model_name: z.string(),
  api_base: z.string().url(),
});
export type VLLMProviderConfig = z.infer<typeof VLLMProviderConfig>;

// Union of all provider configs
export const ProviderConfig = z.discriminatedUnion("type", [
  AnthropicProviderConfig,
  AWSBedrockProviderConfig,
  AzureProviderConfig,
  DummyProviderConfig,
  FireworksProviderConfig,
  GCPVertexAnthropicProviderConfig,
  GCPVertexGeminiProviderConfig,
  GoogleAIStudioGeminiProviderConfig,
  MistralProviderConfig,
  OpenAIProviderConfig,
  TogetherProviderConfig,
  VLLMProviderConfig,
]);

export type ProviderConfig = z.infer<typeof ProviderConfig>;

// Model config schema
export const ModelConfig = z.object({
  // Array of provider names for routing/fallback order
  routing: z.array(z.string()),
  // Map of provider name to provider config
  providers: z.record(z.string(), ProviderConfig),
});

export type ModelConfig = z.infer<typeof ModelConfig>;

// Embedding provider config schema
export const EmbeddingProviderConfig = z.discriminatedUnion("type", [
  OpenAIProviderConfig,
]);

export type EmbeddingProviderConfig = z.infer<typeof EmbeddingProviderConfig>;

// Embedding model config schema
export const EmbeddingModelConfig = z.object({
  // Array of provider names for routing/fallback order
  routing: z.array(z.string()),
  // Map of provider name to provider config
  providers: z.record(z.string(), EmbeddingProviderConfig),
});

export type EmbeddingModelConfig = z.infer<typeof EmbeddingModelConfig>;
