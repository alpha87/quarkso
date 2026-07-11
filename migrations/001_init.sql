-- TV搜 - 夸克网盘资源搜索 D1 数据库建表

CREATE TABLE IF NOT EXISTS resources (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,            -- 资源标题
  category    TEXT DEFAULT '',           -- 分类（动漫/电影/剧集/小说...）
  cover_url   TEXT DEFAULT '',           -- 封面图 URL（预留）
  quark_link  TEXT NOT NULL,             -- 夸克网盘分享链接
  description TEXT DEFAULT '',           -- 描述/备注
  source      TEXT DEFAULT '',           -- 来源标记
  created_at  TEXT DEFAULT (datetime('now', '+8 hours')),
  updated_at  TEXT DEFAULT (datetime('now', '+8 hours'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_category ON resources(category);
CREATE INDEX IF NOT EXISTS idx_updated ON resources(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_title ON resources(title);
