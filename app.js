/* ========================================
   夸克搜 - 夸克网盘资源搜索工具
   ======================================== */

// ---- 配置 ----
const CONFIG = {
  apiBase: '',
  useMock: false,
}

// ---- Mock 数据 ----
const MOCK_RESOURCES = [
  { id: 1, title: '沧元图 第3季', category: '动漫', description: '', updated_at: '2026-07-10' },
  { id: 2, title: '凡人修仙传 年番', category: '动漫', description: '每周六 11:00更新', updated_at: '2026-07-10' },
  { id: 3, title: '沉默的证人（2019）', category: '电影', description: '张家辉、杨紫主演', updated_at: '2026-07-09' },
  { id: 4, title: '特洛伊 Troy（2004）', category: '电影', description: '', updated_at: '2026-07-09' },
  { id: 5, title: '野狗骨头', category: '剧集', description: '', updated_at: '2026-07-08' },
  { id: 6, title: '仆人王子（2026）', category: '剧集', description: '', updated_at: '2026-07-08' },
  { id: 7, title: '恋恋不忘 [2014]', category: '剧集', description: '', updated_at: '2026-07-07' },
  { id: 8, title: '加油！妈妈（2022）', category: '剧集', description: '', updated_at: '2026-07-07' },
  { id: 9, title: '明珠游龙 [2012]', category: '剧集', description: '', updated_at: '2026-07-06' },
  { id: 10, title: '守骨异兽（2026）', category: '电影', description: '恐怖惊悚', updated_at: '2026-07-06' },
  { id: 11, title: '初智齿（2026）', category: '电影', description: '', updated_at: '2026-07-05' },
  { id: 12, title: '炼气十万年', category: '动漫', description: '每周二、周六10点更新', updated_at: '2026-07-05' },
  { id: 13, title: '万界独尊', category: '动漫', description: '每周二、六10点更1集', updated_at: '2026-07-04' },
  { id: 14, title: '仙武传', category: '动漫', description: 'SVIP每周六10点更新', updated_at: '2026-07-04' },
  { id: 15, title: '仙逆', category: '动漫', description: '每周四更新', updated_at: '2026-07-03' },
  { id: 16, title: '遮天', category: '动漫', description: '每周日更新', updated_at: '2026-07-03' },
  { id: 17, title: '完美世界', category: '动漫', description: '每日更新', updated_at: '2026-07-02' },
  { id: 18, title: '一念永恒', category: '动漫', description: '每周三更新', updated_at: '2026-07-02' },
  { id: 19, title: '斗破苍穹', category: '动漫', description: '每周日更新', updated_at: '2026-07-01' },
  { id: 20, title: '吞噬星空', category: '动漫', description: '每周六更新', updated_at: '2026-07-01' },
]

// ---- API 工具 ----
async function apiFetch(endpoint, options = {}) {
  if (CONFIG.useMock) {
    return mockFetch(endpoint, options)
  }

  try {
    const url = `${CONFIG.apiBase}${endpoint}`
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.error('API 请求失败:', err)
    return mockFetch(endpoint, options)
  }
}

function mockFetch(endpoint, options) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (endpoint === '/api/latest') {
        resolve({ code: 200, data: { list: MOCK_RESOURCES, total: MOCK_RESOURCES.length } })
      } else if (endpoint === '/api/search') {
        const body = options.body ? JSON.parse(options.body) : {}
        const keyword = (body.keyword || '').trim().toLowerCase()
        if (!keyword) {
          resolve({ code: 200, data: { list: [], total: 0 } })
          return
        }
        const filtered = MOCK_RESOURCES.filter(r =>
          r.title.toLowerCase().includes(keyword)
        )
        resolve({ code: 200, data: { list: filtered, total: filtered.length } })
      } else {
        resolve({ code: 200, data: { list: [], total: 0 } })
      }
    }, 300)
  })
}

// ---- 渲染工具 ----

function getCategoryClass(cat) {
  const map = {
    '动漫':   'cat-anime',
    '电影':   'cat-movie',
    '剧集':   'cat-drama',
    '短剧':   'cat-short',
    '小说':   'cat-novel',
    '综艺':   'cat-variety',
    '广播剧': 'cat-radio',
    '纪录片': 'cat-doc',
    '漫画':   'cat-comic',
    '音乐':   'cat-music',
  }
  return map[cat] || ''
}

