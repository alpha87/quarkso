#!/usr/bin/env python3
"""
将 resources_export.json 中的资源写入 D1 数据库
"""

import json
import time
import urllib.request
import urllib.error

API_BASE = "https://quarkso.top/api/insert"
API_TOKEN = "quark_search_insert_2026"
HEADERS = {
    "Content-Type": "application/json",
    "X-Auth-Token": API_TOKEN,
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Referer": "https://quarkso.top/",
}

JSON_PATH = "/Users/lijianxun/Documents/Code/quark_html/resources_export.json"


def insert_resource(resource):
    data = json.dumps(resource).encode("utf-8")
    req = urllib.request.Request(API_BASE, data=data, headers=HEADERS, method="POST")
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


def main():
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        resources = json.load(f)

    total = len(resources)
    print(f"读取到 {total} 条资源，开始写入 D1...\n")

    success = 0
    skip = 0
    fail = 0
    batch_size = 50

    for i, resource in enumerate(resources):
        # 重试机制
        max_retries = 3
        ok = False
        resp = None
        for attempt in range(max_retries):
            ok, resp = insert_resource(resource)
            if ok:
                break
            if "1010" in str(resp):
                time.sleep(2)  # CF 限流，多等一会儿
            else:
                break
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
            pct = (i + 1) / total * 100
            print(f"  进度: {i+1}/{total} ({pct:.0f}%) | 新增={success} 跳过={skip} 失败={fail}")
            time.sleep(0.5)

    print(f"\n完成! 新增={success} 跳过(已存在)={skip} 失败={fail}")


if __name__ == "__main__":
    main()
