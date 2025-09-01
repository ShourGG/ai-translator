/**
 * 健康检查端点 - 基于三中转站配置
 */

export async function onRequestGet(context) {
  const { env } = context;

  // 检查主要中转站配置
  const hasPrimaryConfig = !!(env.CLAUDE_API_KEY && env.CLAUDE_BASE_URL);



  // 当前使用的模型
  const currentModel = env.CLAUDE_MODEL || 'gemini-2.0-flash';

  // 可用的模型列表
  const availableModels = {
    primary: [
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash ⭐',
        price: '$0.1/M + $0.4/M',
        provider: 'Google'
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        price: '$0.3/M + $2.5/M',
        provider: 'Google'
      },
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        price: '$1.25/M + $10/M',
        provider: 'Google'
      },
      {
        id: 'deepseek-ai/DeepSeek-V3.1',
        name: 'DeepSeek V3.1',
        price: '$2.0/M',
        provider: 'DeepSeek'
      },
      {
        id: 'deepseek-ai/DeepSeek-V3-0324',
        name: 'DeepSeek V3-0324',
        price: '$2.0/M',
        provider: 'DeepSeek'
      },
      {
        id: 'deepseek-ai/DeepSeek-R1-0528',
        name: 'DeepSeek R1-0528',
        price: '$2.0/M',
        provider: 'DeepSeek'
      },
      {
        id: 'DeepSeek-V3.1-thinkg',
        name: 'DeepSeek V3.1 Thinking',
        price: '$4.0/M',
        provider: 'DeepSeek'
      },
      {
        id: 'moonshotai/Kimi-K2-Instruct',
        name: 'Kimi K2 Instruct',
        price: '$2.0/M',
        provider: '月之暗面'
      },
      {
        id: 'Qwen/Qwen3-235B-A22B-Instruct-2507',
        name: 'Qwen3 235B Instruct',
        price: '$2.0/M',
        provider: '阿里巴巴'
      },
      {
        id: 'Qwen/Qwen3-235B-A22B-Thinking-2507',
        name: 'Qwen3 235B Thinking',
        price: '$2.0/M',
        provider: '阿里巴巴'
      },
      {
        id: 'zai-org/GLM-4.5',
        name: 'GLM-4.5',
        price: '$2.0/M',
        provider: '智谱AI'
      },
      {
        id: 'zai-org/GLM-4.5-Air',
        name: 'GLM-4.5 Air',
        price: '$2.0/M',
        provider: '智谱AI'
      },
      {
        id: 'zai-org/GLM-4.5V',
        name: 'GLM-4.5V',
        price: '$2.0/M',
        provider: '智谱AI'
      },
      {
        id: 'openai/gpt-oss-120b',
        name: 'GPT OSS 120B',
        price: '$2.0/M',
        provider: 'OpenAI'
      },
      {
        id: 'openai/gpt-oss-20b',
        name: 'GPT OSS 20B',
        price: '$2.0/M',
        provider: 'OpenAI'
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        price: '$2.0/M',
        provider: 'OpenAI'
      }
    ]
  };

  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.1',
    current_model: currentModel,
    debug: {
      hasPrimaryConfig,
      configuredStations: [hasPrimaryConfig].filter(Boolean).length
    },
    stations: {
      primary: {
        name: '主要中转站',
        configured: hasPrimaryConfig,
        endpoint: env.CLAUDE_BASE_URL || 'not configured',
        models: availableModels.primary
      }
    },
    supported_languages: {
      zh: '中文',
      en: 'English',
      ja: '日本語',
      ko: '한국어',
      fr: 'Français',
      de: 'Deutsch',
      es: 'Español',
      it: 'Italiano',
      pt: 'Português',
      ru: 'Русский',
      ar: 'العربية',
      hi: 'हिन्दी'
    }
  };

  // 检查配置状态
  const configuredStations = [
    hasPrimaryConfig,
    hasBackupConfig,
    hasThirdConfig
  ].filter(Boolean).length;

  if (configuredStations === 0) {
    status.status = 'unhealthy';
    status.error = '所有中转站都未配置';
  } else if (configuredStations === 1) {
    status.status = 'warning';
    if (hasPrimaryConfig) status.warning = '仅主要中转站已配置';
    else if (hasBackupConfig) status.warning = '仅备用中转站已配置';
    else if (hasThirdConfig) status.warning = '仅第三中转站已配置';
  } else if (configuredStations === 2) {
    status.status = 'good';
    status.info = `已配置${configuredStations}个中转站，具备冗余能力`;
  } else {
    status.status = 'excellent';
    status.info = '所有3个中转站均已配置，具备最高可用性';
  }

  const httpStatus = ['healthy', 'good', 'excellent', 'warning'].includes(
    status.status
  )
    ? 200
    : 503;

  return new Response(JSON.stringify(status, null, 2), {
    status: httpStatus,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
