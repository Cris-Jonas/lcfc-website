#!/usr/bin/env python3
# ================================================================
#  从《莱斯特城球员名单》xlsx 生成 data/roster.json（批量导入用）
#  用法:
#    python3 scripts/xlsx-to-roster.py                          # 默认读桌面名单，写 data/roster.json
#    python3 scripts/xlsx-to-roster.py 输入.xlsx 输出.json
#
#  列映射（按源表头）:
#    号码 | 中文名 | 中文姓 | 英文名 | 英文姓 | 显示中文名（默认中文姓）|
#    第一国籍 | 第二国籍 | 位置 | 外租 | 外租球队 | 归队时间
#
#  显示名规则（对应表内列名“显示中文名（默认中文姓）”）:
#    - 优先用“显示中文名”列的值
#    - 该列为空时，回退到“中文姓”
# ================================================================
import openpyxl
import json
import datetime
import sys
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_XLSX = "/Users/crisjonasmac/Documents/莱斯特城球员名单xlsx.xlsx"
DEFAULT_OUT = os.path.join(SCRIPT_DIR, "..", "data", "roster.json")

XLSX = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_XLSX
OUT = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUT

# 中文国籍 -> flag-icon 代码（ISO 3166-1 alpha-2；英国构成国用 gb-*）
NAT = {
    '丹麦': 'DK', '刚果民主共和国': 'CD', '威尔士': 'gb-wls', '尼日利亚': 'NG',
    '意大利': 'IT', '法国': 'FR', '波兰': 'PL', '波黑': 'BA', '澳大利亚': 'AU',
    '爱尔兰': 'IE', '牙买加': 'JM', '美国': 'US', '芬兰': 'FI', '苏格兰': 'gb-sct',
    '英格兰': 'gb-eng', '葡萄牙': 'PT', '阿根廷': 'AR', '马里': 'ML',
    '中国': 'CN', '西班牙': 'ES', '德国': 'DE', '巴西': 'BR', '比利时': 'BE',
    '克罗地亚': 'HR', '荷兰': 'NL', '瑞典': 'SE', '挪威': 'NO', '日本': 'JP',
    '韩国': 'KR', '土耳其': 'TR', '摩洛哥': 'MA', '塞内加尔': 'SN', '加纳': 'GH',
    '喀麦隆': 'CM', '埃及': 'EG', '南非': 'ZA', '瑞士': 'CH', '奥地利': 'AT',
    '捷克': 'CZ', '罗马尼亚': 'RO', '乌克兰': 'UA', '塞尔维亚': 'RS', '斯洛文尼亚': 'SI',
    '斯洛伐克': 'SK', '匈牙利': 'HU', '希腊': 'GR', '墨西哥': 'MX', '哥伦比亚': 'CO',
    '智利': 'CL', '乌拉圭': 'UY', '秘鲁': 'PE', '厄瓜多尔': 'EC', '委内瑞拉': 'VE',
    '巴拉圭': 'PY', '哥斯达黎加': 'CR', '加拿大': 'CA',
}


def code(nat):
    if nat in (None, ""):
        return None
    nat = str(nat).strip()
    if nat in NAT:
        return NAT[nat]
    print(f"  ⚠️ 未收录国籍，保留原值: {nat}")
    return nat


def main():
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    ws = wb["Sheet1"]
    rows = list(ws.iter_rows(min_row=2, values_only=True))

    out, warns, seen = [], [], set()
    for r in rows:
        (number, cn_first, cn_last, en_first, en_last, disp_override,
         nat1, nat2, pos, loan, loan_to, ret) = r
        num = int(number) if number not in (None, "") else None
        if num is not None:
            if num in seen:
                warns.append(f"⚠️ 号码重复: #{num}")
            seen.add(num)
        # 显示名：优先“显示中文名”，否则回退“中文姓”
        displayName = disp_override if disp_override not in (None, "") else (cn_last or "")
        nats = [c for c in (code(nat1), code(nat2)) if c]
        is_loan = str(loan).strip() == "是"
        rec = {
            "number": num,
            "enFirst": en_first or "",
            "enLast": en_last or "",
            "displayName": displayName,
            "nationality": nats,
            "position": pos or "",
            "team": "loan" if is_loan else "first",
            "avatar": "",
        }
        if is_loan:
            rec["onLoanTo"] = loan_to or ""
            rec["onLoanUntil"] = (ret.strftime("%Y-%m-%d")
                                  if isinstance(ret, datetime.datetime) else (str(ret) if ret else ""))
        out.append(rec)

    out.sort(key=lambda x: (x["number"] is None, x["number"] if x["number"] is not None else 999))
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"✅ 生成 {len(out)} 名球员 -> {OUT}")
    print("  外租:", sum(1 for r in out if r['team'] == 'loan'))
    print("  无号码(外租):", [r['displayName'] for r in out if r['number'] is None])
    if warns:
        print("提示:", *warns, sep="\n  ")


if __name__ == "__main__":
    main()
