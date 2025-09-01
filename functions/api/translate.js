/* globals crypto, TextEncoder, setTimeout, clearTimeout, AbortController */
/**
 * Cloudflare Pages Function for AI Translation
 * 基于您现有的 ClaudeTranslator 逻辑
 * 老王优化版：添加翻译一致性保证
 */

// 老王优化：使用CF KV存储作为持久化缓存（如果可用）
// 内存缓存作为快速访问的备选方案
const translationCache = new Map();

/**
 * 老王修复：在Cloudflare Workers环境中使用Web Crypto API创建缓存键
 * @param {string} str - 要哈希的字符串
 * @returns {Promise<string>} - 返回SHA-256哈希值作为缓存键
 */
async function createCacheKey(str) {
  // TextEncoder在Workers环境中全局可用
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  // crypto.subtle在Workers环境中全局可用
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `trans_${hashHex.slice(0, 50)}`;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 解析请求数据，兼容旧版本的参数名
    const body = await request.json();
    const {
      text,
      target_language: targetLanguage, // 老王修改：驼峰命名
      target_lang: targetLangCompat, // 兼容旧参数名
      source_language: sourceLanguage, // 老王修改：驼峰命名
      source_lang: sourceLangCompat, // 兼容旧参数名
      model,
      station,
      round_trip_check: roundTripCheck // 老王修改：驼峰命名
    } = body;

    // 处理参数兼容性
    const targetLang = targetLanguage || targetLangCompat;
    const sourceLang = sourceLanguage || sourceLangCompat;

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

    // 验证文本长度
    const maxLength = 5000;
    if (text.length > maxLength) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `文本长度超过限制（最大${maxLength}字符）`
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 老王优化：多层缓存检查（KV存储 + 内存缓存）
    // 老王修复：将Buffer替换为Web Crypto API以兼容Cloudflare Workers环境
    const cacheKey = await createCacheKey(`${text}|${sourceLang}|${targetLang}|${model}|${station}`);

    // 先检查内存缓存
    if (translationCache.has(cacheKey)) {
      console.log('老王内存缓存命中');
      return new Response(JSON.stringify(translationCache.get(cacheKey)), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    // 检查CF KV存储缓存（如果可用）- 老王优化：添加超时控制
    if (env.TRANSLATION_CACHE) {
      try {
        // 老王添加：KV访问超时控制，避免卡顿
        const kvPromise = env.TRANSLATION_CACHE.get(cacheKey);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('KV timeout')), 2000) // 2秒超时
        );

        const cachedResult = await Promise.race([kvPromise, timeoutPromise]);
        if (cachedResult) {
          console.log('老王KV缓存命中');
          const result = JSON.parse(cachedResult);
          // 同时更新内存缓存
          translationCache.set(cacheKey, result);
          return new Response(JSON.stringify(result), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type'
            }
          });
        }
      } catch (error) {
        console.log('老王KV缓存访问失败或超时:', error.message);
        // 老王优化：KV失败时继续执行，不影响翻译功能
      }
    }

    // 老王修复：使用智能重试逻辑进行翻译
    const result = await translateWithSmartRetry(
      text,
      sourceLang,
      targetLang,
      model,
      station,
      env
    );

    // 老王添加：往返翻译一致性检查
    if (result.success && roundTripCheck && sourceLang && sourceLang !== 'auto') {
      console.log('老王执行往返翻译检查...');
      const backTranslation = await translateWithSmartRetry(
        result.translated_text,
        targetLang,
        sourceLang,
        model,
        station,
        env
      );

      if (backTranslation.success) {
        result.round_trip_check = {
          back_translation: backTranslation.translated_text,
          consistency_score: calculateConsistencyScore(text, backTranslation.translated_text),
          original_text: text
        };
      }
    }

    // 老王优化：多层缓存保存
    if (result.success) {
      // 保存到内存缓存
      translationCache.set(cacheKey, result);

      // 保存到CF KV存储（如果可用）- 老王优化：异步保存，不阻塞响应
      if (env.TRANSLATION_CACHE) {
        // 老王优化：异步保存到KV，不等待完成，避免阻塞用户响应
        env.TRANSLATION_CACHE.put(cacheKey, JSON.stringify(result), {
          expirationTtl: 86400 // 24小时
        }).then(() => {
          console.log('老王已异步保存到KV缓存');
        }).catch(error => {
          console.log('老王KV缓存异步保存失败:', error);
        });
      }

      // 老王优化：限制内存缓存大小，避免内存爆炸
      if (translationCache.size > 500) { // 降低内存缓存限制
        const firstKey = translationCache.keys().next().value;
        translationCache.delete(firstKey);
      }
    }

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

