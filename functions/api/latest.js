// GET /api/latest
// 获取最新收录的资源列表，支持分类筛选

export async function onRequestGet(context) {
  const { request, env } = context

  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('limit') || '20')
    const category = url.searchParams.get('category') || ''
    const offset = (page - 1) * pageSize

    let listQuery, countQuery, params, countParams

    if (category) {
      listQuery = 'SELECT * FROM resources WHERE category = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?'
      countQuery = 'SELECT COUNT(*) as total FROM resources WHERE category = ?'
      params = [category, pageSize, offset]
      countParams = [category]
    } else {
      listQuery = 'SELECT * FROM resources ORDER BY updated_at DESC LIMIT ? OFFSET ?'
      countQuery = 'SELECT COUNT(*) as total FROM resources'
      params = [pageSize, offset]
      countParams = []
    }

    const [listResult, countResult] = await Promise.all([
      env.DB.prepare(listQuery).bind(...params).all(),
      env.DB.prepare(countQuery).bind(...countParams).first(),
    ])

    return Response.json({
      code: 200,
      data: {
        list: listResult.results || [],
        total: countResult?.total || 0,
      },
    })
  } catch (err) {
    console.error('latest error:', err)
    return Response.json({ code: 500, message: '获取失败' }, { status: 500 })
  }
}
