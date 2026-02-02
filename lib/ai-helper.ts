import OpenAI from 'openai';
import { prisma } from './db';
import { decrypt } from './encryption';

export interface AIConfig {
  aiEnabled: boolean;
  aiProvider: 'openai' | 'claude';
  apiKey: string;
  model?: string; // Optional: custom model name
}

// Available Claude models (in order of preference) with their max token limits
const CLAUDE_MODELS = [
  { name: 'claude-3-5-sonnet-20241022', maxTokens: 8192 },  // Latest
  { name: 'claude-3-5-sonnet-20240620', maxTokens: 8192 },  // Stable version
  { name: 'claude-3-haiku-20240307', maxTokens: 4096 },     // Fast and cheap (lower limit)
  { name: 'claude-3-sonnet-20240229', maxTokens: 4096 },    // Fallback
  { name: 'claude-3-opus-20240229', maxTokens: 4096 },      // Most powerful
];

// Available OpenAI models with their max token limits
const OPENAI_MODELS = [
  { name: 'gpt-4o-mini', maxTokens: 16384 },
  { name: 'gpt-4o', maxTokens: 16384 },
  { name: 'gpt-4-turbo', maxTokens: 4096 },
];

export interface AIErrorResponse {
  error: string;
  message: string;
  billingUrl?: string;
  noCredits?: boolean;
  invalidKey?: boolean;
  statusCode: number;
}

export class AIError extends Error {
  public statusCode: number;
  public noCredits: boolean;
  public invalidKey: boolean;
  public billingUrl?: string;
  public provider: 'openai' | 'claude';

  constructor(
    message: string,
    statusCode: number,
    provider: 'openai' | 'claude',
    options: {
      noCredits?: boolean;
      invalidKey?: boolean;
    } = {}
  ) {
    super(message);
    this.name = 'AIError';
    this.statusCode = statusCode;
    this.provider = provider;
    this.noCredits = options.noCredits || false;
    this.invalidKey = options.invalidKey || false;

    // Set billing URL based on provider
    if (provider === 'claude') {
      this.billingUrl = options.invalidKey 
        ? 'https://console.anthropic.com/settings/keys'
        : 'https://console.anthropic.com/settings/billing';
    } else {
      this.billingUrl = options.invalidKey
        ? 'https://platform.openai.com/api-keys'
        : 'https://platform.openai.com/account/billing';
    }
  }

  toJSON(): AIErrorResponse {
    return {
      error: this.message,
      message: this.getUserFriendlyMessage(),
      billingUrl: this.billingUrl,
      noCredits: this.noCredits,
      invalidKey: this.invalidKey,
      statusCode: this.statusCode
    };
  }

  getUserFriendlyMessage(): string {
    const providerName = this.provider === 'claude' ? 'Claude' : 'OpenAI';
    
    if (this.invalidKey) {
      return `The ${providerName} API key is invalid. Please check your key in Settings.`;
    }
    
    if (this.noCredits) {
      return `Your ${providerName} API key has no credits. Please add credits to continue.`;
    }
    
    return `An error occurred with the ${providerName} API. Please try again.`;
  }
}

export async function getUserAIConfig(userId: number): Promise<AIConfig | null> {
  const userConfig = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      aiEnabled: true,
      aiProvider: true,
      aiApiKey: true
    }
  });

  if (!userConfig || !userConfig.aiEnabled || !userConfig.aiApiKey) {
    return null;
  }

  try {
    const apiKey = decrypt(userConfig.aiApiKey);
    const provider = (userConfig.aiProvider as 'openai' | 'claude') || 'openai';
    
    // Debug logging
    console.log(`🔍 AI Config: Provider=${provider}, Key starts with=${apiKey.substring(0, 10)}...`);
    
    // Auto-detect provider from API key if not set correctly
    let detectedProvider: 'openai' | 'claude' = provider;
    if (apiKey.startsWith('sk-ant-')) {
      detectedProvider = 'claude';
      console.log('✅ Detected Claude API key');
    } else if (apiKey.startsWith('sk-')) {
      detectedProvider = 'openai';
      console.log('✅ Detected OpenAI API key');
    }
    
    return {
      aiEnabled: userConfig.aiEnabled,
      aiProvider: detectedProvider,
      apiKey
    };
  } catch (error) {
    console.error('Failed to decrypt API key:', error);
    return null;
  }
}

