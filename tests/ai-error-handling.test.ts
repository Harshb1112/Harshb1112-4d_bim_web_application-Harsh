/**
 * AI Error Handling Tests
 * 
 * This file contains test cases for the AI error handling implementation.
 * Run these tests to verify that error handling works correctly for both
 * Claude and OpenAI providers.
 */

import { AIError, AIConfig } from '@/lib/ai-helper';

describe('AIError Class', () => {
  describe('Claude Provider', () => {
    it('should create invalid key error for Claude', () => {
      const error = new AIError(
        'Invalid Claude API key',
        401,
        'claude',
        { invalidKey: true }
      );

      expect(error.statusCode).toBe(401);
      expect(error.invalidKey).toBe(true);
      expect(error.noCredits).toBe(false);
      expect(error.provider).toBe('claude');
      expect(error.billingUrl).toBe('https://console.anthropic.com/settings/keys');
    });

    it('should create no credits error for Claude', () => {
      const error = new AIError(
        'Claude API quota exceeded',
        429,
        'claude',
        { noCredits: true }
      );

      expect(error.statusCode).toBe(429);
      expect(error.noCredits).toBe(true);
      expect(error.invalidKey).toBe(false);
      expect(error.provider).toBe('claude');
      expect(error.billingUrl).toBe('https://console.anthropic.com/settings/billing');
    });

    it('should return proper JSON for invalid key', () => {
      const error = new AIError(
        'Invalid Claude API key',
        401,
        'claude',
        { invalidKey: true }
      );

      const json = error.toJSON();

      expect(json).toEqual({
        error: 'Invalid Claude API key',
        message: 'The Claude API key is invalid. Please check your key in Settings.',
        billingUrl: 'https://console.anthropic.com/settings/keys',
        invalidKey: true,
        noCredits: false,
        statusCode: 401
      });
    });

    it('should return proper JSON for no credits', () => {
      const error = new AIError(
        'Claude API quota exceeded',
        429,
        'claude',
        { noCredits: true }
      );

      const json = error.toJSON();

      expect(json).toEqual({
        error: 'Claude API quota exceeded',
        message: 'Your Claude API key has no credits. Please add credits to continue.',
        billingUrl: 'https://console.anthropic.com/settings/billing',
        invalidKey: false,
        noCredits: true,
        statusCode: 429
      });
    });
  });

  describe('OpenAI Provider', () => {
    it('should create invalid key error for OpenAI', () => {
      const error = new AIError(
        'Invalid OpenAI API key',
        401,
        'openai',
        { invalidKey: true }
      );

      expect(error.statusCode).toBe(401);
      expect(error.invalidKey).toBe(true);
      expect(error.noCredits).toBe(false);
      expect(error.provider).toBe('openai');
      expect(error.billingUrl).toBe('https://platform.openai.com/api-keys');
    });

    it('should create no credits error for OpenAI', () => {
      const error = new AIError(
        'OpenAI API quota exceeded',
        429,
        'openai',
        { noCredits: true }
      );

      expect(error.statusCode).toBe(429);
      expect(error.noCredits).toBe(true);
      expect(error.invalidKey).toBe(false);
      expect(error.provider).toBe('openai');
      expect(error.billingUrl).toBe('https://platform.openai.com/account/billing');
    });

    it('should return proper JSON for invalid key', () => {
      const error = new AIError(
        'Invalid OpenAI API key',
        401,
        'openai',
        { invalidKey: true }
      );

      const json = error.toJSON();

      expect(json).toEqual({
        error: 'Invalid OpenAI API key',
        message: 'The OpenAI API key is invalid. Please check your key in Settings.',
        billingUrl: 'https://platform.openai.com/api-keys',
        invalidKey: true,
        noCredits: false,
        statusCode: 401
      });
    });

    it('should return proper JSON for no credits', () => {
      const error = new AIError(
        'OpenAI API quota exceeded',
        429,
        'openai',
        { noCredits: true }
      );

      const json = error.toJSON();

      expect(json).toEqual({
        error: 'OpenAI API quota exceeded',
        message: 'Your OpenAI API key has no credits. Please add credits to continue.',
        billingUrl: 'https://platform.openai.com/account/billing',
        invalidKey: false,
        noCredits: true,
        statusCode: 429
      });
    });
  });

  describe('Generic Errors', () => {
    it('should create generic error without flags', () => {
      const error = new AIError(
        'Network error',
        500,
        'claude'
      );

      expect(error.statusCode).toBe(500);
      expect(error.invalidKey).toBe(false);
      expect(error.noCredits).toBe(false);
      expect(error.provider).toBe('claude');
    });

    it('should return proper JSON for generic error', () => {
      const error = new AIError(
        'Network error',
        500,
        'openai'
      );

      const json = error.toJSON();

      expect(json).toEqual({
        error: 'Network error',
        message: 'An error occurred with the OpenAI API. Please try again.',
        billingUrl: 'https://platform.openai.com/account/billing',
        invalidKey: false,
        noCredits: false,
        statusCode: 500
      });
    });
  });
});

