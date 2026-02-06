/**
 * Unified LLM client supporting both Anthropic and OpenRouter
 */

import Anthropic from "@anthropic-ai/sdk";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface GenerateOptions {
  model?: string;
  system?: string;
  messages: Message[];
  maxTokens?: number;
}

interface GenerateResult {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export class LLMClient {
  private useOpenRouter: boolean;
  private anthropic?: Anthropic;
  private openrouter?: ReturnType<typeof createOpenRouter>;
  private defaultModel: string;

  constructor() {
    this.useOpenRouter = process.env.USE_OPENROUTER === "true";
    this.defaultModel = process.env.DEFAULT_MODEL || "claude-sonnet-4-5-20250929";

    if (this.useOpenRouter) {
      if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY not set but USE_OPENROUTER=true");
      }
      this.openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
      });
      console.log("✅ Using OpenRouter");
    } else {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error("ANTHROPIC_API_KEY not set");
      }
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      console.log("✅ Using Anthropic SDK");
    }
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const model = options.model || this.defaultModel;

    if (this.useOpenRouter && this.openrouter) {
      return this.generateWithOpenRouter(model, options);
    }

    if (this.anthropic) {
      return this.generateWithAnthropic(model, options);
    }

    throw new Error("No LLM client configured");
  }

  private async generateWithAnthropic(
    model: string,
    options: GenerateOptions
  ): Promise<GenerateResult> {
    const message = await this.anthropic!.messages.create({
      model,
      max_tokens: options.maxTokens || 1024,
      system: options.system,
      messages: options.messages,
    });

    const response = message.content[0];
    const text = response.type === "text" ? response.text : "";

    return {
      text,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    };
  }

  private async generateWithOpenRouter(
    model: string,
    options: GenerateOptions
  ): Promise<GenerateResult> {
    // Map Anthropic model names to OpenRouter format
    const modelMap: Record<string, string> = {
      "claude-sonnet-4-5-20250929": "anthropic/claude-3.5-sonnet",
      "claude-haiku-4-5-20251001": "anthropic/claude-3-haiku",
      "claude-opus-4-6": "anthropic/claude-opus-4-latest",
    };

    const openrouterModel = modelMap[model] || model;

    const result = await generateText({
      model: this.openrouter!(openrouterModel),
      system: options.system,
      messages: options.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      maxTokens: options.maxTokens || 1024,
    });

    return {
      text: result.text,
      usage: {
        inputTokens: result.usage.promptTokens,
        outputTokens: result.usage.completionTokens,
      },
    };
  }

  /**
   * Get available models based on provider
   */
  getAvailableModels(): string[] {
    if (this.useOpenRouter) {
      return [
        "anthropic/claude-3.5-sonnet",
        "anthropic/claude-3-haiku",
        "anthropic/claude-opus-4-latest",
        "openai/gpt-4o",
        "google/gemini-2.0-flash-exp",
        "meta-llama/llama-3.3-70b-instruct",
      ];
    }

    return [
      "claude-sonnet-4-5-20250929",
      "claude-haiku-4-5-20251001",
      "claude-opus-4-6",
    ];
  }

  /**
   * Calculate cost for a given model and token usage
   */
  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const costs: Record<string, { input: number; output: number }> = {
      // Anthropic direct
      "claude-sonnet-4-5-20250929": { input: 3.0, output: 15.0 },
      "claude-haiku-4-5-20251001": { input: 0.8, output: 4.0 },
      "claude-opus-4-6": { input: 15.0, output: 75.0 },
      // OpenRouter
      "anthropic/claude-3.5-sonnet": { input: 3.0, output: 15.0 },
      "anthropic/claude-3-haiku": { input: 0.8, output: 4.0 },
      "anthropic/claude-opus-4-latest": { input: 15.0, output: 75.0 },
      "openai/gpt-4o": { input: 2.5, output: 10.0 },
      "google/gemini-2.0-flash-exp": { input: 0.0, output: 0.0 }, // Free during preview
      "meta-llama/llama-3.3-70b-instruct": { input: 0.18, output: 0.18 },
    };

    const modelCost = costs[model] || { input: 3.0, output: 15.0 };
    return (
      (inputTokens / 1_000_000) * modelCost.input +
      (outputTokens / 1_000_000) * modelCost.output
    );
  }
}