export async function callAI(
  config: AIConfig, 
  prompt: string, 
  systemPrompt?: string, 
  maxTokens: number = 1000
): Promise<string> {
  console.log(`🤖 Calling AI: Provider=${config.aiProvider}, MaxTokens=${maxTokens}`);
  
  try {
    if (config.aiProvider === 'claude') {
      // Claude API with automatic fallback
      console.log('📡 Using Claude API...');
      
      // Try models in order until one works
      const modelsToTry = config.model 
        ? [{ name: config.model, maxTokens: 8192 }, ...CLAUDE_MODELS] 
        : CLAUDE_MODELS;
      let lastError: any = null;
      
      for (const modelConfig of modelsToTry) {
        try {
          // Use the lower of requested tokens or model's max
          const effectiveMaxTokens = Math.min(maxTokens, modelConfig.maxTokens);
          console.log(`📦 Trying Claude Model: ${modelConfig.name} (max: ${effectiveMaxTokens} tokens)`);
          
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': config.apiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: modelConfig.name,
              max_tokens: effectiveMaxTokens,
              messages: [{
                role: 'user',
                content: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt
              }]
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            // If model not found, try next model
            if (response.status === 404 && errorData.error?.type === 'not_found_error') {
              console.log(`⚠️ Model ${modelConfig.name} not available, trying next...`);
              lastError = errorData;
              continue; // Try next model
            }
            
            // Handle 401 - Invalid API Key
            if (response.status === 401) {
              throw new AIError(
                'Invalid Claude API key',
                401,
                'claude',
                { invalidKey: true }
              );
            }
            
            // Handle 429 - Rate limit / No credits
            if (response.status === 429) {
              const errorMessage = errorData.error?.message || '';
              const errorType = errorData.error?.type || '';
              
              if (errorType === 'insufficient_quota' || 
                  errorMessage.toLowerCase().includes('quota') ||
                  errorMessage.toLowerCase().includes('credit') ||
                  errorMessage.toLowerCase().includes('billing')) {
                throw new AIError(
                  'Claude API quota exceeded',
                  429,
                  'claude',
                  { noCredits: true }
                );
              }
              
              throw new AIError(
                'Claude API rate limit exceeded',
                429,
                'claude',
                { noCredits: true }
              );
            }
            
            // Other errors
            const errorMessage = errorData.error?.message || response.statusText || 'Unknown error';
            throw new AIError(
              `Claude API error: ${errorMessage}`,
              response.status,
              'claude'
            );
          }

          // Success!
          const data = await response.json();
          console.log(`✅ Claude response received using model: ${modelConfig.name}`);
          return data.content[0].text;
          
        } catch (error: any) {
          // If it's an AIError (not model-not-found), throw it immediately
          if (error instanceof AIError) {
            throw error;
          }
          // Otherwise, save error and try next model
          lastError = error;
          console.log(`⚠️ Error with model ${modelConfig.name}:`, error.message);
        }
      }
      
      // If we get here, all models failed
      throw new AIError(
        `All Claude models failed. Last error: ${lastError?.message || 'Unknown'}`,
        404,
        'claude'
      );
      
    } else {
      // OpenAI API
      console.log('📡 Using OpenAI API...');
      
      // Use custom model or default
      const modelConfig = config.model 
        ? { name: config.model, maxTokens: 16384 }
        : OPENAI_MODELS[0];
      
      // Use the lower of requested tokens or model's max
      const effectiveMaxTokens = Math.min(maxTokens, modelConfig.maxTokens);
      console.log(`📦 OpenAI Model: ${modelConfig.name} (max: ${effectiveMaxTokens} tokens)`);
      
      const openai = new OpenAI({ apiKey: config.apiKey });
      const messages: any[] = [];
      
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const completion = await openai.chat.completions.create({
        model: modelConfig.name,
        messages,
        max_tokens: effectiveMaxTokens,
        temperature: 0.7
      });

      console.log('✅ OpenAI response received');
      return completion.choices[0].message.content || '';
    }
  } catch (error: any) {
    // If it's already an AIError, re-throw it
    if (error instanceof AIError) {
      throw error;
    }
    
    // Handle OpenAI SDK errors
    if (config.aiProvider === 'openai') {
      // Check for authentication errors (401)
      if (error.status === 401 || error.code === 'invalid_api_key') {
        throw new AIError(
          'Invalid OpenAI API key',
          401,
          'openai',
          { invalidKey: true }
        );
      }
      
      // Check for quota/billing errors (429)
      if (error.status === 429 || error.code === 'insufficient_quota') {
        throw new AIError(
          'OpenAI API quota exceeded',
          429,
          'openai',
          { noCredits: true }
        );
      }
      
      // Generic OpenAI error
      throw new AIError(
        `OpenAI API error: ${error.message || 'Unknown error'}`,
        error.status || 500,
        'openai'
      );
    }
    
    // Generic error fallback
    throw new AIError(
      error.message || 'AI request failed',
      500,
      config.aiProvider
    );
  }
}

export function getAIErrorMessage(error: any, provider: 'openai' | 'claude'): string {
  if (error?.status === 429 || error.message?.includes('quota')) {
    return `${provider === 'claude' ? 'Claude' : 'OpenAI'} API quota exceeded. Please add credits.`;
  }
  if (error?.status === 401 || error.message?.includes('Invalid')) {
    return `Invalid ${provider === 'claude' ? 'Claude' : 'OpenAI'} API key.`;
  }
  return error.message || 'AI request failed';
}

export function getAIPlatformURL(provider: 'openai' | 'claude', type: 'billing' | 'keys'): string {
  if (provider === 'claude') {
    if (type === 'billing') {
      return 'https://console.anthropic.com/settings/plans';
    }
    return 'https://console.anthropic.com/settings/keys';
  } else {
    if (type === 'billing') {
      return 'https://platform.openai.com/account/billing';
    }
    return 'https://platform.openai.com/api-keys';
  }
}

/**
 * Helper function to handle AI errors in route handlers
 * Returns a properly formatted NextResponse with error details
 */
export function handleAIError(error: any): { json: AIErrorResponse; status: number } {
  console.error('❌ AI Error:', error);
  
  // If it's our custom AIError, use its toJSON method
  if (error instanceof AIError) {
    return {
      json: error.toJSON(),
      status: error.statusCode
    };
  }
  
  // Fallback for unknown errors
  return {
    json: {
      error: 'AI request failed',
      message: error.message || 'An unexpected error occurred with the AI service.',
      statusCode: 500
    },
    status: 500
  };
}

/**
 * Get available models for a provider
 */
export function getAvailableModels(provider: 'openai' | 'claude'): string[] {
  return provider === 'claude' 
    ? CLAUDE_MODELS.map(m => m.name)
    : OPENAI_MODELS.map(m => m.name);
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: 'openai' | 'claude'): string {
  return provider === 'claude' ? CLAUDE_MODELS[0].name : OPENAI_MODELS[0].name;
}
