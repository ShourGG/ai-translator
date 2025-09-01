/**
 * 优化版AI翻译功能 - 老王特供版
 * 提升翻译准确度的核心改进
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const {
      text,
      target_language,
      target_lang,
      source_language,
      source_lang,
      model,
      station,
      context: userContext, // 新增：上下文支持
      domain, // 新增：领域支持
      style // 新增：文体风格
    } = body;

    const targetLang = target_language || target_lang;
    const sourceLang = source_language || source_lang;

    if (!text || !text.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '请输入要翻译的文本'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 智能文本长度限制（根据模型调整）
    const maxLength = model?.includes('gpt-4') ? 8000 : 5000;
    if (text.length > maxLength) {
      // 实现智能分段翻译
      const segments = smartTextSegmentation(text, maxLength);
      const translations = await translateSegments(
        segments,
        sourceLang,
        targetLang,
        model,
        station,
        env,
        { userContext, domain, style }
      );

      return new Response(
        JSON.stringify({
          success: true,
          translated_text: translations.join(''),
          segments_count: segments.length,
          ...translations[0] // 包含其他元信息
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // 使用增强版翻译逻辑
    const result = await enhancedTranslate(
      text,
      sourceLang,
      targetLang,
      model,
      station,
      env,
      { userContext, domain, style }
    );

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('Translation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: '翻译服务暂时不可用',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

/**
 * 智能文本分段
 */
function smartTextSegmentation(text, maxLength) {
  const segments = [];
  const sentences = text.match(/[^。！？.!?]+[。！？.!?]+/g) || [text];

  let currentSegment = '';
  for (const sentence of sentences) {
    if ((currentSegment + sentence).length > maxLength * 0.9) {
      if (currentSegment) segments.push(currentSegment);
      currentSegment = sentence;
    } else {
      currentSegment += sentence;
    }
  }
  if (currentSegment) segments.push(currentSegment);

  return segments;
}

/**
 * 批量翻译分段
 */
async function translateSegments(
  segments,
  sourceLang,
  targetLang,
  model,
  station,
  env,
  options
) {
  const translations = [];
  let previousContext = '';

  for (let i = 0; i < segments.length; i++) {
    const contextInfo = i > 0 ? `前文概要：${previousContext.slice(-200)}` : '';
    const result = await enhancedTranslate(
      segments[i],
      sourceLang,
      targetLang,
      model,
      station,
      env,
      { ...options, additionalContext: contextInfo }
    );

    if (result.success) {
      translations.push(result.translated_text);
      previousContext += result.translated_text;
    } else {
      throw new Error(`分段${i + 1}翻译失败: ${result.error}`);
    }
  }

  return translations;
}

/**
 * 增强版翻译函数 - 核心优化
 */
async function enhancedTranslate(
  text,
  sourceLang,
  targetLang,
  model,
  station,
  env,
  options = {}
) {
  const { userContext, domain, style, additionalContext } = options;

  // 扩展的语言支持
  const languageMap = {
    zh: { name: '中文', variants: ['简体中文', '繁体中文'] },
    en: { name: 'English', variants: ['American English', 'British English'] },
    ja: { name: '日本語', variants: ['敬語', '口語'] },
    ko: { name: '한국어', variants: ['존댓말', '반말'] },
    fr: { name: 'Français', variants: [] },
    de: { name: 'Deutsch', variants: [] },
    es: { name: 'Español', variants: ['España', 'México'] },
    it: { name: 'Italiano', variants: [] },
    pt: { name: 'Português', variants: ['Brasil', 'Portugal'] },
    ru: { name: 'Русский', variants: [] },
    ar: { name: 'العربية', variants: [] },
    hi: { name: 'हिन्दी', variants: [] },
    th: { name: 'ไทย', variants: [] },
    vi: { name: 'Tiếng Việt', variants: [] }
  };

  if (sourceLang && sourceLang !== 'auto' && !languageMap[sourceLang]) {
    return { success: false, error: `不支持的源语言: ${sourceLang}` };
  }

  if (!languageMap[targetLang]) {
    return { success: false, error: `不支持的目标语言: ${targetLang}` };
  }

  const sourceLangName =
    sourceLang && sourceLang !== 'auto' ? languageMap[sourceLang].name : '原文';
  const targetLangName = languageMap[targetLang].name;

  // 构建增强版提示词
  const enhancedPrompt = buildEnhancedPrompt(
    text,
    sourceLangName,
    targetLangName,
    {
      userContext,
      domain,
      style,
      additionalContext
    }
  );

  // 智能模型选择
  const selectedModel = selectBestModel(model, env, text.length);

  // 获取配置
  const config = getConfigForStation(station, selectedModel, env);

  // 智能参数调整
  const parameters = getOptimalParameters(text, targetLang);

  return await callEnhancedAPI(
    config,
    selectedModel,
    enhancedPrompt,
    text,
    sourceLang,
    targetLang,
    languageMap,
    parameters
  );
}