describe('Error Response Format', () => {
  it('should match expected format for invalid key', () => {
    const error = new AIError(
      'Invalid Claude API key',
      401,
      'claude',
      { invalidKey: true }
    );

    const json = error.toJSON();

    // Verify all required fields are present
    expect(json).toHaveProperty('error');
    expect(json).toHaveProperty('message');
    expect(json).toHaveProperty('billingUrl');
    expect(json).toHaveProperty('invalidKey');
    expect(json).toHaveProperty('noCredits');
    expect(json).toHaveProperty('statusCode');

    // Verify types
    expect(typeof json.error).toBe('string');
    expect(typeof json.message).toBe('string');
    expect(typeof json.billingUrl).toBe('string');
    expect(typeof json.invalidKey).toBe('boolean');
    expect(typeof json.noCredits).toBe('boolean');
    expect(typeof json.statusCode).toBe('number');
  });

  it('should match expected format for no credits', () => {
    const error = new AIError(
      'OpenAI API quota exceeded',
      429,
      'openai',
      { noCredits: true }
    );

    const json = error.toJSON();

    // Verify all required fields are present
    expect(json).toHaveProperty('error');
    expect(json).toHaveProperty('message');
    expect(json).toHaveProperty('billingUrl');
    expect(json).toHaveProperty('invalidKey');
    expect(json).toHaveProperty('noCredits');
    expect(json).toHaveProperty('statusCode');

    // Verify values
    expect(json.noCredits).toBe(true);
    expect(json.invalidKey).toBe(false);
    expect(json.statusCode).toBe(429);
  });
});

/**
 * Integration Test Examples
 * 
 * These are example test cases that would require actual API calls.
 * They are commented out but serve as documentation for manual testing.
 */

/*
describe('Integration Tests', () => {
  describe('Claude API', () => {
    it('should handle invalid Claude API key', async () => {
      const config: AIConfig = {
        aiEnabled: true,
        aiProvider: 'claude',
        apiKey: 'sk-ant-invalid-key-12345'
      };

      try {
        await callAI(config, 'Test prompt', 'System prompt', 100);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AIError);
        expect((error as AIError).statusCode).toBe(401);
        expect((error as AIError).invalidKey).toBe(true);
      }
    });

    it('should handle Claude quota exceeded', async () => {
      const config: AIConfig = {
        aiEnabled: true,
        aiProvider: 'claude',
        apiKey: 'sk-ant-key-with-no-credits'
      };

      try {
        await callAI(config, 'Test prompt', 'System prompt', 100);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AIError);
        expect((error as AIError).statusCode).toBe(429);
        expect((error as AIError).noCredits).toBe(true);
      }
    });
  });

  describe('OpenAI API', () => {
    it('should handle invalid OpenAI API key', async () => {
      const config: AIConfig = {
        aiEnabled: true,
        aiProvider: 'openai',
        apiKey: 'sk-invalid-key-12345'
      };

      try {
        await callAI(config, 'Test prompt', 'System prompt', 100);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AIError);
        expect((error as AIError).statusCode).toBe(401);
        expect((error as AIError).invalidKey).toBe(true);
      }
    });

    it('should handle OpenAI quota exceeded', async () => {
      const config: AIConfig = {
        aiEnabled: true,
        aiProvider: 'openai',
        apiKey: 'sk-key-with-no-credits'
      };

      try {
        await callAI(config, 'Test prompt', 'System prompt', 100);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AIError);
        expect((error as AIError).statusCode).toBe(429);
        expect((error as AIError).noCredits).toBe(true);
      }
    });
  });
});
*/
