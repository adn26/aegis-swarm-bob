import { ChatVertexAI } from '@langchain/google-vertexai';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
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
      
      const messages = Array.isArray(prompt) ? prompt : [new HumanMessage(prompt)];
      const response = await this.model.invoke(messages);

      // Handle different response formats
      if (typeof response === 'string') return response;
      if (response && response.content) return response.content;
      return JSON.stringify(response);
    } catch (error) {
      logger.error('Vertex AI GLM-5 error:', error);
      throw new AgentError('Vertex AI GLM-5', 'Failed to generate completion', error.message);
    }
  }

  async *streamCompletion(prompt, options = {}) {
    try {
      await this.ensureValidToken();
      
      const messages = Array.isArray(prompt) ? prompt : [new HumanMessage(prompt)];
      const stream = await this.model.stream(messages);

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
      const messages = Array.isArray(prompt) ? prompt : [new HumanMessage(prompt)];
      const response = await this.model.invoke(messages);

      if (typeof response === 'string') return response;
      if (response && response.content) return response.content;
      return JSON.stringify(response);
    } catch (error) {
      logger.error('Vertex AI Claude Opus error:', error);
      throw new AgentError('Vertex AI Claude Opus', 'Failed to generate completion', error.message);
    }
  }

  async *streamCompletion(prompt, options = {}) {
    try {
      const messages = Array.isArray(prompt) ? prompt : [new HumanMessage(prompt)];
      const stream = await this.model.stream(messages);

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
 * Vertex AI - Claude Haiku Provider
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
      const messages = Array.isArray(prompt) ? prompt : [new HumanMessage(prompt)];
      const response = await this.model.invoke(messages);

      if (typeof response === 'string') return response;
      if (response && response.content) return response.content;
      return JSON.stringify(response);
    } catch (error) {
      logger.error('Vertex AI Claude Haiku error:', error);
      throw new AgentError('Vertex AI Claude Haiku', 'Failed to generate completion', error.message);
    }
  }

  async *streamCompletion(prompt, options = {}) {
    try {
      const messages = Array.isArray(prompt) ? prompt : [new HumanMessage(prompt)];
      const stream = await this.model.stream(messages);

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
 * Vertex AI - Claude Sonnet Provider
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
      const messages = Array.isArray(prompt) ? prompt : [new HumanMessage(prompt)];
      const response = await this.model.invoke(messages);

      if (typeof response === 'string') return response;
      if (response && response.content) return response.content;
      return JSON.stringify(response);
    } catch (error) {
      logger.error('Vertex AI Claude Sonnet error:', error);
      throw new AgentError('Vertex AI Claude Sonnet', 'Failed to generate completion', error.message);
    }
  }

  async *streamCompletion(prompt, options = {}) {
    try {
      const messages = Array.isArray(prompt) ? prompt : [new HumanMessage(prompt)];
      const stream = await this.model.stream(messages);

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
      let messages;
      if (Array.isArray(prompt)) {
        messages = prompt;
      } else {
        messages = [new HumanMessage(prompt)];
      }

      // Convert to LangChain message instances correctly for ChatVertexAI
      const finalMessages = messages.map(m => {
        const content = typeof m === 'string' ? m : (m.content || m.text || '');
        const role = typeof m === 'string' ? 'human' : (m.role || m.type || 'human');

        let msg;
        if (role === 'system') {
          msg = new SystemMessage(content);
        } else if (role === 'ai' || role === 'assistant') {
          // Note: ChatVertexAI uses AIMessage but let's check what's available
          // For now, we mainly use System and Human in our nodes
          msg = new HumanMessage(content); // Fallback
        } else {
          msg = new HumanMessage(content);
        }
        
        return msg;
      });

      logger.info(`Gemini invoking with ${finalMessages.length} messages`);

      // Use string prompt directly. LangChain Vertex AI sometimes fails with messages arrays.
      let combinedPrompt = finalMessages.map(m => {
        let role = 'User';
        if (m instanceof SystemMessage || m.role === 'system' || m._getType?.() === 'system') role = 'System';
        return `[${role}]\n${m.content}`;
      }).join('\n\n');

      combinedPrompt += "\n\nCRITICAL: You MUST respond with ONLY a valid, strictly formatted JSON array or object. Escape ALL double quotes inside string values using \\\" and newlines using \\n. Do not wrap the JSON in markdown code blocks.";

      let response;
      try {
        const payload = [
          ["system", "You are an expert. Please respond only in JSON."],
          ["human", combinedPrompt]
        ];
        
        try {
          const boundModel = this.model.bind({ response_mime_type: "application/json" });
          response = await boundModel.invoke(payload);
        } catch (e) {
          response = await this.model.invoke(payload);
        }
      } catch (err) {
        throw err;
      }
    } catch (error) {
      logger.error('Vertex AI Gemini error:', error);
      throw new AgentError('Vertex AI Gemini', 'Failed to generate completion', error.message);
    }
  }

  async *streamCompletion(prompt, options = {}) {
    try {
      let messages;
      if (Array.isArray(prompt)) {
        messages = prompt.map(m => {
          if (typeof m === 'string') return new HumanMessage(m);
          const isProperInstance = m._getType || m.getType;
          if (m.content && !isProperInstance) {
            if (m.role === 'system' || m.type === 'system') return new SystemMessage(m.content);
            return new HumanMessage(m.content);
          }
          return m;
        });
      } else {
        messages = [new HumanMessage(prompt)];
      }

      const finalMessages = messages.map(m => {
        if (typeof m._getType === 'function' || typeof m.getType === 'function') return m;
        if (m.role === 'system' || m.type === 'system') return new SystemMessage(m.content || m.text || '');
        return new HumanMessage(m.content || m.text || '');
      });
      
      const stream = await this.model.stream(finalMessages);

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
 * OpenAI Provider
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
      const messages = Array.isArray(prompt) ? prompt : [new HumanMessage(prompt)];
      const response = await this.model.invoke(messages);

      if (typeof response === 'string') return response;
      if (response && response.content) return response.content;
      return JSON.stringify(response);
    } catch (error) {
      logger.error('OpenAI error:', error);
      throw new AgentError('OpenAI', 'Failed to generate completion', error.message);
    }
  }

  async *streamCompletion(prompt, options = {}) {
    try {
      const messages = Array.isArray(prompt) ? prompt : [new HumanMessage(prompt)];
      const stream = await this.model.stream(messages);

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
          prompt: Array.isArray(prompt) ? prompt.map(m => m.content).join('\n') : prompt,
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
          prompt: Array.isArray(prompt) ? prompt.map(m => m.content).join('\n') : prompt,
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

  getModel() {
    return null;
  }
}

/**
 * AI Provider Factory
 */
class AIProviderFactory {
  static createProvider(agentRole = 'default') {
    const provider = config.ai.provider;

    if (provider === 'vertex-glm5') {
      return new VertexGLM5Provider();
    }

    if (provider === 'vertex-claude') {
      switch (agentRole) {
        case 'redteam':
        case 'attacker':
          return new VertexClaudeOpusProvider();
        case 'blueteam':
        case 'defender':
        case 'judge':
          return new VertexClaudeHaikuProvider();
        default:
          return new VertexClaudeSonnetProvider();
      }
    }

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

const providerInstances = new Map();

export const getAIProvider = (agentRole = 'default') => {
  if (!providerInstances.has(agentRole)) {
    const provider = AIProviderFactory.createProvider(agentRole);
    providerInstances.set(agentRole, provider);
    logger.info(`AI Provider initialized for ${agentRole}: ${provider.name}`);
  }
  return providerInstances.get(agentRole);
};

export const getLangChainModel = (agentRole = 'default') => {
  const provider = getAIProvider(agentRole);
  const model = provider.getModel();
  
  if (!model) {
    throw new Error(`Provider ${provider.name} does not support LangChain integration`);
  }
  
  // Wrap the model to ensure all calls route through the robust generateCompletion method
  // This bypasses the message.getType prototype bugs in LangChain for Gemini
  return {
    ...model,
    invoke: async (messages, options) => {
      const content = await provider.generateCompletion(messages, options);
      return { content };
    },
    stream: async function*(messages, options) {
      for await (const chunk of provider.streamCompletion(messages, options)) {
        yield { content: chunk };
      }
    }
  };
};

export const getAllAgentModels = () => {
  return {
    redTeam: getLangChainModel('redteam'),
    blueTeam: getLangChainModel('blueteam'),
    judge: getLangChainModel('judge'),
  };
};

export default { getAIProvider, getLangChainModel, getAllAgentModels, AIProviderFactory };

// Made with Bob