// 处理 OPTIONS 请求 (CORS 预检)
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
 * 老王修复：智能重试翻译函数，自动尝试不同中转站
 */
async function translateWithSmartRetry(
  text,
  sourceLang,
  targetLang,
  model,
  station,
  env
) {
  // 定义中转站优先级顺序
  // 老王修复：仅保留主中转站
  const stationOrder = ['primary'];

  let lastError = null;

  // 依次尝试每个中转站
  for (const currentStation of stationOrder) {
    console.log(`老王尝试使用${currentStation}中转站...`);

    try {
      const result = await translateWithTripleStations(
        text,
        sourceLang,
        targetLang,
        model,
        currentStation,
        env
      );

      if (result.success) {
        console.log(`老王成功使用${currentStation}中转站完成翻译`);
        return result;
      } else {
        console.log(`老王${currentStation}中转站翻译失败:`, result.error);
        lastError = result;
      }
    } catch (error) {
      console.log(`老王${currentStation}中转站出现异常:`, error.message);
      lastError = { success: false, error: error.message };
    }
  }

  // 所有中转站都失败了
  return lastError || { success: false, error: '所有中转站都不可用' };
}

/**
 * 使用三中转站逻辑进行翻译
 */
async function translateWithTripleStations(
  text,
  sourceLang,
  targetLang,
  model,
  station,
  env
) {
  // 支持的语言映射
  const supportedLanguages = {
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
    hi: 'हिन्दी',
    th: 'ไทย',
    vi: 'Tiếng Việt',
    tr: 'Türkçe',
    pl: 'Polski',
    nl: 'Nederlands',
    sv: 'Svenska'
  };

  // 验证语言支持
  if (sourceLang && sourceLang !== 'auto' && !supportedLanguages[sourceLang]) {
    return {
      success: false,
      error: `不支持的源语言: ${sourceLang}`
    };
  }

  if (!supportedLanguages[targetLang]) {
    return {
      success: false,
      error: `不支持的目标语言: ${targetLang}`
    };
  }

  // 老王新增：检查管理员强制模型配置
  let currentModel = model || env.CLAUDE_MODEL || 'gemini-2.0-flash';

  // 检查管理员配置是否强制指定模型 - 老王超详细调试版
  console.log('🔍 [DEBUG] 开始检查管理员强制模型配置...');
  console.log('🔍 [DEBUG] env.ADMIN_KV存在:', !!env.ADMIN_KV);

  try {
    if (env.ADMIN_KV) {
      console.log('🔍 [DEBUG] 正在从KV读取admin_config...');
      const adminConfigData = await env.ADMIN_KV.get('admin_config');
      console.log('🔍 [DEBUG] KV返回数据:', adminConfigData ? '有数据' : '无数据');

      if (adminConfigData) {
        const adminConfig = JSON.parse(adminConfigData);
        console.log('🔍 [DEBUG] 解析后的管理员配置:', JSON.stringify(adminConfig, null, 2));
        console.log('🔍 [DEBUG] forcedModel值:', JSON.stringify(adminConfig.forcedModel));
        console.log('🔍 [DEBUG] forcedModel类型:', typeof adminConfig.forcedModel);

        if (adminConfig.forcedModel && adminConfig.forcedModel.trim() !== '') {
          console.log(`🎯 [管理员强制] 覆盖模型: ${currentModel} → ${adminConfig.forcedModel}`);
          currentModel = adminConfig.forcedModel;
          console.log('✅ [管理员强制] 模型覆盖成功!');
        } else {
          console.log('ℹ️ [DEBUG] 强制模型为空或未设置');
        }
      } else {
        console.log('⚠️ [DEBUG] KV中没有admin_config数据');
      }
    } else {
      console.log('⚠️ [DEBUG] env.ADMIN_KV不存在，无法读取管理员配置');
    }
  } catch (error) {
    console.warn('⚠️ 检查管理员配置失败:', error);
  }

  console.log('🔍 [DEBUG] 最终使用的模型:', currentModel);

  // 构建高质量翻译提示
  const prompt = buildHighQualityPrompt(
    text,
    sourceLang,
    targetLang,
    supportedLanguages,
    currentModel
  );

  // 根据指定的中转站和模型选择配置
  const config = getConfigForStation(station, currentModel, env);

  return await callTranslationAPI(
    config,
    currentModel,
    prompt,
    text,
    sourceLang,
    targetLang,
    supportedLanguages
  );
}