function renderItem(item) {
  const div = document.createElement('div')
  div.className = 'result-item'
  div.dataset.id = item.id

  const catClass = getCategoryClass(item.category)

  div.innerHTML = `
    <span class="result-category ${catClass}">${item.category || '其他'}</span>
    <div class="result-body">
      <div class="result-title-text">${escapeHtml(item.title)}</div>
      ${item.description ? `<div class="result-desc">${escapeHtml(item.description)}</div>` : ''}
    </div>
    <span class="result-date">${item.updated_at ? item.updated_at.substring(0, 10) : ''}</span>
  `

  div.addEventListener('click', () => {
    window.location.href = `/api/go?id=${item.id}`
  })

  return div
}

function renderList(items, title, count) {
  const listEl = document.getElementById('resultList')
  const titleEl = document.getElementById('resultTitle')
  const countEl = document.getElementById('resultCount')

  titleEl.textContent = title
  countEl.textContent = count ? `(${count})` : ''

  listEl.innerHTML = ''

  if (!items || items.length === 0) {
    document.getElementById('emptyState').style.display = 'block'
    return
  }

  document.getElementById('emptyState').style.display = 'none'

  const fragment = document.createDocumentFragment()
  items.forEach(item => {
    fragment.appendChild(renderItem(item))
  })
  listEl.appendChild(fragment)
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

// ---- 页面状态 ----

let currentCategory = ''

function showLoading(show) {
  document.getElementById('loading').style.display = show ? 'flex' : 'none'
}

/** 加载分类列表 */
async function loadCategories() {
  try {
    const res = await apiFetch('/api/categories')
    const list = res?.data?.list || []
    renderCategories(list)
  } catch (err) {
    console.error('加载分类失败:', err)
  }
}

/** 渲染分类按钮 */
function renderCategories(categories) {
  const listEl = document.getElementById('categoryList')
  let html = `<span class="category-btn${!currentCategory ? ' active' : ''}" data-category="">全部</span>`
  categories.forEach(cat => {
    const active = cat.category === currentCategory ? ' active' : ''
    html += `<span class="category-btn${active}" data-category="${escapeHtml(cat.category)}">${escapeHtml(cat.category)} <span class="category-count">${cat.count}</span></span>`
  })
  listEl.innerHTML = html

  // 绑定点击事件
  listEl.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category
      currentCategory = cat
      // 更新按钮高亮
      listEl.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      // 清空搜索框
      document.getElementById('searchInput').value = ''
      // 按分类加载
      loadLatest()
    })
  })
}

/** 加载最新资源 */
async function loadLatest() {
  showLoading(true)
  document.getElementById('emptyState').style.display = 'none'

  try {
    let url = '/api/latest'
    if (currentCategory) {
      url += `?category=${encodeURIComponent(currentCategory)}`
    }
    const res = await apiFetch(url)
    const list = res?.data?.list || []
    const title = currentCategory || '今日更新'
    renderList(list, title, res?.data?.total || list.length)
  } catch (err) {
    console.error('加载最新资源失败:', err)
    renderList([], currentCategory || '今日更新', 0)
  } finally {
    showLoading(false)
  }
}

async function doSearch(keyword) {
  const trimmed = keyword.trim()
  if (!trimmed) {
    loadLatest()
    return
  }

  // 搜索时取消分类高亮
  currentCategory = ''
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'))
  const allBtn = document.querySelector('.category-btn[data-category=""]')
  if (allBtn) allBtn.classList.add('active')

  showLoading(true)
  document.getElementById('emptyState').style.display = 'none'

  try {
    const res = await apiFetch('/api/search', {
      method: 'POST',
      body: JSON.stringify({ keyword: trimmed }),
    })
    const list = res?.data?.list || []
    renderList(list, `搜索结果`, list.length)

    document.getElementById('resultHeader').scrollIntoView({ behavior: 'smooth', block: 'start' })
  } catch (err) {
    console.error('搜索失败:', err)
    renderList([], '搜索结果', 0)
  } finally {
    showLoading(false)
  }
}

// ---- 事件绑定 ----
function init() {
  const searchInput = document.getElementById('searchInput')
  const searchBtn = document.getElementById('searchBtn')

  function triggerSearch() {
    doSearch(searchInput.value)
  }

  searchBtn.addEventListener('click', triggerSearch)

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      triggerSearch()
    }
  })

  // 广告卡片点击 -> 弹二维码
  document.querySelectorAll('.ad-card[data-qrcode]').forEach(card => {
    card.addEventListener('click', () => {
      const imgName = card.dataset.qrcode
      document.getElementById('modalImg').src = imgName
      document.getElementById('qrcodeModal').style.display = 'flex'
    })
  })

  // 弹窗关闭
  function closeModal() {
    document.getElementById('qrcodeModal').style.display = 'none'
  }

  document.getElementById('modalClose').addEventListener('click', closeModal)
  document.getElementById('qrcodeModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal()
  })

  loadLatest()
  loadCategories()
}

document.addEventListener('DOMContentLoaded', init)
