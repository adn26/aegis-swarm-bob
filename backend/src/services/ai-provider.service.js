import { ChatVertexAI } from '@langchain/google-vertexai';
import { ChatOpenAI } from '@langchain/openai';
import { execSync } from 'child_process';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { AgentError } from '../utils/errors.js';

/**
 * Abstract AI Provider Interface
 * All providers implement this interface for consistency
 */
class AIProvider {
  constructor(name) {
    this.name = name;
    this.model = null;
  }

  async generateCompletion(prompt, options = {}) {
    throw new Error('generateCompletion must be implemented');
  }

  async *streamCompletion(prompt, options = {}) {
    throw new Error('streamCompletion must be implemented');
  }

  /**
   * Get LangChain-compatible model instance
   * This is used by LangGraph for agent orchestration
   */
  getModel() {
    return this.model;
  }
}

/**
 * Token cache for GLM-5 authentication
 * Tokens expire after ~1 hour, so we cache and refresh as needed
 */
let cachedToken = null;
let tokenExpiry = null;

/**
 * Vertex AI - GLM-5 Provider (OpenAI-compatible endpoint)
 * Used for both Red Team and Blue Team agents
 */
class VertexGLM5Provider extends AIProvider {
  constructor() {
    super('Vertex AI - GLM-5 (OpenAI-compatible)');
    
    // Get fresh access token
    const accessToken = this.getAccessToken();
    
    this.model = new ChatOpenAI({
      modelName: config.ai.vertexAI.glm5.model,
      temperature: config.ai.vertexAI.glm5.temperature,
      maxTokens: config.ai.vertexAI.glm5.maxTokens,
      openAIApiKey: accessToken, // Use gcloud token as apiKey
      configuration: {
        baseURL: config.ai.vertexAI.glm5.baseURL,
      }
    });

    logger.info(`Initialized ${this.name}: ${config.ai.vertexAI.glm5.model}`);
    logger.info(`Base URL: ${config.ai.vertexAI.glm5.baseURL}`);
  }

  /**
   * Get Google Cloud access token via gcloud CLI
   * Implements caching with 50-minute expiry (tokens last ~60 minutes)
   */
  getAccessToken() {
    const now = Date.now();
    
    // Return cached token if still valid (with 10-minute buffer)
    if (cachedToken && tokenExpiry && now < tokenExpiry) {
      logger.debug('Using cached gcloud access token');
      return cachedToken;
    }

    try {
      logger.info('Fetching fresh gcloud access token...');
      const token = execSync('gcloud auth print-access-token', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'], // Suppress stderr
        shell: true
      }).toString().trim();

      if (!token || token.length === 0) {
        throw new Error('Empty token returned from gcloud');
      }

      // Cache token with 50-minute expiry (10-minute buffer before actual expiry)
      cachedToken = token;
      tokenExpiry = now + (50 * 60 * 1000); // 50 minutes
      
      logger.info('Successfully fetched and cached gcloud access token');
      return token;
    } catch (error) {
      logger.error('Failed to fetch gcloud access token:', error);
      throw new AgentError(
        'Vertex AI GLM-5',
        'Failed to authenticate with gcloud',
        'Ensure gcloud CLI is installed and authenticated: gcloud auth login'
      );
    }
  }

  /**
   * Refresh token if needed before making requests
   */
  async ensureValidToken() {
    const now = Date.now();
    
    // Refresh if token is expired or about to expire
    if (!cachedToken || !tokenExpiry || now >= tokenExpiry) {
      const newToken = this.getAccessToken();
      
      // Update the model's API key with fresh token
      this.model = new ChatOpenAI({
        modelName: config.ai.vertexAI.glm5.model,
        temperature: config.ai.vertexAI.glm5.temperature,
        maxTokens: config.ai.vertexAI.glm5.maxTokens,
        openAIApiKey: newToken,
        configuration: {
          baseURL: config.ai.vertexAI.glm5.baseURL,
        }
      });
      
      logger.info('Refreshed GLM-5 model with new access token');
    }
  }

  async generateCompletion(prompt, options = {}) {
    try {
      await this.ensureValidToken();
      
      const response = await this.model.invoke([
        { role: 'user', content: prompt }
      ]);

      return response.content;
    } catch (error) {
      logger.error('Vertex AI GLM-5 error:', error);
      throw new AgentError('Vertex AI GLM-5', 'Failed to generate completion', error.message);
    }
  }

  async *streamCompletion(prompt, options = {}) {
    try {
      await this.ensureValidToken();
      
      const stream = await this.model.stream([
        { role: 'user', content: prompt }
      ]);

      for await (const chunk of stream) {
        if (chunk.content) {
          yield chunk.content;
        }
      }
    } catch (error) {
      logger.error('Vertex AI GLM-5 streaming error:', error);
      throw new AgentError('Vertex AI GLM-5', 'Failed to stream completion', error.message);
    }
  }
}

