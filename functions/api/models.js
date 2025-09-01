/**
 * Cloudflare Pages Function for Model Management
 * 管理可用的AI模型列表 - 根据不同中转站返回对应的模型
 */

export async function onRequestGet(context) {
  const { env, request } = context;

  // 从URL参数获取中转站
  const url = new URL(request.url);
  const station = url.searchParams.get('station') || 'primary';

  try {
    // 定义每个中转站支持的模型列表
    const stationModels = {
      // 主要中转站 (kkyyxx.xyz) 支持的模型 - 2025年8月更新
      primary: {
        // GPT系列
        'gpt-4.1': {
          name: 'GPT-4.1 ⭐',
          provider: 'OpenAI',
          speed: 'medium',
          quality: 'excellent',
          price: '$2.0/M (提示) $4.0/M (补全)'
        },
        'gpt-4o': {
          name: 'GPT-4o',
          provider: 'OpenAI',
          speed: 'fast',
          quality: 'excellent',
          price: '$2.5/M (提示) $10.0/M (补全)'
        },
        'gpt-5': {
          name: 'GPT-5',
          provider: 'OpenAI',
          speed: 'medium',
          quality: 'excellent',
          price: '$1.25/M (提示) $10.0/M (补全)'
        },
        'gpt-5-chat': {
          name: 'GPT-5 Chat',
          provider: 'OpenAI',
          speed: 'medium',
          quality: 'excellent',
          price: '$4.0/M (提示) $32.0/M (补全)'
        },
        'gpt-5-mini': {
          name: 'GPT-5 Mini',
          provider: 'OpenAI',
          speed: 'fast',
          quality: 'excellent',
          price: '$0.25/M (提示) $2.0/M (补全)'
        },
        'o3': {
          name: 'O3',
          provider: 'OpenAI',
          speed: 'slow',
          quality: 'excellent',
          price: '$2.0/M (提示) $8.0/M (补全)'
        },
        'o3-mini': {
          name: 'O3 Mini',
          provider: 'OpenAI',
          speed: 'fast',
          quality: 'excellent',
          price: '$1.1/M (提示) $4.4/M (补全)'
        },

        // Claude系列
        'claude-3-5-sonnet': {
          name: 'Claude 3.5 Sonnet ⭐',
          provider: 'Anthropic',
          speed: 'fast',
          quality: 'excellent',
          price: '$0.2/M (提示) $1.0/M (补全)'
        },
        'claude-3-7-sonnet': {
          name: 'Claude 3.7 Sonnet',
          provider: 'Anthropic',
          speed: 'medium',
          quality: 'excellent',
          price: '$2.0/M (提示) $10.0/M (补全)'
        },
        'claude-3-haiku': {
          name: 'Claude 3 Haiku',
          provider: 'Anthropic',
          speed: 'fast',
          quality: 'good',
          price: '$0.2/M (提示) $1.0/M (补全)'
        },
        'claude-sonnet-4-20250514': {
          name: 'Claude Sonnet 4',
          provider: 'Anthropic',
          speed: 'medium',
          quality: 'excellent',
          price: '$3.0/M (提示) $15.0/M (补全)'
        },

        // DeepSeek系列
        'deepseek-ai/DeepSeek-R1-0528': {
          name: 'DeepSeek R1 (0528)',
          provider: 'DeepSeek',
          speed: 'medium',
          quality: 'excellent',
          price: '$2.0/M (提示) $2.0/M (补全)'
        },
        'deepseek-ai/DeepSeek-V3-0324': {
          name: 'DeepSeek V3 (0324)',
          provider: 'DeepSeek',
          speed: 'fast',
          quality: 'excellent',
          price: '$2.0/M (提示) $2.0/M (补全)'
        },
        'deepseek-ai/DeepSeek-V3.1': {
          name: 'DeepSeek V3.1',
          provider: 'DeepSeek',
          speed: 'fast',
          quality: 'excellent',
          price: '$2.0/M (提示) $2.0/M (补全)'
        },
        'DeepSeek-V3.1-thinkg': {
          name: 'DeepSeek V3.1 Thinking',
          provider: 'DeepSeek',
          speed: 'slow',
          quality: 'excellent',
          price: '$4.0/M (提示) $4.0/M (补全)'
        },

        // Gemini系列
        'gemini-2.5-flash': {
          name: 'Gemini 2.5 Flash',
          provider: 'Google',
          speed: 'fast',
          quality: 'excellent',
          price: '$0.3/M (提示) $2.5/M (补全)'
        },
        'gemini-2.5-pro': {
          name: 'Gemini 2.5 Pro',
          provider: 'Google',
          speed: 'medium',
          quality: 'excellent',
          price: '$2.5/M (提示) $20.0/M (补全)'
        },

        // GLM系列
        'GLM-4.5': {
          name: 'GLM-4.5',
          provider: '智谱AI',
          speed: 'fast',
          quality: 'good',
          price: '$2.0/M (提示) $2.0/M (补全)'
        },
        'zai-org/GLM-4.5': {
          name: 'GLM-4.5 (智谱AI)',
          provider: '智谱AI',
          speed: 'fast',
          quality: 'good',
          price: '$2.0/M (提示) $2.0/M (补全)'
        },
        'zai-org/GLM-4.5-Air': {
          name: 'GLM-4.5 Air',
          provider: '智谱AI',
          speed: 'fast',
          quality: 'good',
          price: '$2.0/M (提示) $2.0/M (补全)'
        },
        'zai-org/GLM-4.5V': {
          name: 'GLM-4.5V',
          provider: '智谱AI',
          speed: 'medium',
          quality: 'good',
          price: '$2.0/M (提示) $2.0/M (补全)'
        },

        // Grok系列
        'grok-3-latest': {
          name: 'Grok 3',
          provider: 'xAI',
          speed: 'medium',
          quality: 'excellent',
          price: '$4.0/M (提示) $4.0/M (补全)'
        },
        'grok-4-latest': {
          name: 'Grok 4',
          provider: 'xAI',
          speed: 'fast',
          quality: 'excellent',
          price: '$2.0/M (提示) $2.0/M (补全)'
        },

        // Kimi系列
        'moonshotai/Kimi-K2-Instruct': {
          name: 'Kimi K2',
          provider: '月之暗面',
          speed: 'fast',
          quality: 'good',
          price: '$2.0/M (提示) $2.0/M (补全)'
        },

        // 通义千问系列
        'Qwen/Qwen3-235B-A22B-Instruct-2507': {
          name: '通义千问 235B',
          provider: '阿里巴巴',
          speed: 'medium',
          quality: 'excellent',
          price: '$2.0/M (提示) $2.0/M (补全)'
        },
        'Qwen/Qwen3-235B-A22B-Thinking-2507': {
          name: '通义千问 235B Thinking',
          provider: '阿里巴巴',
          speed: 'slow',
          quality: 'excellent',
          price: '$2.0/M (提示) $2.0/M (补全)'
        },
        'Qwen/Qwen3-Coder-480B-A35B-Instruct': {
          name: '通义千问 Coder 480B',
          provider: '阿里巴巴',
          speed: 'medium',
          quality: 'excellent',
          price: '$2.0/M (提示) $2.0/M (补全)'
        },

        // OpenAI OSS系列
        'openai/gpt-oss-120b': {
          name: 'OpenAI GPT OSS 120B',
          provider: 'OpenAI',
          speed: 'medium',
          quality: 'good',
          price: '$2.0/M (提示) $2.0/M (补全)'
        },
        'openai/gpt-oss-20b': {
          name: 'OpenAI GPT OSS 20B',
          provider: 'OpenAI',
          speed: 'fast',
          quality: 'good',
          price: '$2.0/M (提示) $2.0/M (补全)'
        }
      }
    };

    // 获取指定中转站的模型列表
    const modelsObj = stationModels[station] || stationModels.primary;

    // 🔧 将对象格式转换为数组格式，添加id属性 - 修复[object Object]显示问题
    const models = Object.keys(modelsObj).map(modelId => ({
      id: modelId,
      ...modelsObj[modelId]
    }));

    // 获取当前配置的默认模型（仅主中转站）
    const currentModel = env.CLAUDE_MODEL || 'claude-3-5-sonnet';

    // 构建响应
    const response = {
      success: true,
      station: station,
      current_model: currentModel,
      available_models: models,
      model_count: models.length,
      station_info: {
        primary: '主要中转站 - 支持指定模型'
      }
    };

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('Get models error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: '获取模型列表失败'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// 处理 OPTIONS 请求 (CORS 预检)
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
