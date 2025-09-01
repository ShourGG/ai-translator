// 测试部署的脚本
const https = require('https');

const baseUrl = 'https://19b3017b.ai-translator-97n.pages.dev';

// 测试健康检查端点
function testHealthCheck() {
  return new Promise((resolve, reject) => {
    const url = `${baseUrl}/api/health`;
    console.log(`Testing health check: ${url}`);

    https
      .get(url, res => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            console.log('Health check result:', result);
            resolve(result);
          } catch (error) {
            console.error('Failed to parse health check response:', error);
            reject(error);
          }
        });
      })
      .on('error', error => {
        console.error('Health check request failed:', error);
        reject(error);
      });
  });
}

// 测试翻译端点
function testTranslation() {
  return new Promise((resolve, reject) => {
    const url = `${baseUrl}/api/translate`;
    const postData = JSON.stringify({
      text: 'Hello, world!',
      target_language: 'zh',
      source_language: 'en',
      model: 'gemini-2.0-flash'
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log(`Testing translation: ${url}`);

    const req = https.request(url, options, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('Translation result:', result);
          resolve(result);
        } catch (error) {
          console.error('Failed to parse translation response:', error);
          reject(error);
        }
      });
    });

    req.on('error', error => {
      console.error('Translation request failed:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// 运行测试
async function runTests() {
  console.log('🚀 Testing AI Translator deployment...\n');

  try {
    // 测试健康检查
    console.log('1. Testing health check endpoint...');
    const healthResult = await testHealthCheck();
    console.log('✅ Health check passed\n');

    // 测试翻译功能
    console.log('2. Testing translation endpoint...');
    const translationResult = await testTranslation();

    if (translationResult.success) {
      console.log('✅ Translation test passed');
      console.log('   Original: "Hello, world!"');
      console.log(`   Translated: "${translationResult.translated_text}"`);
    } else {
      console.log('❌ Translation test failed:', translationResult.error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n🎉 Deployment test completed!');
  console.log(`🌐 Your app is available at: ${baseUrl}`);
}

// 运行测试
runTests();
