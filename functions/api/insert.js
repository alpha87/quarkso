// POST /api/insert
// 爬虫写入接口，需要 Token 鉴权
//
// 请求头: X-Auth-Token: 环境变量 INSERT_TOKEN 的值
// 请求体: { title, category, quark_link, cover_url?, description?, source? }

export async function onRequestPost(context) {
  const { request, env } = context

  // Token 校验
  const token = request.headers.get('X-Auth-Token')
  if (!token || token !== env.INSERT_TOKEN) {
    return Response.json({ code: 401, message: '未授权' }, { status: 401 })
  }

  try {
    const body = await request.json()

    if (!body.title || !body.quark_link) {
      return Response.json({ code: 400, message: '缺少必要字段 title 或 quark_link' }, { status: 400 })
    }

    const { title, category = '', cover_url = '', quark_link, description = '', source = '' } = body

    // 检查是否已存在相同标题 + 链接的资源，避免重复
    const existing = await env.DB.prepare(
      'SELECT id FROM resources WHERE title = ? AND quark_link = ?'
    ).bind(title, quark_link).first()

    if (existing) {
      // 已存在则更新时间
      await env.DB.prepare(
        "UPDATE resources SET updated_at = datetime('now', '+8 hours') WHERE id = ?"
      ).bind(existing.id).run()

      return Response.json({ code: 200, data: { id: existing.id, action: 'updated' } })
    }

    // 写入新资源
    const result = await env.DB.prepare(
      "INSERT INTO resources (title, category, cover_url, quark_link, description, source) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(title, category, cover_url, quark_link, description, source).run()

    return Response.json({
      code: 200,
      data: { id: result.meta?.last_row_id, action: 'created' },
    })
  } catch (err) {
    console.error('insert error:', err)
    return Response.json({ code: 500, message: '写入失败' }, { status: 500 })
  }
}