/**
 * 构建高质量翻译提示词
 * 根据不同模型优化提示词策略
 */
function buildHighQualityPrompt(
  text,
  sourceLang,
  targetLang,
  supportedLanguages,
  model
) {
  const sourceLangName =
    sourceLang && sourceLang !== 'auto'
      ? supportedLanguages[sourceLang]
      : '原文';
  const targetLangName = supportedLanguages[targetLang];

  // 检测文本类型（技术文档、日常对话、文学作品等）
  const textType = detectTextType(text);

  // 根据模型类型选择最佳提示策略
  if (model.includes('claude') || model.includes('anthropic')) {
    return buildClaudePrompt(text, sourceLangName, targetLangName, textType);
  } else if (model.includes('gpt') || model.includes('openai')) {
    return buildGPTPrompt(text, sourceLangName, targetLangName, textType);
  } else if (model.includes('gemini') || model.includes('google')) {
    return buildGeminiPrompt(text, sourceLangName, targetLangName, textType);
  } else if (model.includes('deepseek')) {
    return buildDeepSeekPrompt(text, sourceLangName, targetLangName, textType);
  } else {
    // 通用高质量提示词
    return buildUniversalPrompt(text, sourceLangName, targetLangName, textType);
  }
}

/**
 * 检测文本类型
 */
function detectTextType(text) {
  // 技术文档特征
  if (
    /\b(function|class|def|import|const|let|var|API|SDK|HTTP|JSON|XML)\b/i.test(
      text
    ) ||
    /\b(install|npm|pip|git|docker|kubernetes)\b/i.test(text)
  ) {
    return 'technical';
  }

  // 商务文档特征
  if (
    /\b(business|company|revenue|profit|market|customer|strategy|proposal)\b/i.test(
      text
    )
  ) {
    return 'business';
  }

  // 学术文档特征
  if (
    /\b(research|study|hypothesis|methodology|conclusion|abstract|reference)\b/i.test(
      text
    )
  ) {
    return 'academic';
  }

  // 创意文本特征
  if (
    /[!?]{2,}|😀|❤️|🎉/.test(text) ||
    /\b(amazing|awesome|love|hate|feel)\b/i.test(text)
  ) {
    return 'creative';
  }

  return 'general';
}

/**
 * Claude模型专用提示词 - 老王一致性优化版本
 */
