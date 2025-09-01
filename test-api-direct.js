/**
 * 老王的直接API测试脚本
 * 用于测试中转站API是否正常工作
 */

async function testAPI() {
    console.log('老王开始测试API...');

    // 测试配置 - 直接使用.env文件中的值
    const configs = [
        {
            name: '主要中转站',
            baseUrl: 'https://api.kkyyxx.xyz',
            apiKey: 'sk-nZMgqcGpdOrSRMZRTmQ4LjU1rTm3LEnPROtTpBltYmmk2WTM',
            model: 'gemini-2.0-flash'
        },
        {
            name: '备用中转站',
            baseUrl: 'https://api.anglergap.org',
            apiKey: 'sk-2iMT6oOlWcl2YLPR5HCas3nOuIvaTDbv72xq4TxNByO8ks7K',
            model: 'claude-3-5-haiku-20241022'
        },
        {
            name: '第三中转站',
            baseUrl: 'https://api.kkyyxx.xyz',
            apiKey: 'sk-nZMgqcGpdOrSRMZRTmQ4LjU1rTm3LEnPROtTpBltYmmk2WTM',
            model: 'gemini-2.0-flash'
        }
    ];

    for (const config of configs) {
        console.log(`\n=== 测试 ${config.name} ===`);
        console.log(`Base URL: ${config.baseUrl}`);
        console.log(`API Key: ${config.apiKey ? config.apiKey.substring(0, 10) + '...' : 'undefined'}`);
        console.log(`Model: ${config.model}`);

        if (!config.baseUrl || !config.apiKey) {
            console.log('❌ 配置不完整，跳过测试');
            continue;
        }

        try {
            const result = await testSingleAPI(config);
            if (result.success) {
                console.log('✅ 测试成功');
                console.log('翻译结果:', result.translated_text);
            } else {
                console.log('❌ 测试失败:', result.error);
            }
        } catch (error) {
            console.log('❌ 测试异常:', error.message);
        }
    }
}

async function testSingleAPI(config) {
    const { baseUrl, apiKey, model } = config;

    // 构建API URL
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const apiUrl = cleanBaseUrl.endsWith('/v1')
        ? `${cleanBaseUrl}/chat/completions`
        : `${cleanBaseUrl}/v1/chat/completions`;

    // 构建请求数据
    const requestData = {
        model: model,
        messages: [
            {
                role: 'system',
                content: 'You are a professional translator. Translate the following text accurately.'
            },
            {
                role: 'user',
                content: 'Translate this text from English to Chinese: Hello, world!'
            }
        ],
        max_tokens: 1000,
        temperature: 0.1
    };

    // 发送请求
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'AI-Translator-Test/1.0'
        },
        body: JSON.stringify(requestData)
    });

    console.log(`响应状态: ${response.status}`);

    if (!response.ok) {
        const errorText = await response.text();
        console.log('错误响应:', errorText);
        return {
            success: false,
            error: `HTTP ${response.status}: ${errorText}`
        };
    }

    const result = await response.json();
    console.log('API响应:', JSON.stringify(result, null, 2));

    // 提取翻译结果
    let translatedText = '';
    if (result.choices && result.choices[0] && result.choices[0].message) {
        translatedText = result.choices[0].message.content.trim();
    }

    return {
        success: true,
        translated_text: translatedText,
        raw_response: result
    };
}

// 运行测试
testAPI().catch(console.error);
