/**
 * 管理员控制API - 控制中转站切换权限
 * 老王专用管理系统
 */

// 管理员配置状态（内存存储，重启后重置为默认值）
// 🔧 老王修复：环境变量优先，实现永久禁用
let adminConfig = {
  allowStationSwitch: true,  // 默认允许切换中转站
  allowModelSwitch: true,    // 默认允许切换AI模型
  forcedModel: null,         // 老王新增：强制指定的模型，null表示不强制
  lastUpdated: new Date().toISOString(),
  updatedBy: 'system'
};

/**
 * 从KV存储读取配置
 * 老王专用永久存储逻辑
 */
async function getConfigFromKV(env) {
  try {
    if (!env.ADMIN_CONFIG_KV) {
      console.log('⚠️ KV存储未配置，使用默认配置');
      return null;
    }

    const stationSwitch = await env.ADMIN_CONFIG_KV.get('admin_config:allow_station_switch');
    const modelSwitch = await env.ADMIN_CONFIG_KV.get('admin_config:allow_model_switch');
    const forcedModel = await env.ADMIN_CONFIG_KV.get('admin_config:forced_model'); // 老王新增
    const lastUpdated = await env.ADMIN_CONFIG_KV.get('admin_config:last_updated');
    const updatedBy = await env.ADMIN_CONFIG_KV.get('admin_config:updated_by');

    const kvConfig = {};
    if (stationSwitch !== null) {
      kvConfig.allowStationSwitch = stationSwitch === 'true';
    }
    if (modelSwitch !== null) {
      kvConfig.allowModelSwitch = modelSwitch === 'true';
    }
    if (forcedModel !== null) {
      kvConfig.forcedModel = forcedModel; // 老王新增：强制模型配置
    }
    if (lastUpdated) {
      kvConfig.lastUpdated = lastUpdated;
    }
    if (updatedBy) {
      kvConfig.updatedBy = updatedBy;
    }

    console.log('📦 从KV存储读取配置:', kvConfig);
    return kvConfig;
  } catch (error) {
    console.error('❌ KV存储读取失败:', error);
    return null;
  }
}

/**
 * 保存配置到KV存储
 * 老王专用永久存储逻辑
 */
async function saveConfigToKV(env, config) {
  try {
    if (!env.ADMIN_CONFIG_KV) {
      console.log('⚠️ KV存储未配置，无法保存');
      return false;
    }

    await env.ADMIN_CONFIG_KV.put('admin_config:allow_station_switch', config.allowStationSwitch.toString());
    await env.ADMIN_CONFIG_KV.put('admin_config:allow_model_switch', config.allowModelSwitch.toString());
    await env.ADMIN_CONFIG_KV.put('admin_config:forced_model', config.forcedModel || ''); // 老王新增
    await env.ADMIN_CONFIG_KV.put('admin_config:last_updated', config.lastUpdated);
    await env.ADMIN_CONFIG_KV.put('admin_config:updated_by', config.updatedBy);

    console.log('💾 配置已保存到KV存储:', config);
    return true;
  } catch (error) {
    console.error('❌ KV存储保存失败:', error);
    return false;
  }
}

/**
 * 获取最终配置（KV存储优先）
 * 老王专用永久存储逻辑
 */
