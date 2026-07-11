#!/usr/bin/env python3
"""
夸克网盘资源提取脚本
从 mysite 和 quark_site 的 markdown 文件中提取标题+夸克链接，
写入 D1 数据库（通过 quarkso.top 的 API）
"""

import os
import re
import sys
import json
import time
import urllib.request
import urllib.error

# ---- 配置 ----
API_BASE = "https://quarkso.top/api/insert"
API_TOKEN = os.environ.get("QUARK_API_TOKEN")
if not API_TOKEN:
    print("错误: 请设置环境变量 QUARK_API_TOKEN")
    print("示例: export QUARK_API_TOKEN='quark_search_insert_2026'")
    sys.exit(1)
HEADERS = {
    "Content-Type": "application/json",
    "X-Auth-Token": API_TOKEN,
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Referer": "https://quarkso.top/",
}

# 路径
MYSITE_DIR = "/Users/lijianxun/Documents/Code/mysite/content/resources"
QUARK_SITE_DIR = "/Users/lijianxun/Documents/Code/quark_site"

# mysite 目录 → 分类映射
CATEGORY_MAP = {
    "ai-tools": "AI工具",
    "anime-resources": "动漫",
    "audio-books": "有声书",
    "audiobooks": "有声书",
    "ebooks": "电子书",
    "game-resources": "游戏",
    "learning-resources": "学习",
    "movie-tv": "影视",
    "side-hustle": "副业",
    "side-hustles": "副业",
}

# quark_site 文件名 → 分类映射
QUARK_CATEGORY_MAP = {
    "movies": "影视",
    "study": "学习",
    "games": "游戏",
    "ebooks": "电子书",
    "others": "其他",
}

# ---- 提取函数 ----

def extract_frontmatter_title(text):
    """从 Hugo frontmatter 提取 title"""
    m = re.search(r'^title:\s*"(.+?)"', text, re.MULTILINE)
    if m:
        return m.group(1).strip()
    m = re.search(r"^title:\s*'(.+?)'", text, re.MULTILINE)
    if m:
        return m.group(1).strip()
    return None

def extract_frontmatter_categories(text):
    """从 Hugo frontmatter 提取 categories"""
    m = re.search(r'^categories:\s*\["(.+?)"\]', text, re.MULTILINE)
    if m:
        cats = m.group(1).split('", "')
        return [c.strip() for c in cats]
    return []

def extract_quark_links(text):
    """提取所有夸克网盘链接"""
    # 匹配各种格式的夸克链接
    links = re.findall(r'https://pan\.quark\.cn/s/[a-zA-Z0-9]+', text)
    return list(set(links))  # 去重

def extract_hugo_resources(filepath):
    """从 Hugo markdown 文件提取资源"""
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    title = extract_frontmatter_title(content)
    categories = extract_frontmatter_categories(content)
    links = extract_quark_links(content)

    if not title or not links:
        return []

    # 从路径推断分类
    rel_path = os.path.relpath(filepath, MYSITE_DIR)
    parts = rel_path.split(os.sep)
    dir_category = None
    if len(parts) >= 2:
        dir_category = CATEGORY_MAP.get(parts[0])

    # 优先用 frontmatter 的分类，其次用目录推断
    category = categories[0] if categories else (dir_category or "其他")

    results = []
    for link in links:
        results.append({
            "title": title,
            "category": category,
            "quark_link": link,
            "source": "mysite",
        })
    return results

def extract_quarksite_resources(filepath):
    """从 quark_site markdown 文件提取资源"""
    filename = os.path.splitext(os.path.basename(filepath))[0]
    category = QUARK_CATEGORY_MAP.get(filename, "其他")

    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    # 找到所有 h3 标题 + 夸克链接对
    # 格式: ### title \n\n 夸克网盘：https://pan.quark.cn/s/xxx
    lines = content.split("\n")
    results = []
    current_title = None

    for line in lines:
        # 匹配 h3 标题
        h3_m = re.match(r'^###\s+(.+)$', line.strip())
        if h3_m:
            current_title = h3_m.group(1).strip()
            continue

        # 匹配夸克链接
        link_m = re.search(r'夸克网盘[：:]\s*(https://pan\.quark\.cn/s/[a-zA-Z0-9]+)', line)
        if link_m and current_title:
            results.append({
                "title": current_title,
                "category": category,
                "quark_link": link_m.group(1),
                "source": "quark_site",
            })
            # 不重置 current_title，因为同一标题可能对应多个链接

    return results

