import {
  createOpenAICompatible,
  OpenAICompatibleProvider,
} from '@ai-sdk/openai-compatible'
import {
  generateObject,
  generateText,
  ModelMessage,
  streamText,
  StreamTextResult,
  ToolSet,
} from 'ai'
import { z } from 'zod'

import { env } from '~/env.mjs'

/**
 * Supported LLM models for the application.
 *
 * - `gpt4o:rsn` - OpenAI's GPT-4 Optimized. Balanced performance for general tasks and conversations.
 * - `claude-sonnet-4-5-20250929-v1:rsn` - Anthropic's Claude Sonnet 4.5. Best for creative writing and nuanced understanding.
 * - `claude-opus-4-20250514-v1:rsn` - Anthropic's Claude Opus 4. Most capable model for complex reasoning and analysis.
 * - `claude-opus-4-5-20251101-v1:rsn` - Anthropic's Claude Opus 4.5. Most capable model for complex reasoning and analysis.
 * - `claude-3-5-sonnet-20241022-v2:rsn` - Anthropic's Claude 3.5 Sonnet v2. Good balance of speed and capability for most tasks.
 * - `claude-haiku-4-5-20251001-v1:rsn` - Anthropic's Claude Haiku 4.5. Fastest model, ideal for quick responses and high-throughput scenarios.
 */
export type Model =
  | 'gpt4o:rsn'
  | 'claude-sonnet-4-5-20250929-v1:rsn'
  | 'claude-opus-4-20250514-v1:rsn'
  | 'claude-opus-4-5-20251101-v1:rsn'
  | 'claude-3-5-sonnet-20241022-v2:rsn'
  | 'claude-haiku-4-5-20251001-v1:rsn'

class LLMClient {
  protected engineProvider: OpenAICompatibleProvider<
    string,
    string,
    string,
    string
  >
  protected model: Model
  protected temperature: number
  protected systemPrompt?: string
  protected maxTokens?: number

  constructor(model: Model) {
    if (env.PAIR_FOUNDRY_API_KEY == null) {
      throw new Error(
        'Cannot create LLM Client - no API key for Pair Foundry found.',
      )
    }

    this.engineProvider = createOpenAICompatible({
      name: 'pair-engine',
      baseURL: 'https://engine.pair.gov.sg',
      apiKey: env.PAIR_FOUNDRY_API_KEY,
    })
    this.model = model
    this.temperature = 0 // Default temperature
  }

  getModel() {
    return this.engineProvider.chatModel(this.model)
  }

  /**
   * Sets the temperature for text generation.
   *
   * Temperature controls the randomness of the model's output. Lower values make the
   * output more focused and deterministic, while higher values increase creativity and variation.
   *
   * @param temp - Temperature value between 0 and 2. Typical values:
   *               - 0: Most deterministic, best for factual tasks
   *               - 0.7: Balanced creativity and consistency
   *               - 1-2: More creative and varied outputs
   * @returns The LLMClient instance for method chaining.
   *
   * @example
   * ```typescript
   * const client = new LLMClient('gpt40:rsn')
   *   .withTemperature(0.8);
   * ```
   */
  withTemperature(temp: number): this {
    this.temperature = temp
    return this
  }

  /**
   * Sets a system prompt that will be prepended to all conversations.
   *
   * The system prompt defines the behavior, personality, and context for the LLM.
   * It's automatically added as the first message in the conversation.
   *
   * @param prompt - The system prompt text that describes the assistant's role and behavior.
   * @returns The LLMClient instance for method chaining.
   *
   * @example
   * ```typescript
   * const client = new LLMClient('claude-sonnet-4-5-20250929-v1:rsn')
   *   .withSystemPrompt('You are a helpful coding assistant specializing in TypeScript.');
   * ```
   */
  withSystemPrompt(prompt: string): this {
    this.systemPrompt = prompt
    return this
  }

  /**
   * Sets the maximum number of tokens to generate in responses.
   *
   * This limits the length of the model's output. Useful for controlling costs
   * and ensuring responses fit within specific length requirements.
   *
   * @param tokens - Maximum number of tokens to generate. The exact limit depends on the model.
   * @returns The LLMClient instance for method chaining.
   *
   * @example
   * ```typescript
   * const client = new LLMClient('gpt40:rsn')
   *   .withMaxTokens(500);
   * ```
   */
  withMaxTokens(tokens: number): this {
    this.maxTokens = tokens
    return this
  }

