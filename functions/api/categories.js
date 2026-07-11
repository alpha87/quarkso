// GET /api/categories
// 获取分类列表及总量（单条SQL完成）

export async function onRequestGet(context) {
  const { env } = context

  try {
    const result = await env.DB.prepare(
      `SELECT category, COUNT(*) as count, (SELECT COUNT(*) FROM resources) as total
       FROM resources
       GROUP BY category
       HAVING COUNT(*) >= 30
       ORDER BY count DESC`
    ).all()

    const rows = result.results || []
    const total = rows.length > 0 ? rows[0].total : 0

    return Response.json({
      code: 200,
      data: {
        list: rows.map(r => ({ category: r.category, count: r.count })),
        total: total,
      },
    })
  } catch (err) {
    console.error('categories error:', err)
    return Response.json({ code: 500, message: '获取分类失败' }, { status: 500 })
  }
}