# ---- API 写入 ----

def insert_resource(resource):
    """调用 API 写入一条资源"""
    data = json.dumps(resource).encode("utf-8")
    req = urllib.request.Request(
        API_BASE,
        data=data,
        headers=HEADERS,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            return body.get("code") == 200, body
    except urllib.error.HTTPError as e:
        try:
            err_body = e.read().decode("utf-8")
        except Exception:
            err_body = str(e)
        return False, {"error": err_body}
    except Exception as e:
        return False, {"error": str(e)}

# ---- 主流程 ----

JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "resources_export.json")

def load_existing():
    """加载已有的 JSON 文件，返回已收录的 key 集合"""
    if not os.path.exists(JSON_PATH):
        return set(), []
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    seen = set()
    for r in data:
        seen.add((r["title"], r["quark_link"]))
    print(f"  已有 JSON: {len(data)} 条记录")
    return seen, data

def main():
    # 加载已有记录
    print("=" * 60)
    print("0. 加载已有 JSON 记录...")
    print("=" * 60)
    existing_seen, existing_data = load_existing()

    all_resources = []

    print()
    print("=" * 60)
    print("1. 扫描 mysite 资源...")
    print("=" * 60)

    count_mysite = 0
    for root, dirs, files in os.walk(MYSITE_DIR):
        for fname in files:
            if not fname.endswith(".md"):
                continue
            filepath = os.path.join(root, fname)
            resources = extract_hugo_resources(filepath)
            all_resources.extend(resources)
            count_mysite += len(resources)
            if count_mysite % 200 == 0:
                print(f"  ...已提取 {count_mysite} 条")

    print(f"  共提取 {count_mysite} 条")

    print()
    print("=" * 60)
    print("2. 扫描 quark_site 资源...")
    print("=" * 60)

    count_quark = 0
    for fname in os.listdir(QUARK_SITE_DIR):
        if not fname.endswith(".md") or fname == "_sidebar.md" or fname.startswith("_"):
            continue
        filepath = os.path.join(QUARK_SITE_DIR, fname)
        resources = extract_quarksite_resources(filepath)
        all_resources.extend(resources)
        count_quark += len(resources)

    print(f"  共提取 {count_quark} 条")
    print()
    print(f"  总计: {len(all_resources)} 条")

    # 去重 + 过滤已有
    print()
    print("=" * 60)
    print("3. 去重 & 过滤已有记录...")
    print("=" * 60)
    seen = set(existing_seen)  # 已有的 key
    new_records = []
    dup_count = 0
    exist_count = 0
    for r in all_resources:
        key = (r["title"], r["quark_link"])
        if key in seen:
            exist_count += 1  # 已存在，跳过
            continue
        seen.add(key)
        new_records.append(r)

    dedup_local = len(all_resources) - len(seen)
    print(f"  保留已有: {exist_count} 条")
    print(f"  本次新增: {len(new_records)} 条")

    if not new_records:
        print("  没有新资源，无需写入。")
        # 仍然保存 JSON（可能已有记录没导出过）
        if not existing_data:
            with open(JSON_PATH, "w", encoding="utf-8") as f:
                json.dump(list(seen), f, ensure_ascii=False, indent=2)
        return

    # 写入 D1
    print()
    print("=" * 60)
    print("4. 写入 D1 数据库...")
    print("=" * 60)

    success = 0
    fail = 0
    skip = 0
    batch_size = 50

    for i, resource in enumerate(new_records):
        ok, resp = insert_resource(resource)
        if ok:
            action = resp.get("data", {}).get("action", "")
            if action == "created":
                success += 1
            else:
                skip += 1
        else:
            fail += 1
            if fail <= 3:
                print(f"  [失败] {resource['title'][:30]}... {resp}")

        if (i + 1) % batch_size == 0:
            pct = (i + 1) / len(new_records) * 100
            print(f"  进度: {i+1}/{len(new_records)} ({pct:.0f}%) | 新增={success} 跳过={skip} 失败={fail}")
            time.sleep(0.5)

    print()
    print(f"  D1 写入完成: 新增={success} 跳过(已存在)={skip} 失败={fail}")

    # 保存最新 JSON（合并新旧数据）
    print()
    print("=" * 60)
    print("5. 更新 JSON 记录文件...")
    print("=" * 60)
    merged = existing_data + new_records
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    print(f"  已保存 {len(merged)} 条到 {JSON_PATH}")


if __name__ == "__main__":
    main()
