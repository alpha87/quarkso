// POST /api/search
// 搜索资源，按标题模糊匹配，支持分页

export async function onRequestPost(context) {
  const { request, env } = context

  try {
    const { keyword, category, page = 1 } = await request.json()
    const pageSize = 20
    const offset = (page - 1) * pageSize

    if (!keyword || !keyword.trim()) {
      return Response.json({ code: 200, data: { list: [], total: 0 } })
    }

    const kw = `%${keyword.trim()}%`

    let sql, countSql, params, countParams

    if (category) {
      sql = `SELECT * FROM resources WHERE title LIKE ? AND category = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?`
      countSql = `SELECT COUNT(*) as total FROM resources WHERE title LIKE ? AND category = ?`
      params = [kw, category, pageSize, offset]
      countParams = [kw, category]
    } else {
      sql = `SELECT * FROM resources WHERE title LIKE ? ORDER BY updated_at DESC LIMIT ? OFFSET ?`
      countSql = `SELECT COUNT(*) as total FROM resources WHERE title LIKE ?`
      params = [kw, pageSize, offset]
      countParams = [kw]
    }

    const [listResult, countResult] = await Promise.all([
      env.DB.prepare(sql).bind(...params).all(),
      env.DB.prepare(countSql).bind(...countParams).first(),
    ])

    return Response.json({
      code: 200,
      data: {
        list: listResult.results || [],
        total: countResult?.total || 0,
      },
    })
  } catch (err) {
    console.error('search error:', err)
    return Response.json({ code: 500, message: '搜索失败' }, { status: 500 })
  }
}
