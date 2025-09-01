/**
 * Cloudflare Pages Function for Language Detection
 * 智能语言检测功能
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { text } = await request.json();

    if (!text || !text.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '请输入要检测的文本'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 使用简单的语言检测逻辑
    const detectedLang = detectLanguage(text);

    return new Response(
      JSON.stringify({
        success: true,
        detected_language: detectedLang.code,
        language_name: detectedLang.name,
        confidence: detectedLang.confidence
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      }
    );
  } catch (error) {
    console.error('Language detection error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: '语言检测服务暂时不可用'
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
 * 检测文本语言
 * 这是一个简化的语言检测实现
 */
function detectLanguage(text) {
  // 🔧 老王改进：增强语言检测算法
  const patterns = {
    // 日语：平假名、片假名优先级最高
    ja: {
      name: '日语',
      regex: /[\u3040-\u309f\u30a0-\u30ff]/g,
      weight: 5,  // 提高权重
      keywords: ['です', 'ます', 'した', 'する', 'この', 'その', 'について', 'により']
    },
    // 中文：汉字
    zh: {
      name: '中文',
      regex: /[\u4e00-\u9fa5]/g,
      weight: 3,
      keywords: ['的', '是', '在', '有', '和', '了', '我', '你', '他', '她', '它', '这', '那']
    },
    // 法语：特殊字符和常用词
    fr: {
      name: '法语',
      regex: /[àâäéèêëïîôöùûüÿç]/gi,
      weight: 4,
      keywords: ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se', 'pas', 'tout', 'plus', 'par', 'grand', 'en', 'une', 'être', 'et', 'à', 'il', 'avoir', 'ne', 'je', 'son', 'que', 'se', 'qui', 'ce', 'dans', 'en', 'du', 'elle', 'au', 'de', 'ce', 'le', 'tout', 'en', 'y', 'mais', 'd', 'lui', 'nous', 'comme', 'ou', 'si', 'leur', 'y', 'dire', 'elle', 'si', 'son', 'tout', 'mon', 'et', 'à', 'vous', 'te', 'la', 'sur', 'avec', 'être', 'pour', 'en', 'avoir', 'de', 'je', 'son', 'que', 'se', 'qui', 'ce', 'dans', 'en', 'du', 'elle', 'au', 'de', 'ce', 'le', 'tout', 'en', 'y', 'mais', 'd', 'lui', 'nous', 'comme', 'ou', 'si', 'leur', 'y', 'dire', 'elle', 'si', 'son', 'tout', 'mon', 'et', 'à', 'vous', 'te', 'la', 'sur', 'avec']
    },
    // 德语：特殊字符和常用词
    de: {
      name: '德语',
      regex: /[äöüßÄÖÜ]/g,
      weight: 4,
      keywords: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als', 'auch', 'es', 'an', 'werden', 'aus', 'er', 'hat', 'dass', 'sie', 'nach', 'wird', 'bei', 'einer', 'um', 'am', 'sind', 'noch', 'wie', 'einem', 'über', 'einen', 'so', 'zum', 'war', 'haben', 'nur', 'oder', 'aber', 'vor', 'zur', 'bis', 'mehr', 'durch', 'man', 'sein', 'wurde', 'sei', 'in']
    },
    // 韩语
    ko: {
      name: '韩语',
      regex: /[\uac00-\ud7af]/g,
      weight: 4,
      keywords: ['이', '그', '저', '의', '를', '은', '는', '이', '가', '에', '서', '로', '으로', '와', '과', '도', '만', '부터', '까지', '에서', '에게', '한테', '께', '에게서', '한테서', '께서']
    },
    // 阿拉伯语
    ar: {
      name: '阿拉伯语',
      regex: /[\u0600-\u06ff]/g,
      weight: 4,
      keywords: []
    },
    // 俄语
    ru: {
      name: '俄语',
      regex: /[\u0400-\u04ff]/g,
      weight: 3,
      keywords: ['и', 'в', 'не', 'на', 'я', 'быть', 'он', 'с', 'что', 'а', 'по', 'это', 'она', 'этот', 'к', 'но', 'они', 'мы', 'как', 'из', 'у', 'который', 'то', 'за', 'свой', 'что', 'её', 'так', 'же', 'все', 'себя', 'ни', 'о', 'только', 'до', 'ты', 'от', 'мочь', 'хотеть', 'ещё', 'когда', 'уже', 'для', 'вот', 'кто', 'да', 'говорить', 'год']
    },
    // 印地语
    hi: {
      name: '印地语',
      regex: /[\u0900-\u097f]/g,
      weight: 4,
      keywords: []
    },
    // 英语：最低优先级
    en: {
      name: '英语',
      regex: /[a-zA-Z]/g,
      weight: 1,
      keywords: ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their']
    }
  };

  // 🔧 老王改进：计算每种语言的匹配分数（字符 + 关键词）
  const scores = {};
  let totalMatches = 0;
  const textLower = text.toLowerCase();

  for (const [code, pattern] of Object.entries(patterns)) {
    let score = 0;

    // 1. 字符匹配得分
    const charMatches = text.match(pattern.regex);
    if (charMatches) {
      score += charMatches.length * pattern.weight;
      totalMatches += charMatches.length;
    }

    // 2. 关键词匹配得分（额外加分）
    if (pattern.keywords && pattern.keywords.length > 0) {
      let keywordMatches = 0;
      for (const keyword of pattern.keywords) {
        const keywordRegex = new RegExp('\\b' + keyword.toLowerCase() + '\\b', 'g');
        const matches = textLower.match(keywordRegex);
        if (matches) {
          keywordMatches += matches.length;
        }
      }
      // 关键词匹配给予额外权重
      score += keywordMatches * pattern.weight * 2;
    }

    if (score > 0) {
      scores[code] = score;
    }
  }

  // 🔧 老王改进：智能语言判定逻辑
  let detectedLang = 'en'; // 默认英语
  let maxScore = 0;
  let confidence = 0.5;

  // 找出得分最高的语言
  for (const [code, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedLang = code;
    }
  }

  // 🔧 特殊处理：日语优先级（如果有假名，优先判定为日语）
  const hiraganaMatches = text.match(/[\u3040-\u309f]/g);
  const katakanaMatches = text.match(/[\u30a0-\u30ff]/g);
  if ((hiraganaMatches && hiraganaMatches.length > 0) || (katakanaMatches && katakanaMatches.length > 0)) {
    detectedLang = 'ja';
    confidence = 0.95;
    console.log('🇯🇵 检测到假名，判定为日语');
  }
  // 🔧 特殊处理：法语特殊字符
  else if (text.match(/[àâäéèêëïîôöùûüÿç]/gi)) {
    if (scores.fr && scores.fr > (scores.en || 0)) {
      detectedLang = 'fr';
      confidence = 0.9;
      console.log('🇫🇷 检测到法语特殊字符');
    }
  }
  // 🔧 特殊处理：德语特殊字符
  else if (text.match(/[äöüßÄÖÜ]/g)) {
    if (scores.de && scores.de > (scores.en || 0)) {
      detectedLang = 'de';
      confidence = 0.9;
      console.log('🇩🇪 检测到德语特殊字符');
    }
  }
  // 🔧 改进：中文判定（降低优先级，避免误判日语）
  else if (scores.zh && scores.zh > 0) {
    const chineseMatches = text.match(/[\u4e00-\u9fa5]/g);
    const chineseRatio = chineseMatches ? chineseMatches.length / text.length : 0;

    // 只有在汉字比例很高且没有假名时才判定为中文
    if (chineseRatio > 0.4 && !hiraganaMatches && !katakanaMatches) {
      detectedLang = 'zh';
      confidence = 0.85;
      console.log('🇨🇳 检测到大量汉字，判定为中文');
    }
  }
  // 🔧 最后：纯拉丁字母的处理
  else if (/^[a-zA-Z\s.,!?;:'"-]+$/.test(text)) {
    // 如果有法语或德语特征，不强制判定为英语
    if (!scores.fr && !scores.de) {
      detectedLang = 'en';
      confidence = 0.8;  // 降低置信度，因为可能是其他拉丁语系
      console.log('🇺🇸 纯拉丁字母，判定为英语');
    }
  }

  // 计算最终置信度
  if (totalMatches > 0 && maxScore > 0) {
    confidence = Math.min(maxScore / (totalMatches * 3), 1);
  }

  return {
    code: detectedLang,
    name: patterns[detectedLang] ? patterns[detectedLang].name : '英语',
    confidence: confidence
  };
}
