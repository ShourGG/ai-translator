// 老王的ESLint 9.x配置 - 新格式，严格执行代码规范
import js from '@eslint/js';

export default [
  // 基础推荐配置
  js.configs.recommended,

  {
    // 全局配置
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // 浏览器环境
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        AbortSignal: 'readonly',
        // Node.js环境
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        // Cloudflare Workers环境
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        FormData: 'readonly',
        addEventListener: 'readonly'
      }
    },

    rules: {
      // 老王我最讨厌的代码问题
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],
      'no-console': 'warn', // 生产环境别tm留console
      'no-debugger': 'error', // debugger必须删掉
      'no-alert': 'error', // alert这种垃圾别用

      // 代码风格 - 必须统一
      indent: ['error', 2], // 2个空格缩进，不接受反驳
      quotes: ['error', 'single'], // 单引号，双引号看着就烦
      semi: ['error', 'always'], // 分号必须有
      'comma-dangle': ['error', 'never'], // 尾随逗号滚蛋

      // 空格和换行规则
      'no-trailing-spaces': 'error', // 行尾空格必须死
      'eol-last': 'error', // 文件末尾必须换行
      'no-multiple-empty-lines': ['error', { max: 2 }],
      'space-before-blocks': 'error',
      'space-infix-ops': 'error',
      'comma-spacing': ['error', { before: false, after: true }],

      // 函数和变量命名
      camelcase: ['error', { properties: 'never' }],

      // 对象和数组
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'key-spacing': ['error', { beforeColon: false, afterColon: true }],

      // 函数定义
      'arrow-spacing': 'error',
      'no-var': 'error', // var这个垃圾别用了
      'prefer-const': 'error', // 能用const就用const

      // 错误处理
      'no-throw-literal': 'error',

      // 性能相关
      'no-loop-func': 'error',
      'no-new-wrappers': 'error',

      // 安全相关
      'no-eval': 'error', // eval是魔鬼
      'no-implied-eval': 'error',
      'no-new-func': 'error'
    }
  },

  {
    // 忽略文件 - 这些文件别检查了
    ignores: [
      'node_modules/',
      'dist/',
      '*.min.js',
      'coverage/',
      '.vscode/',
      'wrangler.toml',
      '*.json',
      '*.lock'
    ]
  }
];