  /**
   * Prepares messages by optionally prepending the system prompt.
   *
   * @param messages - The original array of messages.
   * @returns Messages array with system prompt prepended if configured.
   */
  protected prepareMessages(messages: ModelMessage[]): ModelMessage[] {
    if (this.systemPrompt) {
      return [{ role: 'system', content: this.systemPrompt }, ...messages]
    }
    return messages
  }

  /**
   * Streams text generation in real-time from the LLM.
   *
   * This method enables streaming responses from the language model, allowing you to
   * process tokens as they are generated rather than waiting for the complete response.
   * Useful for providing real-time feedback in chat interfaces or long-form content generation.
   *
   * @param messages - Array of conversation messages to send to the LLM. Each message should
   *                   include a role (e.g., 'user', 'assistant', 'system') and content.
   * @returns A StreamTextResult object that provides access to the streaming response,
   *          including methods to handle the stream and extract the generated text.
   *
   * @example
   * ```typescript
   * const client = new LLMClient('gpt40:rsn')
   *   .withTemperature(0.7)
   *   .withSystemPrompt('You are a creative writer.');
   *
   * const result = client.streamText([
   *   { role: 'user', content: 'Tell me a story' }
   * ]);
   *
   * for await (const chunk of result.textStream) {
   *   process.stdout.write(chunk);
   * }
   * ```
   */
  streamText(messages: ModelMessage[]): StreamTextResult<ToolSet, never> {
    return streamText({
      model: this.engineProvider.chatModel(this.model),
      temperature: this.temperature,
      messages: this.prepareMessages(messages),
    })
  }

  /**
   * Generates a complete text response from the LLM.
   *
   * This method sends a conversation to the language model and waits for the complete
   * response before returning. Unlike streamText, this returns the entire generated
   * text at once. Best used when you need the full response before proceeding, such as
   * for batch processing or when response completeness is required.
   *
   * @param messages - Array of conversation messages to send to the LLM. Each message should
   *                   include a role (e.g., 'user', 'assistant', 'system') and content.
   * @param maxOutputTokens - Optional maximum number of tokens to generate in the response.
   *                          If not specified, uses the configured maxTokens or model's default limit.
   * @returns A Promise that resolves with the complete generated text and metadata.
   *
   * @example
   * ```typescript
   * const client = new LLMClient('claude-sonnet-4-5-20250929-v1:rsn')
   *   .withSystemPrompt('You are a helpful assistant.')
   *   .withMaxTokens(500);
   *
   * const result = await client.generateText([
   *   { role: 'user', content: 'Explain quantum computing in simple terms.' }
   * ]);
   *
   * console.log(result.text);
   * ```
   */
  generateText(messages: ModelMessage[]) {
    return generateText({
      model: this.getModel(),
      temperature: this.temperature,
      messages: this.prepareMessages(messages),
      maxOutputTokens: this.maxTokens,
    })
  }

  /**
   * Generates a structured object from the LLM based on a Zod schema.
   *
   * This method uses the language model to extract or generate structured data that
   * conforms to a specified schema. Perfect for data extraction, form filling, API
   * response generation, or any scenario requiring validated structured output.
   *
   * @param schema - A Zod schema defining the expected structure of the output object.
   *                 The model will generate JSON that validates against this schema.
   * @param messages - Array of conversation messages to send to the LLM. Each message should
   *                   include a role (e.g., 'user', 'assistant', 'system') and content.
   * @param maxOutputTokens - Optional maximum number of tokens to generate in the response.
   *                          If not specified, uses the configured maxTokens or model's default limit.
   * @returns A Promise that resolves with the generated object matching the schema,
   *          along with metadata about the generation.
   *
   * @example
   * ```typescript
   * const PersonSchema = z.object({
   *   name: z.string(),
   *   age: z.number(),
   *   email: z.string().email(),
   *   interests: z.array(z.string())
   * });
   *
   * const client = new LLMClient('gpt40:rsn')
   *   .withSystemPrompt('Extract person information from the text.');
   *
   * const result = await client.generateObject(
   *   PersonSchema,
   *   [{ role: 'user', content: 'John Doe is 30 years old, email john@example.com, loves hiking and photography.' }]
   * );
   *
   * console.log(result.object); // { name: "John Doe", age: 30, email: "john@example.com", interests: ["hiking", "photography"] }
   * ```
   */
  generateObject<T extends z.ZodTypeAny>(schema: T, messages: ModelMessage[]) {
    return generateObject({
      model: this.getModel(),
      temperature: this.temperature,
      messages: this.prepareMessages(messages),
      schema,
      maxOutputTokens: this.maxTokens,
    })
  }
}

export { LLMClient }