/**
 * Vertex AI - Claude Opus Provider (Red Team Agent)
 * Deep reasoning for complex vulnerability detection
 */
class VertexClaudeOpusProvider extends AIProvider {
  constructor() {
    super('Vertex AI - Claude 4.6 Opus');
    
    this.model = new ChatVertexAI({
      model: config.ai.vertexAI.opus.model,
      temperature: config.ai.vertexAI.opus.temperature,
      maxOutputTokens: config.ai.vertexAI.opus.maxTokens,
      project: config.ai.vertexAI.projectId,
      location: config.ai.vertexAI.location,
    });

    logger.info(`Initialized ${this.name}: ${config.ai.vertexAI.opus.model}`);
  }

  async generateCompletion(prompt, options = {}) {
    try {
      const response = await this.model.invoke([
        { role: 'user', content: prompt }
      ]);

      return response.content;
    } catch (error) {
      logger.error('Vertex AI Claude Opus error:', error);
      throw new AgentError('Vertex AI Claude Opus', 'Failed to generate completion', error.message);
    }
  }

  async *streamCompletion(prompt, options = {}) {
    try {
      const stream = await this.model.stream([
        { role: 'user', content: prompt }
      ]);

      for await (const chunk of stream) {
        if (chunk.content) {
          yield chunk.content;
        }
      }
    } catch (error) {
      logger.error('Vertex AI Claude Opus streaming error:', error);
      throw new AgentError('Vertex AI Claude Opus', 'Failed to stream completion', error.message);
    }
  }
}

/**
 * Vertex AI - Claude Haiku Provider (Blue Team Agent & Judge)
 * Fast patching and verification
 */
class VertexClaudeHaikuProvider extends AIProvider {
  constructor() {
    super('Vertex AI - Claude 4.5 Haiku');
    
    this.model = new ChatVertexAI({
      model: config.ai.vertexAI.haiku.model,
      temperature: config.ai.vertexAI.haiku.temperature,
      maxOutputTokens: config.ai.vertexAI.haiku.maxTokens,
      project: config.ai.vertexAI.projectId,
      location: config.ai.vertexAI.location,
    });

    logger.info(`Initialized ${this.name}: ${config.ai.vertexAI.haiku.model}`);
  }

  async generateCompletion(prompt, options = {}) {
    try {
      const response = await this.model.invoke([
        { role: 'user', content: prompt }
      ]);

      return response.content;
    } catch (error) {
      logger.error('Vertex AI Claude Haiku error:', error);
      throw new AgentError('Vertex AI Claude Haiku', 'Failed to generate completion', error.message);
    }
  }

  async *streamCompletion(prompt, options = {}) {
    try {
      const stream = await this.model.stream([
        { role: 'user', content: prompt }
      ]);

      for await (const chunk of stream) {
        if (chunk.content) {
          yield chunk.content;
        }
      }
    } catch (error) {
      logger.error('Vertex AI Claude Haiku streaming error:', error);
      throw new AgentError('Vertex AI Claude Haiku', 'Failed to stream completion', error.message);
    }
  }
}

