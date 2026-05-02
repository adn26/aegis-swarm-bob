import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  
  // AI Provider Configuration
  ai: {
    provider: process.env.AI_PROVIDER || 'vertex-claude', // vertex-glm5 | vertex-claude | vertex-gemini | openai | ollama
    
    // Google Vertex AI (Unified access to GLM-5, Claude & Gemini)
    vertexAI: {
      projectId: process.env.VERTEX_AI_PROJECT_ID,
      location: process.env.VERTEX_AI_LOCATION || 'global',
      credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      
      // GLM-5 via OpenAI-compatible endpoint (Default for Red & Blue Teams)
      glm5: {
        model: process.env.VERTEX_GLM5_MODEL || 'zai-org/glm-5-maas',
        baseURL: process.env.VERTEX_GLM5_BASE_URL || 'https://aiplatform.googleapis.com/v1/projects/iwealthx-b7545/locations/global/endpoints/openapi',
        maxTokens: parseInt(process.env.VERTEX_GLM5_MAX_TOKENS || '4096', 10),
        temperature: parseFloat(process.env.VERTEX_GLM5_TEMPERATURE || '0.7'),
      },
      
      // Claude 4.6 Opus - Red Team Agent (Deep reasoning)
      opus: {
        model: process.env.VERTEX_CLAUDE_OPUS_MODEL || 'claude-4-6-opus@latest',
        maxTokens: parseInt(process.env.VERTEX_CLAUDE_OPUS_MAX_TOKENS || '4096', 10),
        temperature: parseFloat(process.env.VERTEX_CLAUDE_OPUS_TEMPERATURE || '0.7'),
      },
      
      // Claude 4.5 Haiku - Blue Team Agent & Judge (Fast execution)
      haiku: {
        model: process.env.VERTEX_CLAUDE_HAIKU_MODEL || 'claude-4-5-haiku@latest',
        maxTokens: parseInt(process.env.VERTEX_CLAUDE_HAIKU_MAX_TOKENS || '4096', 10),
        temperature: parseFloat(process.env.VERTEX_CLAUDE_HAIKU_TEMPERATURE || '0.7'),
      },
      
      // Claude 4.6 Sonnet - Alternative (Balanced)
      sonnet: {
        model: process.env.VERTEX_CLAUDE_SONNET_MODEL || 'claude-4-6-sonnet@latest',
        maxTokens: parseInt(process.env.VERTEX_CLAUDE_SONNET_MAX_TOKENS || '4096', 10),
        temperature: parseFloat(process.env.VERTEX_CLAUDE_SONNET_TEMPERATURE || '0.7'),
      },
      
      // Gemini via Vertex AI
      gemini: {
        model: process.env.VERTEX_GEMINI_MODEL || 'gemini-1.5-pro',
        maxTokens: parseInt(process.env.VERTEX_GEMINI_MAX_TOKENS || '4096', 10),
        temperature: parseFloat(process.env.VERTEX_GEMINI_TEMPERATURE || '0.7'),
      },
    },
    
    // OpenAI (Alternative)
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4096', 10),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    },
    
    // Ollama (Local)
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama3',
      maxTokens: parseInt(process.env.OLLAMA_MAX_TOKENS || '4096', 10),
      temperature: parseFloat(process.env.OLLAMA_TEMPERATURE || '0.7'),
    },
  },
  
  // Agent-specific model assignments
  agents: {
    // Red Team: Claude 3.5 Sonnet (Deep reasoning for vulnerability detection)
    redTeam: {
      provider: 'vertex-sonnet',
      role: 'attacker',
      description: 'Deep security analysis and exploit generation',
    },
    // Blue Team: Claude 3.5 Haiku (Fast patching)
    blueTeam: {
      provider: 'vertex-haiku',
      role: 'defender',
      description: 'Rapid patch generation',
    },
    // Sandbox Judge: Claude 4.5 Haiku (Fast verification)
    judge: {
      provider: 'vertex-haiku',
      role: 'judge',
      description: 'Quick verification of patch effectiveness',
    },
  },
  
  // GitHub
  github: {
    token: process.env.GITHUB_TOKEN,
    userAgent: 'aegis-swarm-security-scanner',
  },
  
  // Workspace
  workspace: {
    path: process.env.WORKSPACE_PATH || path.join(__dirname, '../../workspace'),
    maxSize: 500 * 1024 * 1024, // 500MB max per repository
  },
  
  // Docker
  docker: {
    socketPath: process.env.DOCKER_SOCKET || (process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock'),
    sandboxImage: process.env.SANDBOX_IMAGE || 'aegis-sandbox:latest',
    timeout: parseInt(process.env.SANDBOX_TIMEOUT || '30000', 10),
    memoryLimit: process.env.SANDBOX_MEMORY_LIMIT || '256m',
    cpuLimit: parseFloat(process.env.SANDBOX_CPU_LIMIT || '0.5'),
  },
  
  // Security
  security: {
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || path.join(__dirname, '../../logs/aegis.log'),
  },
  
  // File scanning
  scanning: {
    maxFileSize: 1024 * 1024, // 1MB per file
    supportedExtensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
    ignoredDirs: ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt'],
    ignoredFiles: ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'],
  },
};

// Validation
const validateConfig = () => {
  const errors = [];
  
  // Validate Supabase
  if (!config.supabase.url) {
    errors.push('SUPABASE_URL is required');
  }
  if (!config.supabase.anonKey) {
    errors.push('SUPABASE_ANON_KEY is required');
  }
  
  // Validate AI Provider
  const provider = config.ai.provider;
  const validProviders = ['vertex-glm5', 'vertex-claude', 'vertex-gemini', 'openai', 'ollama'];
  
  if (!validProviders.includes(provider)) {
    errors.push(`Invalid AI_PROVIDER: ${provider}. Must be one of: ${validProviders.join(', ')}`);
  }
  
  // Validate provider-specific config
  switch (provider) {
    case 'vertex-glm5':
    case 'vertex-claude':
    case 'vertex-gemini':
      if (!config.ai.vertexAI.projectId) {
        errors.push('VERTEX_AI_PROJECT_ID is required when using Vertex AI');
      }
      if (!config.ai.vertexAI.credentials) {
        errors.push('GOOGLE_APPLICATION_CREDENTIALS is required when using Vertex AI');
      }
      break;
    case 'openai':
      if (!config.ai.openai.apiKey) {
        errors.push('OPENAI_API_KEY is required when using OpenAI provider');
      }
      break;
    case 'ollama':
      // Ollama doesn't require API key
      break;
  }
  
  // Validate GitHub token
  if (!config.github.token) {
    errors.push('GITHUB_TOKEN is required');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
};

// Validate in production
if (config.nodeEnv === 'production') {
  validateConfig();
}

export default config;

// Made with Bob
