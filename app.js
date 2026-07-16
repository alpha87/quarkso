/* ========================================
   夸克搜 - 夸克网盘资源搜索工具
   ======================================== */

// ---- API 工具 ----
async function apiFetch(endpoint, options = {}) {
  const url = `${endpoint}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
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
    showDisclaimerModal(item.id)
  })

  return div
}

// ---- 资源跳转免责提示 ----
let disclaimerTimer = null
let disclaimerCountdown = null

function showDisclaimerModal(resourceId) {
  const modal = document.getElementById('disclaimerModal')
  const countdownEl = document.getElementById('disclaimerCountdown')
  if (!modal || !countdownEl) {
    window.location.href = `/api/go?id=${resourceId}`
    return
  }

  // 清除上一次倒计时
  if (disclaimerTimer) clearTimeout(disclaimerTimer)
  if (disclaimerCountdown) clearInterval(disclaimerCountdown)

  let seconds = 3
  countdownEl.textContent = `${seconds} 秒后自动跳转`
  modal.style.display = 'flex'
  modal.dataset.resourceId = String(resourceId)

  disclaimerCountdown = setInterval(() => {
    seconds -= 1
    if (seconds > 0) {
      countdownEl.textContent = `${seconds} 秒后自动跳转`
    } else {
      countdownEl.textContent = '正在跳转...'
    }
  }, 1000)

  disclaimerTimer = setTimeout(() => {
    clearInterval(disclaimerCountdown)
    disclaimerCountdown = null
    disclaimerTimer = null
    window.location.href = `/api/go?id=${resourceId}`
  }, 3000)
}

function closeDisclaimerModal() {
  const modal = document.getElementById('disclaimerModal')
  if (disclaimerTimer) {
    clearTimeout(disclaimerTimer)
    disclaimerTimer = null
  }
  if (disclaimerCountdown) {
    clearInterval(disclaimerCountdown)
    disclaimerCountdown = null
  }
  if (modal) {
    modal.style.display = 'none'
    delete modal.dataset.resourceId
  }
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

  listEl.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category
      currentCategory = cat
      listEl.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      document.getElementById('searchInput').value = ''
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
    const title = currentCategory || '最近更新'
    renderList(list, title, res?.data?.total || list.length)
  } catch (err) {
    console.error('加载最新资源失败:', err)
    renderList([], currentCategory || '最近更新', 0)
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

  document.querySelectorAll('.ad-card[data-qrcode]').forEach(card => {
    card.addEventListener('click', () => {
      const imgName = card.dataset.qrcode
      document.getElementById('modalImg').src = imgName
      document.getElementById('qrcodeModal').style.display = 'flex'
    })
  })

  function closeModal() {
    document.getElementById('qrcodeModal').style.display = 'none'
  }

  document.getElementById('modalClose').addEventListener('click', closeModal)
  document.getElementById('qrcodeModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal()
  })

  // 免责弹窗关闭（点击关闭或遮罩可取消跳转）
  const disclaimerClose = document.getElementById('disclaimerClose')
  const disclaimerModal = document.getElementById('disclaimerModal')
  if (disclaimerClose) disclaimerClose.addEventListener('click', closeDisclaimerModal)
  if (disclaimerModal) {
    disclaimerModal.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeDisclaimerModal()
    })
  }

  // 并行加载最新资源和分类
  Promise.all([loadLatest(), loadCategories()])
}

document.addEventListener('DOMContentLoaded', init)