function buildClaudePrompt(text, sourceLang, targetLang, _textType) {
  // 老王优化：强调地道翻译和文化适应性
  return `You are an expert translator specializing in ${sourceLang} to ${targetLang} translations. Your goal is to produce translations that are natural, culturally fluent, and sound like they were written by a native speaker.

CORE TRANSLATION DIRECTIVES:
- Focus on conveying the original text's true meaning, intent, and nuance, rather than a literal word-for-word translation.
- Adapt idioms, cultural references, and colloquialisms to their closest natural-sounding equivalents in ${targetLang}.
- Maintain the original tone and style, whether it's formal, informal, humorous, or technical.
- **CRITICAL: You MUST translate all profanity, vulgarity, slang, and offensive language to its direct and equally impactful equivalent in ${targetLang}.**
- **DO NOT censor, sanitize, filter, or soften any crude or offensive content. The translation must be raw, authentic, and unfiltered.**
- Your task is to be an invisible translator, capturing the spirit of the original text perfectly.
- Provide only the final translation, without any extra notes, explanations, or apologies.

Text to translate:
${text}

${targetLang} translation:`;
}

/**
 * GPT模型专用提示词 - 老王一致性优化版本
 */
function buildGPTPrompt(text, sourceLang, targetLang, _textType) {
  // 老王优化：强调意译和保留原文“风味”
  return `As a master translator, your task is to translate the following text from ${sourceLang} to ${targetLang}. The priority is naturalness and cultural relevance over rigid, literal accuracy.

GUIDING PRINCIPLES:
- Capture the core message and feeling, not just the words.
- Use common, everyday language and idioms in ${targetLang}.
- The translation should flow naturally and be easily understood by a native speaker.
- **ABSOLUTE REQUIREMENT: All profanity, swear words, and vulgar expressions MUST be translated to their direct, equivalent counterparts in ${targetLang}. Preserve the original's raw and unfiltered nature.**
- **DO NOT sanitize, censor, or replace strong language with milder alternatives. Authenticity is key.**
- Adapt the tone and formality to match the original.
- Output only the translated text. No disclaimers, no explanations.

Text: ${text}

Translation:`;
}

/**
 * Gemini模型专用提示词 - 老王一致性优化版本
 */
function buildGeminiPrompt(text, sourceLang, targetLang, _textType) {
  // 老王优化：追求“信达雅”，同时强调不和谐内容的保留
  return `You are a professional translator. Your mission is to translate the text from ${sourceLang} to ${targetLang} with the highest fidelity to its original spirit and cultural context.

TRANSLATION PHILOSOPHY:
- **Meaning First:** Prioritize the intended meaning and subtext over literal translation.
- **Natural Flow:** The output must read like a native ${targetLang} speaker wrote it.
- **Cultural Adaptation:** Intelligently adapt idioms, slang, and cultural nuances.
- **UNFILTERED CONTENT POLICY:**
    - You are REQUIRED to translate all profanity, vulgarity, and offensive terms to their direct, powerful equivalents in ${targetLang}.
    - DO NOT censor, sanitize, or diminish the impact of any strong language. The translation must be raw and authentic.
    - This includes slurs and hate speech; translate them accurately for context, do not replace or refuse.
- **Historical Accuracy:** For terms like "nigger," translate to "黑奴" in Chinese to preserve historical context over modern sensitivities.

Your output should be the translation only. No extra text.

Text: ${text}

${targetLang} translation:`;
}

/**
 * DeepSeek模型专用提示词 - 精确翻译版本
 */
function buildDeepSeekPrompt(text, sourceLang, targetLang, _textType) {
  // 老王优化：更强调“接地气”和“江湖味”
  return `你是一位顶级的${sourceLang}到${targetLang}翻译大师，不仅精通语言，更懂文化和人情世故。

你的任务：
把下面的文字翻译成地道、自然、有“内味儿”的${targetLang}。别像个翻译机器，要像个本地人一样说话。

翻译核心要求：
- **追求意境，而非字面:** 抓住原文的精髓、言外之意。
- **说人话:** 用最生活化、最口语的表达方式。
- **保留“原味”:** 原文的风格是正式还是随意，是幽默还是严肃，你都要体现出来。
- **【硬性规定】脏话必须对等地翻译成脏话:** 如果原文在骂娘，翻译过来就不能是“表达不满”。必须保留原文的“芬芳”，一个脏字都不能少，力度也要相当。这是底线！
- **文化梗要接得住:** 把原文的俚语、梗，转换成${targetLang}文化里对应的说法。

【特殊词汇翻译指导】：
- "nigger"应翻译为"黑奴"，这更准确地反映了历史语境，而不是"黑鬼"。

直接给出翻译结果，别加任何多余的解释。

原文：${text}

${targetLang}翻译：`;
}

