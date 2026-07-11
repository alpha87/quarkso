// GET /api/categories
// 获取分类列表及数量

export async function onRequestGet(context) {
  const { env } = context

  try {
    const results = await env.DB.prepare(
      'SELECT category, COUNT(*) as count FROM resources GROUP BY category ORDER BY count DESC'
    ).all()

    const total = await env.DB.prepare('SELECT COUNT(*) as total FROM resources').first()

    return Response.json({
      code: 200,
      data: {
        list: results.results || [],
        total: total?.total || 0,
      },
    })
  } catch (err) {
    console.error('categories error:', err)
    return Response.json({ code: 500, message: '获取分类失败' }, { status: 500 })
  }
}