/**
 * 构建增强版提示词 - 这是提升准确度的关键！
 */
function buildEnhancedPrompt(text, sourceLang, targetLang, options = {}) {
  const { userContext, domain, style, additionalContext } = options;

  let prompt = `你是一位专业的翻译专家，精通${sourceLang}和${targetLang}。`;

  // 添加领域专业性
  if (domain) {
    const domainMap = {
      tech: '科技、编程、软件开发',
      medical: '医学、生物、健康',
      legal: '法律、合同、政策',
      business: '商业、金融、经济',
      academic: '学术、研究、论文',
      literature: '文学、诗歌、散文',
      casual: '日常对话、口语交流'
    };
    prompt += `\n专业领域：${domainMap[domain] || domain}`;
  }

  // 添加文体风格
  if (style) {
    const styleMap = {
      formal: '正式、严谨、专业',
      informal: '非正式、轻松、口语化',
      technical: '技术性、精确、专业术语',
      creative: '创意性、生动、富有表现力',
      neutral: '中性、客观、标准'
    };
    prompt += `\n文体风格：${styleMap[style] || style}`;
  }

  // 添加上下文
  if (userContext) {
    prompt += `\n背景信息：${userContext}`;
  }

  if (additionalContext) {
    prompt += `\n${additionalContext}`;
  }

  // 核心翻译指令 - 更详细的要求
  prompt += `

请将以下${sourceLang}文本翻译成${targetLang}。

翻译要求：
1. 准确性：确保翻译准确传达原文的含义，不遗漏、不曲解
2. 流畅性：译文必须符合${targetLang}的语言习惯，读起来自然流畅
3. 文化适应：考虑目标语言的文化背景，适当调整表达方式
4. 术语一致：专业术语翻译保持一致性和准确性
5. 格式保持：保留原文的格式、标点和段落结构
6. 语气匹配：准确传达原文的语气、情感和态度
${domain === 'tech' ? '7. 代码和技术术语：保持英文原样或使用行业标准译法' : ''}
${style === 'formal' ? '8. 敬语使用：适当使用敬语和礼貌用语' : ''}

特殊说明：
- 如果原文包含特定文化元素，请提供必要的文化转换
- 保留人名、地名、品牌名的原文，可在括号中提供译文
- 数字、日期、度量单位按目标语言习惯转换

原文内容：
${text}

请只输出最终的翻译结果，不要包含任何解释或注释。`;

  return prompt;
}

/**
 * 智能选择最佳模型
 */
function selectBestModel(requestedModel, env, textLength) {
  // 模型优先级（从高到低）
  const modelPriority = [
    'claude-3.5-sonnet',
    'claude-3-opus',
    'gpt-4-turbo',
    'gpt-4',
    'claude-3-haiku',
    'gpt-3.5-turbo',
    'gemini-pro',
    'gemini-2.0-flash'
  ];

  // 如果用户指定了模型，优先使用
  if (requestedModel) {
    return requestedModel;
  }

  // 根据文本长度智能选择
  if (textLength > 2000) {
    // 长文本使用更强的模型
    return env.CLAUDE_MODEL || 'claude-3.5-sonnet';
  } else if (textLength < 100) {
    // 短文本可以使用快速模型
    return 'gpt-3.5-turbo';
  }

  // 默认使用配置的模型
  return env.CLAUDE_MODEL || 'claude-3.5-sonnet';
}

/**
 * 获取最优参数配置
 */
