/**
 * Represents a single message in an LLM conversation history.
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Base interface for LLM Providers (Gemini, Anthropic, Mock).
 */
export interface LLMProvider {
  name: string;
  generate(messages: LLMMessage[], config?: any): Promise<string>;
}

// --- Providers ---

class MockProvider implements LLMProvider {
  name = 'mock';
  async generate(messages: LLMMessage[]): Promise<string> {
    const lastMsg = messages[messages.length - 1].content.toLowerCase();
    if (lastMsg.includes('task')) {
      return JSON.stringify({
        thought: 'I need to check the task details.',
        action: 'read_task',
        args: {},
      });
    }
    return JSON.stringify({
      thought: 'Mock Task Completed.',
      action: 'task_complete',
      args: { result: 'Done' },
    });
  }
}

class GeminiProvider implements LLMProvider {
  name = 'gemini';
  async generate(messages: LLMMessage[], config?: any): Promise<string> {
    // In real implementation:
    // If config.apiKey exists, use it.
    // Else, rely on Google Antigravity Auth (ADC).
    console.log(`[Gemini] Calling ${config?.model || 'gemini-1.5-pro'}...`);
    // Mocking real call for demo
    return new MockProvider().generate(messages);
  }
}

class AnthropicProvider implements LLMProvider {
  name = 'anthropic';
  async generate(messages: LLMMessage[], config?: any): Promise<string> {
    console.log(`[Anthropic] Calling ${config?.model || 'claude-3-opus'}...`);
    // Mocking real call for demo
    return new MockProvider().generate(messages);
  }
}

// --- Service ---

import { spawn } from 'child_process';

class GeminiCLIProvider implements LLMProvider {
  name = 'gemini-cli';
  async generate(messages: LLMMessage[], config?: any): Promise<string> {
    const prompt = messages.map((m) => `${m.role}: ${m.content}`).join('\n');
    console.log('[Gemini CLI] Generating response...');

    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        ...config?.env,
        GEMINI_API_KEY: config?.apiKey || process.env.GEMINI_API_KEY,
      };

      const cliPath = 'node_modules/@google/gemini-cli/dist/index.js';
      const child = spawn('node', [cliPath, '-p', prompt, '--no-stream'], {
        env,
        shell: false,
      });

      let output = '';
      let error = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      child.stderr.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          console.error(`[Gemini CLI] Error: ${error}`);
          reject(new Error(`Gemini CLI exited with code ${code}: ${error}`));
        } else {
          resolve(output.trim());
        }
      });
    });
  }
}

/**
 * The central service for dispatching LLM generation requests.
 * Manages multiple providers and selects the active one based on configuration.
 */
export class LLMService {
  private providers: Map<string, LLMProvider> = new Map();

  constructor() {
    this.register(new MockProvider());
    this.register(new GeminiProvider());
    this.register(new AnthropicProvider());
    this.register(new GeminiCLIProvider());
  }

  register(provider: LLMProvider) {
    this.providers.set(provider.name, provider);
  }

  async generate(
    messages: LLMMessage[],
    providerName: string = 'gemini',
    config?: any,
  ): Promise<string> {
    const provider =
      this.providers.get(providerName) || this.providers.get('mock');
    if (!provider) throw new Error(`Provider ${providerName} not found`);

    return provider.generate(messages, config);
  }
}

export const llm = new LLMService();
