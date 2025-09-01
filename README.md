# AI智能翻译器

🌍 基于OpenAI GPT技术的多语言智能翻译Web应用

## 🔧 开发环境配置（老王暴躁技术流）

### ✅ VS Code 规则配置已完成！

老王我已经给你整了一套完整的开发环境配置，包括：

#### 📁 VS Code 配置文件
- `.vscode/settings.json` - 工作区设置（格式化、编码、自动保存等）
- `.vscode/extensions.json` - 推荐扩展列表
- `.vscode/launch.json` - 调试配置

#### 🔍 代码质量工具
- `eslint.config.js` - ESLint 9.x 配置（严格的代码检查规则）
- `.prettierrc` - Prettier 格式化配置
- `.prettierignore` - Prettier 忽略文件

#### 📦 NPM 脚本命令
```bash
# 代码检查和格式化
npm run lint          # 检查代码问题
npm run lint:fix       # 自动修复可修复的问题
npm run format         # 格式化所有代码
npm run format:check   # 检查格式化状态
npm run code:check     # 同时检查代码质量和格式
npm run code:fix       # 同时修复代码问题和格式化

# 项目开发
npm run dev           # 本地开发服务器
npm run deploy        # 部署到生产环境
```

#### 🚀 使用方法
1. **安装推荐扩展**：VS Code 会自动提示安装推荐的扩展
2. **自动格式化**：保存文件时自动格式化和修复代码问题
3. **代码检查**：实时显示代码问题和警告
4. **调试支持**：F5 启动调试，支持 Node.js 和浏览器调试

#### ⚠️ 当前代码状态
- ✅ ESLint 和 Prettier 配置完成
- ✅ 自动格式化已应用
- ⚠️ 还有一些需要手动修复的问题：
  - 未使用的变量（需要加 `_` 前缀）
  - 驼峰命名问题（API 参数命名）
  - 缩进冲突（需要统一配置）

#### 🛠️ 下一步建议
1. 运行 `npm run code:fix` 自动修复问题
2. 手动修复剩余的命名和变量问题
3. 配置 Git hooks 确保提交前代码质量

---

## 📋 项目简介

AI智能翻译器是一个基于先进人工智能技术的多语言翻译工具，使用OpenAI GPT API提供高质量的文本翻译服务。该应用具有用户友好的Web界面，支持12种主要语言之间的互译。

## ✨ 主要功能

- 🤖 **AI智能翻译**: 基于OpenAI GPT-3.5技术，提供高质量翻译
- 🌐 **多语言支持**: 支持中文、英语、日语、韩语、法语、德语、西班牙语、意大利语、葡萄牙语、俄语、阿拉伯语、印地语
- 🔄 **实时翻译**: 快速响应，实时获取翻译结果
- 🎯 **语言检测**: 自动检测输入文本的语言
- 📱 **响应式设计**: 支持桌面和移动设备
- 🔧 **易于使用**: 简洁直观的用户界面

## 🛠️ 技术栈

- **后端**: Python + Flask
- **前端**: HTML5 + CSS3 + JavaScript + Bootstrap 5
- **AI服务**: OpenAI GPT API
- **依赖管理**: pip + requirements.txt

## 📦 安装指南

### 环境要求

- Python 3.7+
- OpenAI API密钥

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <项目地址>
   cd AI翻译器
   ```

2. **创建虚拟环境**
   ```bash
   python -m venv venv

   # Windows
   venv\Scripts\activate

   # macOS/Linux
   source venv/bin/activate
   ```

3. **安装依赖**
   ```bash
   pip install -r requirements.txt
   ```

4. **配置环境变量**
   ```bash
   # 复制环境变量模板
   copy .env.example .env

   # 编辑 .env 文件，设置您的OpenAI API密钥
   OPENAI_API_KEY=your_openai_api_key_here
   ```

5. **启动应用**
   ```bash
   python app.py
   ```

6. **访问应用**

   打开浏览器访问: http://127.0.0.1:5000

## 🔧 配置说明

### 环境变量配置

在 `.env` 文件中配置以下参数：

```env
# OpenAI API配置
OPENAI_API_KEY=your_openai_api_key_here

# Flask应用配置
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your_secret_key_here

# 应用设置
APP_HOST=127.0.0.1
APP_PORT=5000
```

### 获取OpenAI API密钥

1. 访问 [OpenAI官网](https://platform.openai.com/)
2. 注册并登录账户
3. 进入API Keys页面
4. 创建新的API密钥
5. 将密钥复制到 `.env` 文件中

## 📖 使用说明

### 基本翻译

1. 选择源语言和目标语言
2. 在左侧文本框输入要翻译的内容
3. 点击"开始翻译"按钮
4. 翻译结果将显示在右侧文本框

### 高级功能

- **语言检测**: 点击"检测语言"按钮自动识别输入文本的语言
- **语言交换**: 点击中间的交换按钮快速交换源语言和目标语言
- **复制结果**: 点击"复制译文"按钮将翻译结果复制到剪贴板
- **快捷键**: 使用 Ctrl+Enter 快速执行翻译

## 📁 项目结构

```
AI翻译器/
├── app/                    # 应用主目录
│   ├── __init__.py        # 应用初始化
│   ├── routes.py          # 路由定义
│   ├── translator.py      # 翻译服务
│   ├── templates/         # HTML模板
│   │   ├── base.html      # 基础模板
│   │   ├── index.html     # 主页模板
│   │   ├── 404.html       # 404错误页面
│   │   └── 500.html       # 500错误页面
│   └── static/            # 静态文件
│       ├── css/           # 样式文件
│       │   └── style.css  # 主样式文件
│       └── js/            # JavaScript文件
│           ├── main.js    # 主要功能
│           └── translator.js # 翻译功能
├── config.py              # 配置文件
├── app.py                 # 应用启动文件
├── requirements.txt       # 依赖列表
├── .env.example          # 环境变量模板
├── .gitignore            # Git忽略文件
└── README.md             # 项目说明
```

## 🚀 部署指南

### 本地部署

按照安装指南即可在本地运行

### 生产环境部署

1. **设置生产环境变量**
   ```env
   FLASK_ENV=production
   FLASK_DEBUG=False
   SECRET_KEY=your_production_secret_key
   ```

2. **使用WSGI服务器**
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

## 🔍 故障排除

### 常见问题

1. **API密钥错误**
   - 检查 `.env` 文件中的API密钥是否正确
   - 确认API密钥有足够的使用额度

2. **网络连接问题**
   - 检查网络连接是否正常
   - 确认防火墙设置允许访问OpenAI API

3. **依赖安装失败**
   - 确认Python版本符合要求
   - 尝试升级pip: `pip install --upgrade pip`

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进项目！

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交Issue
- 发送邮件

---

⭐ 如果这个项目对您有帮助，请给它一个星标！