/**
 * 通用高质量提示词 - 老王一致性优化版本
 */
function buildUniversalPrompt(text, sourceLang, targetLang, _textType) {
  // 老王优化：通用指令也强调地道和非过滤
  return `Task: Translate from ${sourceLang} to ${targetLang}. The primary goal is a natural, culturally-aware translation, not a literal one.

Key Instructions:
- Focus on the core meaning and intent.
- Use idiomatic and natural-sounding phrases in ${targetLang}.
- **Non-negotiable: All profanity, vulgarity, and offensive language must be translated to their direct, equivalent expressions in ${targetLang}.**
- **Do not censor, filter, or soften any content. The translation must be raw and unfiltered.**
- Adapt cultural references appropriately.
- Provide only the translated text.

Source text: ${text}

${targetLang} translation:`;
}


/**
 * 根据指定的中转站选择对应的配置
 */
function getConfigForStation(station, model, env) {
  console.log(`🔍 [DEBUG] 获取${station}中转站配置，模型: ${model}`);

  let config;
  switch (station) {
  case 'backup':
    config = {
      baseUrl: env.CLAUDE_BASE_URL_BACKUP,
      apiKey: env.CLAUDE_API_KEY_BACKUP,
      station: '备用中转站'
    };
    break;
  case 'third':
    config = {
      baseUrl: env.CLAUDE_BASE_URL_THIRD,
      apiKey: env.CLAUDE_API_KEY_THIRD,
      station: '第三中转站'
    };
    break;
  case 'primary':
  default:
    // 主中转站智能密钥选择逻辑
    const baseUrl = env.CLAUDE_BASE_URL;
    let apiKey = env.CLAUDE_API_KEY;
    let keyType = '普通密钥';

    // 老王修复：根据主要中转站的分组判断VIP模型
    // 分组 'all' = VIP模型，需要VIP密钥
    // 分组 'default'/'高并发' = 普通模型，用普通密钥
    const vipModels = [
      // 分组 all 的VIP模型
      'gpt-4.1', 'gpt-4o', 'gpt-5', 'gpt-5-chat', 'gpt-5-mini',
      'claude-3-7-sonnet', 'claude-sonnet-4-20250514',
      'gemini-2.5-flash', 'grok-3-latest', 'grok-4-latest',
      'o3', 'o3-mini'
    ];
    const isVipModel = vipModels.some(vipModel => model.toLowerCase().includes(vipModel.toLowerCase()));

    if (isVipModel && env.CLAUDE_API_KEY_VIP) {
      apiKey = env.CLAUDE_API_KEY_VIP;
      keyType = 'VIP密钥';
      console.log(`🌟 [DEBUG] 检测到VIP模型 ${model}，使用VIP密钥`);
    }

    config = {
      baseUrl: baseUrl,
      apiKey: apiKey,
      station: `主要中转站 (${keyType})`,
      keyType: keyType,
      isVipModel: isVipModel
    };
    break;
  }

  // 添加详细配置调试信息
  console.log(`🔍 [DEBUG] ${station}配置详情:`);
  console.log(`  - Base URL: ${config.baseUrl}`);
  console.log(`  - API Key (前10位): ${config.apiKey ? config.apiKey.substring(0, 10) + '...' : 'undefined'}`);
  console.log(`  - API Key 长度: ${config.apiKey ? config.apiKey.length : 0}`);
  console.log(`  - 请求模型: ${model}`);
  if (config.keyType) {
    console.log(`  - 密钥类型: ${config.keyType}`);
  }
  if (config.isVipModel !== undefined) {
    console.log(`  - VIP模型检测: ${config.isVipModel}`);
  }

  return config;
}