/**
 * Vertex AI - Claude Sonnet Provider (Alternative)
 * Balanced performance
 */
class VertexClaudeSonnetProvider extends AIProvider {
  constructor() {
    super('Vertex AI - Claude 4.6 Sonnet');
    
    this.model = new ChatVertexAI({
      model: config.ai.vertexAI.sonnet.model,
      temperature: config.ai.vertexAI.sonnet.temperature,
      maxOutputTokens: config.ai.vertexAI.sonnet.maxTokens,
      project: config.ai.vertexAI.projectId,
      location: config.ai.vertexAI.location,
    });

    logger.info(`Initialized ${this.name}: ${config.ai.vertexAI.sonnet.model}`);
  }

  async generateCompletion(prompt, options = {}) {
    try {
      const response = await this.model.invoke([
        { role: 'user', content: prompt }
      ]);

      return response.content;
    } catch (error) {
      logger.error('Vertex AI Claude Sonnet error:', error);
      throw new AgentError('Vertex AI Claude Sonnet', 'Failed to generate completion', error.message);
    }
  }

  async *streamCompletion(prompt, options = {}) {
    try {
      const stream = await this.model.stream([
        { role: 'user', content: prompt }
      ]);

      for await (const chunk of stream) {
        if (chunk.content) {
          yield chunk.content;
        }
      }
    } catch (error) {
      logger.error('Vertex AI Claude Sonnet streaming error:', error);
      throw new AgentError('Vertex AI Claude Sonnet', 'Failed to stream completion', error.message);
    }
  }
}

/**
 * Vertex AI - Gemini Provider
 * Access Gemini models through Google Vertex AI
 */
class VertexGeminiProvider extends AIProvider {
  constructor() {
    super('Vertex AI - Gemini');
    
    this.model = new ChatVertexAI({
      model: config.ai.vertexAI.gemini.model,
      temperature: config.ai.vertexAI.gemini.temperature,
      maxOutputTokens: config.ai.vertexAI.gemini.maxTokens,
      project: config.ai.vertexAI.projectId,
      location: config.ai.vertexAI.location,
    });

    logger.info(`Initialized ${this.name}: ${config.ai.vertexAI.gemini.model}`);
  }

  async generateCompletion(prompt, options = {}) {
    try {
      const response = await this.model.invoke([
        { role: 'user', content: prompt }
      ]);

      return response.content;
    } catch (error) {
      logger.error('Vertex AI Gemini error:', error);
      throw new AgentError('Vertex AI Gemini', 'Failed to generate completion', error.message);
    }
  }

  async *streamCompletion(prompt, options = {}) {
    try {
      const stream = await this.model.stream([
        { role: 'user', content: prompt }
      ]);

      for await (const chunk of stream) {
        if (chunk.content) {
          yield chunk.content;
        }
      }
    } catch (error) {
      logger.error('Vertex AI Gemini streaming error:', error);
      throw new AgentError('Vertex AI Gemini', 'Failed to stream completion', error.message);
    }
  }
}

/**
 * OpenAI Provider (Alternative)
 * Direct OpenAI API access
 */
class OpenAIProvider extends AIProvider {
  constructor() {
    super('OpenAI');
    
    this.model = new ChatOpenAI({
      modelName: config.ai.openai.model,
      temperature: config.ai.openai.temperature,
      maxTokens: config.ai.openai.maxTokens,
      openAIApiKey: config.ai.openai.apiKey,
    });

    logger.info(`Initialized OpenAI: ${config.ai.openai.model}`);
  }

  async generateCompletion(prompt, options = {}) {
    try {
      const response = await this.model.invoke([
        { role: 'user', content: prompt }
      ]);

      return response.content;
    } catch (error) {
      logger.error('OpenAI error:', error);
      throw new AgentError('OpenAI', 'Failed to generate completion', error.message);
    }
  }