function getOptimalParameters(text, targetLang) {
  const baseParams = {
    max_tokens: Math.min(4000, text.length * 3), // 动态调整
    stream: false
  };

  // 根据目标语言调整温度
  const temperatureMap = {
    zh: 0.5, // 中文需要更高的创造性
    ja: 0.4, // 日文注重准确性
    ko: 0.4, // 韩文注重准确性
    en: 0.6, // 英文可以更灵活
    default: 0.5
  };

  baseParams.temperature = temperatureMap[targetLang] || temperatureMap.default;

  // 检测是否包含代码或技术内容
  if (/```|code|function|class|import|export|const|let|var/.test(text)) {
    baseParams.temperature = 0.2; // 技术内容需要更精确
  }

  // 检测是否是创意内容
  if (/诗|poem|poetry|歌词|lyrics|故事|story/.test(text)) {
    baseParams.temperature = 0.7; // 创意内容需要更高温度
  }

  return baseParams;
}

/**
 * 获取中转站配置
 */
function getConfigForStation(station, model, env) {
  const configs = {
    primary: {
      baseUrl: env.CLAUDE_BASE_URL,
      apiKey: env.CLAUDE_API_KEY,
      station: '主要中转站'
    },
    backup: {
      baseUrl: env.CLAUDE_BASE_URL_BACKUP,
      apiKey: env.CLAUDE_API_KEY_BACKUP,
      station: '备用中转站'
    },
    third: {
      baseUrl: env.CLAUDE_BASE_URL_THIRD,
      apiKey: env.CLAUDE_API_KEY_THIRD,
      station: '第三中转站'
    }
  };

  return configs[station] || configs.primary;
}

/**
 * 调用增强版API
 */
async function callEnhancedAPI(
  config,
  model,
  prompt,
  originalText,
  sourceLang,
  targetLang,
  languageMap,
  parameters
) {
  const { baseUrl, apiKey, station } = config;

  if (!apiKey || !baseUrl) {
    return {
      success: false,
      error: `${station}配置不完整`
    };
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'User-Agent': 'AI-Translator-Pro/2.0'
  };

  // 增强的请求数据
  const requestData = {
    model: model,
    messages: [
      {
        role: 'system',
        content: '你是一位专业的翻译专家，请提供准确、流畅、地道的翻译。'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    ...parameters
  };

  // 添加高级参数（如果模型支持）
  if (model.includes('gpt-4') || model.includes('claude')) {
    requestData.top_p = 0.9;
    requestData.frequency_penalty = 0.1;
    requestData.presence_penalty = 0.1;
  }

  try {
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const apiUrl = cleanBaseUrl.endsWith('/v1')
      ? `${cleanBaseUrl}/chat/completions`
      : `${cleanBaseUrl}/v1/chat/completions`;

    console.log(`使用${station}进行翻译，模型: ${model}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestData),
      signal: AbortSignal.timeout(30000) // 30秒超时
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API请求失败: ${response.status} - ${errorText}`);

      // 智能重试逻辑
      if (response.status === 429 || response.status === 503) {
        // 速率限制或服务暂时不可用，可以尝试其他中转站
        return {
          success: false,
          error: '服务繁忙，请稍后重试',
          shouldRetry: true
        };
      }

      return {
        success: false,
        error: `API请求失败: ${response.status}`,
        debug: {
          status: response.status,
          station: station,
          model: model
        }
      };
    }

    const result = await response.json();
    const translatedText = result.choices[0].message.content.trim();

    // 翻译后处理
    const processedText = postProcessTranslation(translatedText, targetLang);

    return {
      success: true,
      original_text: originalText,
      translated_text: processedText,
      source_language:
        sourceLang && sourceLang !== 'auto'
          ? languageMap[sourceLang].name
          : '自动检测',
      target_language: languageMap[targetLang].name,
      ai_provider: `AI专业翻译 (${station})`,
      model: model,
      confidence: calculateConfidence(originalText, processedText),
      api_endpoint: baseUrl
    };
  } catch (error) {
    console.error('翻译请求失败:', error);

    if (error.name === 'AbortError') {
      return {
        success: false,
        error: '请求超时，请稍后重试',
        shouldRetry: true
      };
    }

    return {
      success: false,
      error: '网络请求失败，请稍后重试'
    };
  }
}

/**
 * 翻译后处理
 */
function postProcessTranslation(text, targetLang) {
  // 清理多余的空格
  text = text.replace(/\s+/g, ' ').trim();

  // 中文特殊处理
  if (targetLang === 'zh') {
    // 修复中英文之间的空格
    text = text.replace(/([a-zA-Z])([一-龥])/g, '$1 $2');
    text = text.replace(/([一-龥])([a-zA-Z])/g, '$1 $2');
    // 修复标点符号
    text = text.replace(/\s+([，。！？；：])/g, '$1');
  }

  // 日文特殊处理
  if (targetLang === 'ja') {
    // 确保句号使用正确
    text = text.replace(/\.\s*$/g, '。');
  }

  return text;
}

/**
 * 计算翻译置信度
 */
function calculateConfidence(original, translated) {
  // 简单的置信度计算
  const lengthRatio = translated.length / original.length;

  // 合理的长度比例范围
  if (lengthRatio > 0.5 && lengthRatio < 3) {
    return 'high';
  } else if (lengthRatio > 0.3 && lengthRatio < 5) {
    return 'medium';
  } else {
    return 'low';
  }
}