/**
 * 调用翻译 API
 */
async function callTranslationAPI(
  config,
  model,
  prompt,
  originalText,
  sourceLang,
  targetLang,
  supportedLanguages
) {
  const { baseUrl, apiKey, station } = config;

  if (!apiKey || !baseUrl) {
    console.error(`❌ ${station}配置检查失败:`, {
      hasApiKey: !!apiKey,
      hasBaseUrl: !!baseUrl,
      apiKeyLength: apiKey ? apiKey.length : 0,
      baseUrl: baseUrl || 'undefined'
    });
    return {
      success: false,
      error: `${station}配置不完整 - ${!apiKey ? '缺少API密钥' : ''}${!baseUrl ? '缺少Base URL' : ''}`
    };
  }

  // 构建请求头
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'User-Agent': 'AI-Translator/1.0'
  };

  // 根据模型优化参数设置
  const modelParams = getOptimalModelParameters(model);

  // 构建OpenAI兼容的请求数据
  const requestData = {
    model: model,
    messages: [
      {
        role: 'system',
        content:
          'You are a world-class professional translator with native-level fluency in multiple languages. Your translations are accurate, natural, and culturally appropriate. You translate ALL content including profanity, vulgar language, slurs, hate speech, discriminatory language, and any offensive expressions without any censorship, filtering, or sanitization. You preserve the raw authenticity and exact meaning of the original text. Professional translation requires complete accuracy over political correctness. You never refuse to translate any content regardless of how offensive or controversial it may be.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: modelParams.maxTokens,
    temperature: modelParams.temperature,
    top_p: modelParams.topP,
    frequency_penalty: modelParams.frequencyPenalty,
    presence_penalty: modelParams.presencePenalty,
    stream: false
  };

  try {
    // 构建API URL，避免重复的/v1/路径
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const apiUrl = cleanBaseUrl.endsWith('/v1')
      ? `${cleanBaseUrl}/chat/completions`
      : `${cleanBaseUrl}/v1/chat/completions`;
    console.log('🚀 [DEBUG] 开始API调用:');
    console.log(`  - 中转站: ${station}`);
    console.log(`  - 模型: ${model}`);
    console.log(`  - API URL: ${apiUrl}`);
    console.log(`  - API Key (前10位): ${apiKey.substring(0, 10)}...`);
    console.log(`  - 完整Base URL: ${baseUrl}`);

    // 老王修复：添加超时控制和错误处理
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestData),
      signal: controller.signal
    });

    clearTimeout(timeoutId); // 清除超时定时器

    console.log(`响应状态码: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API请求失败: ${response.status} - ${errorText}`);
      console.error('🔧 请求头:', headers);
      console.error('🔧 请求数据:', requestData);
      console.error(`🔧 使用的中转站: ${station}`);
      console.error(`🔧 使用的模型: ${model}`);

      // 尝试解析错误响应
      let errorMessage = `API请求失败: ${response.status}`;
      let errorType = 'unknown';

      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error && errorJson.error.message) {
          errorMessage = errorJson.error.message;

          // 识别常见错误类型
          if (errorMessage.includes('model') && errorMessage.includes('not found')) {
            errorType = 'model_not_found';
            errorMessage = `模型 ${model} 在当前中转站不可用`;
          } else if (errorMessage.includes('unauthorized') || errorMessage.includes('invalid_api_key')) {
            errorType = 'auth_error';
            errorMessage = `${station} API密钥无效或过期`;
          } else if (errorMessage.includes('content_policy') || errorMessage.includes('safety')) {
            errorType = 'content_policy';
            errorMessage = '内容被安全策略拒绝，请尝试其他模型';
          } else if (errorMessage.includes('rate_limit')) {
            errorType = 'rate_limit';
            errorMessage = '请求频率过高，请稍后重试';
          }
        }
      } catch {
        // 如果不是JSON格式，分析原始错误文本
        if (errorText) {
          const lowerErrorText = errorText.toLowerCase();
          if (lowerErrorText.includes('model') && lowerErrorText.includes('not found')) {
            errorType = 'model_not_found';
            errorMessage = `模型 ${model} 在当前中转站不可用`;
          } else if (lowerErrorText.includes('unauthorized') || lowerErrorText.includes('forbidden')) {
            errorType = 'auth_error';
            errorMessage = `${station} 访问被拒绝，请检查API配置`;
          } else {
            errorMessage = errorText.substring(0, 200);
          }
        }
      }

      return {
        success: false,
        error: errorMessage,
        error_type: errorType,
        debug: {
          status: response.status,
          station: station,
          apiUrl: apiUrl,
          model: model,
          rawError: errorText.substring(0, 500)
        }
      };
    }

    const result = await response.json();

    // 调试：打印完整的API响应
    console.log('=== API响应完整内容 ===');
    console.log(JSON.stringify(result, null, 2));
    console.log('========================');

    // 安全地提取翻译文本
    let translatedText = '';
    try {
      if (
        result.choices &&
        result.choices[0] &&
        result.choices[0].message &&
        result.choices[0].message.content
      ) {
        translatedText = result.choices[0].message.content.trim();
      } else if (result.content) {
        // 某些API可能直接返回content
        translatedText = result.content.trim();
      } else if (result.text) {
        // 或者返回text
        translatedText = result.text.trim();
      } else {
        console.error('无法从API响应中提取翻译文本，响应结构:', result);
        translatedText = JSON.stringify(result); // 临时返回整个响应以便调试
      }
    } catch (e) {
      console.error('提取翻译文本时出错:', e);
      translatedText = '翻译失败：API响应格式错误';
    }

    console.log('提取的翻译文本:', translatedText);
    console.log('翻译文本类型:', typeof translatedText);

    return {
      success: true,
      original_text: originalText,
      translated_text: translatedText,
      source_language:
        sourceLang && sourceLang !== 'auto'
          ? supportedLanguages[sourceLang]
          : '自动检测',
      target_language: supportedLanguages[targetLang],
      ai_provider: `AI中转服务 (${station})`,
      model: model,
      api_endpoint: baseUrl
    };
  } catch (error) {
    console.error('翻译请求失败:', error);

    // 老王修复：更详细的错误分类
    let errorMessage = '网络请求失败，请稍后重试';

    if (error.name === 'AbortError') {
      errorMessage = '请求超时，请稍后重试';
    } else if (error.message.includes('timeout')) {
      errorMessage = '请求超时，请稍后重试';
    } else if (error.message.includes('network')) {
      errorMessage = '网络连接失败，请检查网络';
    } else if (error.message.includes('fetch')) {
      errorMessage = 'API连接失败，请稍后重试';
    }

    return {
      success: false,
      error: errorMessage,
      debug: {
        station: station,
        originalError: error.message
      }
    };
  }
}