  async *streamCompletion(prompt, options = {}) {
    try {
      const stream = await this.model.stream([
        { role: 'user', content: prompt }
      ]);

      for await (const chunk of stream) {
        if (chunk.content) {
          yield chunk.content;
        }
      }
    } catch (error) {
      logger.error('OpenAI streaming error:', error);
      throw new AgentError('OpenAI', 'Failed to stream completion', error.message);
    }
  }
}

/**
 * Ollama Provider (Local Models)
 * For running local LLMs
 */
class OllamaProvider extends AIProvider {
  constructor() {
    super('Ollama');
    
    this.baseUrl = config.ai.ollama.baseUrl;
    this.modelName = config.ai.ollama.model;
    this.maxTokens = config.ai.ollama.maxTokens;
    this.temperature = config.ai.ollama.temperature;

    logger.info(`Initialized Ollama: ${this.modelName}`);
  }

  async generateCompletion(prompt, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.modelName,
          prompt,
          stream: false,
          options: {
            num_predict: this.maxTokens,
            temperature: this.temperature,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      logger.error('Ollama error:', error);
      throw new AgentError('Ollama', 'Failed to generate completion', error.message);
    }
  }

  async *streamCompletion(prompt, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.modelName,
          prompt,
          stream: true,
          options: {
            num_predict: this.maxTokens,
            temperature: this.temperature,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              yield data.response;
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    } catch (error) {
      logger.error('Ollama streaming error:', error);
      throw new AgentError('Ollama', 'Failed to stream completion', error.message);
    }
  }

  // Ollama doesn't have a LangChain integration, so we return null
  getModel() {
    return null;
  }
}

/**
 * AI Provider Factory
 * Creates the appropriate provider based on agent role
 */
class AIProviderFactory {
  static createProvider(agentRole = 'default') {
    const provider = config.ai.provider;

    // For Vertex AI GLM-5, use same model for all agents
    if (provider === 'vertex-glm5') {
      return new VertexGLM5Provider();
    }

    // For Vertex AI Claude, select model based on agent role
    if (provider === 'vertex-claude') {
      switch (agentRole) {
        case 'redteam':
        case 'attacker':
          return new VertexClaudeOpusProvider(); // Deep reasoning
        case 'blueteam':
        case 'defender':
        case 'judge':
          return new VertexClaudeHaikuProvider(); // Fast execution
        default:
          return new VertexClaudeSonnetProvider(); // Balanced
      }
    }

    // For other providers, use standard selection
    switch (provider) {
      case 'vertex-gemini':
        return new VertexGeminiProvider();
      case 'openai':
        return new OpenAIProvider();
      case 'ollama':
        return new OllamaProvider();
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }
}

// Provider instances cache
const providerInstances = new Map();

/**
 * Get AI Provider for specific agent role
 * @param {string} agentRole - 'redteam', 'blueteam', 'judge', or 'default'
 */
export const getAIProvider = (agentRole = 'default') => {
  if (!providerInstances.has(agentRole)) {
    const provider = AIProviderFactory.createProvider(agentRole);
    providerInstances.set(agentRole, provider);
    logger.info(`AI Provider initialized for ${agentRole}: ${provider.name}`);
  }
  return providerInstances.get(agentRole);
};

/**
 * Get LangChain model for use with LangGraph
 * @param {string} agentRole - 'redteam', 'blueteam', 'judge', or 'default'
 */
export const getLangChainModel = (agentRole = 'default') => {
  const provider = getAIProvider(agentRole);
  const model = provider.getModel();
  
  if (!model) {
    throw new Error(`Provider ${provider.name} does not support LangChain integration`);
  }
  
  return model;
};

/**
 * Get models for all agents
 * Returns an object with models for each agent role
 */
export const getAllAgentModels = () => {
  return {
    redTeam: getLangChainModel('redteam'),
    blueTeam: getLangChainModel('blueteam'),
    judge: getLangChainModel('judge'),
  };
};

export default { getAIProvider, getLangChainModel, getAllAgentModels, AIProviderFactory };

// Made with Bob