async function getFinalConfig(env) {
  // 🔧 优先级：KV存储 > 环境变量 > 内存配置 > 默认值
  const kvConfig = await getConfigFromKV(env);

  const finalConfig = {
    allowStationSwitch: true,  // 默认允许
    allowModelSwitch: true,    // 默认允许
    forcedModel: null,         // 老王新增：默认不强制模型
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system'
  };

  // 1. 应用内存配置
  if (adminConfig.allowStationSwitch !== undefined) {
    finalConfig.allowStationSwitch = adminConfig.allowStationSwitch;
  }
  if (adminConfig.allowModelSwitch !== undefined) {
    finalConfig.allowModelSwitch = adminConfig.allowModelSwitch;
  }
  if (adminConfig.lastUpdated) {
    finalConfig.lastUpdated = adminConfig.lastUpdated;
  }
  if (adminConfig.updatedBy) {
    finalConfig.updatedBy = adminConfig.updatedBy;
  }
  if (adminConfig.forcedModel !== undefined) {
    finalConfig.forcedModel = adminConfig.forcedModel; // 老王新增
  }

  // 2. 应用环境变量（向后兼容）
  const envAllowStationSwitch = env?.ALLOW_STATION_SWITCH;
  const envAllowModelSwitch = env?.ALLOW_MODEL_SWITCH;

  if (envAllowStationSwitch !== undefined) {
    finalConfig.allowStationSwitch = envAllowStationSwitch === 'true';
    console.log(`🔒 环境变量控制中转站切换: ${finalConfig.allowStationSwitch}`);
  }

  if (envAllowModelSwitch !== undefined) {
    finalConfig.allowModelSwitch = envAllowModelSwitch === 'true';
    console.log(`🔒 环境变量控制模型切换: ${finalConfig.allowModelSwitch}`);
  }

  // 3. 应用KV存储配置（最高优先级）
  if (kvConfig) {
    if (kvConfig.allowStationSwitch !== undefined) {
      finalConfig.allowStationSwitch = kvConfig.allowStationSwitch;
      console.log(`💾 KV存储控制中转站切换: ${finalConfig.allowStationSwitch}`);
    }
    if (kvConfig.allowModelSwitch !== undefined) {
      finalConfig.allowModelSwitch = kvConfig.allowModelSwitch;
      console.log(`💾 KV存储控制模型切换: ${finalConfig.allowModelSwitch}`);
    }
    if (kvConfig.lastUpdated) {
      finalConfig.lastUpdated = kvConfig.lastUpdated;
    }
    if (kvConfig.updatedBy) {
      finalConfig.updatedBy = kvConfig.updatedBy;
    }
    if (kvConfig.forcedModel !== undefined) {
      finalConfig.forcedModel = kvConfig.forcedModel; // 老王新增
    }
  }

  return finalConfig;
}

/**
 * 验证管理员密码
 */
function verifyAdminPassword(password, env) {
  // 从环境变量获取管理员密码，默认为 'laowang123'
  const adminPassword = env?.ADMIN_PASSWORD || 'laowang123';
  return password === adminPassword;
}

/**
 * 获取当前配置状态
 */