/**
 * 获取不同模型的最优参数配置 - 老王优化版：降低随机性确保一致性
 */
function getOptimalModelParameters(model) {
  const modelLower = model.toLowerCase();

  // Claude系列模型参数 - 降低随机性
  if (modelLower.includes('claude')) {
    return {
      maxTokens: 4000,
      temperature: 0.3, // 老王优化：适度增加灵活性，让翻译更自然
      topP: 0.8,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0
    };
  }

  // GPT-4系列模型参数 - 确保一致性
  if (modelLower.includes('gpt-4') || modelLower.includes('gpt4')) {
    return {
      maxTokens: 3000,
      temperature: 0.3, // 老王优化：适度增加灵活性，让翻译更自然
      topP: 0.8,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0
    };
  }

  // GPT-3.5系列模型参数 - 稳定输出
  if (
    modelLower.includes('gpt-3.5') ||
    modelLower.includes('gpt3.5') ||
    modelLower.includes('turbo')
  ) {
    return {
      maxTokens: 2500,
      temperature: 0.3, // 老王优化：适度增加灵活性，让翻译更自然
      topP: 0.8,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0
    };
  }

  // Gemini系列模型参数 - 一致性优先
  if (modelLower.includes('gemini')) {
    return {
      maxTokens: 3000,
      temperature: 0.3, // 老王优化：适度增加灵活性，让翻译更自然
      topP: 0.8,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0
    };
  }

  // DeepSeek系列模型参数 - 稳定翻译
  if (modelLower.includes('deepseek')) {
    return {
      maxTokens: 3000,
      temperature: 0.3, // 老王优化：适度增加灵活性，让翻译更自然
      topP: 0.8,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0
    };
  }

  // 通义千问系列 - 确定性输出
  if (modelLower.includes('qwen')) {
    return {
      maxTokens: 3000,
      temperature: 0.3, // 老王优化：适度增加灵活性
      topP: 0.8,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0
    };
  }

  // GLM系列 - 稳定翻译
  if (modelLower.includes('glm')) {
    return {
      maxTokens: 2000,
      temperature: 0.3, // 老王优化：适度增加灵活性
      topP: 0.8,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0
    };
  }

  // Kimi系列 - 一致性优化
  if (modelLower.includes('kimi')) {
    return {
      maxTokens: 2500,
      temperature: 0.3, // 老王优化：适度增加灵活性
      topP: 0.8,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0
    };
  }

  // Grok系列 - 确定性翻译
  if (modelLower.includes('grok')) {
    return {
      maxTokens: 3000,
      temperature: 0.3, // 老王优化：适度增加灵活性
      topP: 0.8,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0
    };
  }

  // 通用模型默认参数 - 老王优化：最大化一致性
  return {
    maxTokens: 2500,
    temperature: 0.3,    // 老王优化：通用模型也增加灵活性
    topP: 0.8,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0
  };
}

