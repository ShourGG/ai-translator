/**
 * Cloudflare Pages Function for Station Info
 * 获取可用的中转站列表
 */

export async function onRequestGet(context) {
  const { env } = context;

  try {
    // 定义可用的中转站
    const stations = [];

    // 检查主中转站
    if (env.CLAUDE_API_KEY && env.CLAUDE_BASE_URL) {
      stations.push({
        id: 'primary',
        name: '主中转站',
        status: 'active',
        priority: 1,
        endpoint: env.CLAUDE_BASE_URL,
        available: true
      });
    }



    // 如果没有配置任何中转站，返回默认配置
    if (stations.length === 0) {
      stations.push({
        id: 'default',
        name: '默认中转站',
        status: 'unconfigured',
        priority: 1,
        endpoint: 'Not configured',
        available: false,
        message: '请配置环境变量 CLAUDE_API_KEY 和 CLAUDE_BASE_URL'
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        stations: stations,
        total: stations.length,
        active_count: stations.filter(s => s.available).length
      }),
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      }
    );
  } catch (error) {
    console.error('Get stations error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: '获取中转站信息失败'
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
