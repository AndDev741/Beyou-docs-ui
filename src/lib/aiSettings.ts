import type { AiProvider } from "@/lib/aiAssist";
import { getStoredValue, persistStoredValue } from "@/lib/storage";

export const AI_KEY_STORAGE: Record<AiProvider, string> = {
  openai: "docs-ai-openai-key",
  deepseek: "docs-ai-deepseek-key",
};

export const AI_MODEL_STORAGE: Record<AiProvider, string> = {
  openai: "docs-ai-openai-model",
  deepseek: "docs-ai-deepseek-model",
};

export function getStoredAiKey(provider: AiProvider): string {
  return getStoredValue(AI_KEY_STORAGE[provider]);
}

export function getStoredAiModel(provider: AiProvider): string {
  return getStoredValue(AI_MODEL_STORAGE[provider]);
}

export function persistAiKey(provider: AiProvider, value: string): void {
  persistStoredValue(AI_KEY_STORAGE[provider], value);
}

export function persistAiModel(provider: AiProvider, value: string): void {
  persistStoredValue(AI_MODEL_STORAGE[provider], value);
}