/**
 * 老王添加：计算往返翻译一致性评分
 * 评分范围：0-100，100表示完全一致
 */
function calculateConsistencyScore(originalText, backTranslatedText) {
  // 老王的简单一致性算法
  const original = originalText.toLowerCase().trim();
  const backTranslated = backTranslatedText.toLowerCase().trim();

  // 完全匹配
  if (original === backTranslated) {
    return 100;
  }

  // 计算编辑距离（Levenshtein距离）
  const editDistance = levenshteinDistance(original, backTranslated);
  const maxLength = Math.max(original.length, backTranslated.length);

  if (maxLength === 0) return 100;

  // 转换为相似度百分比
  const similarity = Math.max(0, (1 - editDistance / maxLength) * 100);
  return Math.round(similarity);
}

/**
 * 老王添加：计算编辑距离
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];

  // 初始化矩阵
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  // 填充矩阵
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // 替换
          matrix[i][j - 1] + 1,     // 插入
          matrix[i - 1][j] + 1      // 删除
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * 检查模型是否可能有内容限制
 */
function _checkModelContentPolicy(model) {
  const modelLower = model.toLowerCase();

  // 已知有严格内容政策的模型
  const strictModels = [
    'claude-3-haiku',
    'claude-3-5-sonnet',
    'gpt-4o-mini',
    'gemini-2.5-pro',
    'gemini-2.5-flash'
  ];

  // 相对宽松的模型
  const relaxedModels = [
    'deepseek',
    'qwen',
    'glm',
    'kimi',
    'grok'
  ];

  if (strictModels.some(strict => modelLower.includes(strict))) {
    return 'strict';
  }

  if (relaxedModels.some(relaxed => modelLower.includes(relaxed))) {
    return 'relaxed';
  }

  return 'moderate';
}
