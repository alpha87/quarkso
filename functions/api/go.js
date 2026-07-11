// GET /api/go?id=xxx
// 根据资源 ID 跳转到真实夸克链接（中转保护）

export async function onRequestGet(context) {
  const { request, env } = context

  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return new Response('缺少参数', { status: 400 })
    }

    const row = await env.DB.prepare(
      'SELECT quark_link FROM resources WHERE id = ?'
    ).bind(parseInt(id)).first()

    if (!row || !row.quark_link) {
      return new Response('资源不存在', { status: 404 })
    }

    // 302 跳转到真实夸克链接
    return new Response(null, {
      status: 302,
      headers: { Location: row.quark_link },
    })
  } catch (err) {
    console.error('go error:', err)
    return new Response('跳转失败', { status: 500 })
  }
}
