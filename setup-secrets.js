// 设置Cloudflare Pages环境变量脚本
const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('===========================================');
console.log('AI翻译器 - Cloudflare Pages 环境变量设置');
console.log('===========================================\n');

const secrets = [
  {
    name: 'CLAUDE_API_KEY',
    description: 'Claude API密钥（可选）',
    required: false
  },
  {
    name: 'OPENAI_API_KEY',
    description: 'OpenAI API密钥（可选）',
    required: false
  },
  {
    name: 'GEMINI_API_KEY',
    description: 'Gemini API密钥（可选）',
    required: false
  },
  {
    name: 'SECRET_KEY',
    description: '应用密钥（用于加密）',
    required: true,
    default: generateRandomKey()
  }
];

function generateRandomKey() {
  return Buffer.from(
    Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
  ).toString('base64');
}

async function setSecret(name, value) {
  return new Promise((resolve, reject) => {
    const cmd = `wrangler pages secret put ${name} --project-name ai-translator`;
    const child = exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ 设置 ${name} 失败: ${error.message}`);
        resolve(false);
      } else {
        console.log(`✅ ${name} 已成功设置`);
        resolve(true);
      }
    });

    // 自动输入值
    child.stdin.write(value + '\n');
    child.stdin.end();
  });
}

async function prompt(question, defaultValue = '') {
  return new Promise(resolve => {
    const q = defaultValue
      ? `${question} (默认: ${defaultValue}): `
      : `${question}: `;
    rl.question(q, answer => {
      resolve(answer || defaultValue);
    });
  });
}

async function main() {
  console.log('请输入以下环境变量值（直接回车跳过可选项）：\n');

  const configuredSecrets = {};

  for (const secret of secrets) {
    const value = await prompt(
      `${secret.description} [${secret.name}]`,
      secret.default || ''
    );

    if (value) {
      configuredSecrets[secret.name] = value;
    } else if (secret.required) {
      console.log(`⚠️ ${secret.name} 是必需的，使用默认值`);
      configuredSecrets[secret.name] = secret.default;
    }
  }

  console.log('\n开始设置环境变量...\n');

  for (const [name, value] of Object.entries(configuredSecrets)) {
    await setSecret(name, value);
  }

  console.log('\n===========================================');
  console.log('环境变量设置完成！');
  console.log('===========================================\n');
  console.log('提示：');
  console.log('1. 环境变量将在下次部署后生效');
  console.log('2. 可以使用以下命令查看项目设置：');
  console.log('   wrangler pages project list');
  console.log('3. 重新部署应用：');
  console.log('   npm run deploy');

  rl.close();
}

main().catch(console.error);