export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    // 获取配置状态（无需密码）
    if (action === 'status') {
      // 🔧 老王修复：使用KV存储优先的最终配置
      const finalConfig = await getFinalConfig(env);
      return new Response(JSON.stringify({
        success: true,
        config: {
          allowStationSwitch: finalConfig.allowStationSwitch,
          allowModelSwitch: finalConfig.allowModelSwitch,
          forcedModel: finalConfig.forcedModel, // 老王新增：返回强制模型配置
          lastUpdated: finalConfig.lastUpdated,
          // 🔧 添加存储状态信息
          storageInfo: {
            kvAvailable: !!env.ADMIN_CONFIG_KV,
            envControlled: {
              stationSwitch: env?.ALLOW_STATION_SWITCH !== undefined,
              modelSwitch: env?.ALLOW_MODEL_SWITCH !== undefined
            }
          }
        }
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 获取完整管理信息（需要密码）
    const password = url.searchParams.get('password');
    if (!password || !verifyAdminPassword(password, env)) {
      return new Response(JSON.stringify({
        success: false,
        error: '管理员密码错误'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 🔧 老王修复：返回KV存储优先的最终配置
    const finalConfig = await getFinalConfig(env);
    return new Response(JSON.stringify({
      success: true,
      config: finalConfig,
      message: '管理员权限验证成功',
      // 🔧 添加存储控制信息
      storageControl: {
        kvStorage: !!env.ADMIN_CONFIG_KV,
        environmentVariables: {
          ALLOW_STATION_SWITCH: env?.ALLOW_STATION_SWITCH,
          ALLOW_MODEL_SWITCH: env?.ALLOW_MODEL_SWITCH
        },
        note: 'KV存储优先级最高，实现永久动态控制'
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('管理员API错误:', error);
    return new Response(JSON.stringify({
      success: false,
      error: '服务器内部错误'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 更新配置
 */
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const data = await request.json();

    // 验证管理员密码
    if (!data.password || !verifyAdminPassword(data.password, env)) {
      return new Response(JSON.stringify({
        success: false,
        error: '管理员密码错误'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 🔧 老王修复：检查环境变量控制
    let updated = false;
    let messages = [];
    let warnings = [];

    // 检查环境变量是否已经控制了配置
    if (env?.ALLOW_STATION_SWITCH !== undefined) {
      warnings.push('⚠️ 中转站切换由环境变量 ALLOW_STATION_SWITCH 永久控制');
    }
    if (env?.ALLOW_MODEL_SWITCH !== undefined) {
      warnings.push('⚠️ 模型切换由环境变量 ALLOW_MODEL_SWITCH 永久控制');
    }

    // 更新内存配置（但环境变量优先）
    if (typeof data.allowStationSwitch === 'boolean') {
      const oldValue = adminConfig.allowStationSwitch;
      adminConfig.allowStationSwitch = data.allowStationSwitch;
      console.log(`🔧 管理员配置更新: 中转站切换 ${oldValue} -> ${data.allowStationSwitch}`);

      if (env?.ALLOW_STATION_SWITCH !== undefined) {
        messages.push(`中转站切换内存配置已更新，但环境变量优先生效`);
      } else {
        messages.push(`中转站切换已${data.allowStationSwitch ? '开启' : '关闭'}`);
      }
      updated = true;
    }

    if (typeof data.allowModelSwitch === 'boolean') {
      const oldValue = adminConfig.allowModelSwitch;
      adminConfig.allowModelSwitch = data.allowModelSwitch;
      console.log(`🔧 管理员配置更新: 模型切换 ${oldValue} -> ${data.allowModelSwitch}`);

      if (env?.ALLOW_MODEL_SWITCH !== undefined) {
        messages.push(`AI模型切换内存配置已更新，但环境变量优先生效`);
      } else {
        messages.push(`AI模型切换已${data.allowModelSwitch ? '开启' : '关闭'}`);
      }
      updated = true;
    }

    // 老王新增：处理强制模型配置
    if (data.forcedModel !== undefined) {
      const oldValue = adminConfig.forcedModel;
      adminConfig.forcedModel = data.forcedModel || null;
      console.log(`🔧 管理员配置更新: 强制模型 ${oldValue} -> ${data.forcedModel}`);

      if (data.forcedModel) {
        messages.push(`已强制指定模型: ${data.forcedModel}`);
      } else {
        messages.push(`已取消强制模型限制`);
      }
      updated = true;
    }

    if (updated) {
      adminConfig.lastUpdated = new Date().toISOString();
      adminConfig.updatedBy = data.adminName || 'admin';
      console.log(`🔧 更新者: ${adminConfig.updatedBy}`);

      // 🔧 老王修复：保存到KV存储实现永久存储
      const saveSuccess = await saveConfigToKV(env, adminConfig);
      if (saveSuccess) {
        messages.push('配置已永久保存');
      } else {
        warnings.push('⚠️ KV存储保存失败，配置仅在当前会话有效');
      }

      // 🔧 老王修复：返回最终生效的配置
      const finalConfig = await getFinalConfig(env);
      return new Response(JSON.stringify({
        success: true,
        config: finalConfig,
        message: messages.join('，'),
        warnings: warnings.length > 0 ? warnings : undefined,
        // 🔧 显示存储控制状态
        storageControl: {
          kvSaved: saveSuccess,
          kvStorage: !!env.ADMIN_CONFIG_KV,
          environmentVariables: {
            ALLOW_STATION_SWITCH: env?.ALLOW_STATION_SWITCH,
            ALLOW_MODEL_SWITCH: env?.ALLOW_MODEL_SWITCH
          },
          note: 'KV存储实现永久动态控制，重启后仍然有效'
        }
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: '无效的配置参数'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('管理员配置更新错误:', error);
    return new Response(JSON.stringify({
      success: false,
      error: '服务器内部错误'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 重置配置到默认状态
 */
export async function onRequestDelete(context) {
  try {
    const { request, env } = context;
    const data = await request.json();

    // 验证管理员密码
    if (!data.password || !verifyAdminPassword(data.password, env)) {
      return new Response(JSON.stringify({
        success: false,
        error: '管理员密码错误'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 重置到默认配置
    adminConfig = {
      allowStationSwitch: true,
      allowModelSwitch: true,
      forcedModel: null, // 老王新增：重置时清除强制模型
      lastUpdated: new Date().toISOString(),
      updatedBy: data.adminName || 'admin'
    };

    console.log(`🔄 管理员配置重置为默认值`);
    console.log(`🔧 重置者: ${adminConfig.updatedBy}`);

    return new Response(JSON.stringify({
      success: true,
      config: adminConfig,
      message: '配置已重置为默认值'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('管理员配置重置错误:', error);
    return new Response(JSON.stringify({
      success: false,
      error: '服务器内部错误'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 处理CORS预检请求
 */
export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}
