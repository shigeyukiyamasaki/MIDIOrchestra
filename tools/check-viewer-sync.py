#!/usr/bin/env python3
"""index.html と viewer.html の input/select 要素を比較し、差分を報告する。"""

import os
import re
import sys
from html.parser import HTMLParser

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)

COMPARE_ATTRS = ["type", "min", "max", "step", "value"]


class InputCollector(HTMLParser):
    """HTML から id 付き input/select 要素とその属性を収集する。"""

    def __init__(self):
        super().__init__()
        self.elements = {}  # id -> {tag, attrs dict}
        self._in_select = None  # 現在パース中の select の id
        self._select_options = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)

        if tag in ("input", "select") and "id" in attrs_dict:
            elem_id = attrs_dict["id"]
            self.elements[elem_id] = {"tag": tag, "attrs": attrs_dict}
            if tag == "select":
                self._in_select = elem_id
                self._select_options = []

        if tag == "option" and self._in_select is not None:
            value = attrs_dict.get("value", "")
            self._select_options.append(value)

    def handle_endtag(self, tag):
        if tag == "select" and self._in_select is not None:
            self.elements[self._in_select]["options"] = self._select_options
            self._in_select = None


def collect(filepath):
    with open(filepath, encoding="utf-8") as f:
        html = f.read()
    collector = InputCollector()
    collector.feed(html)
    return collector.elements


def main():
    editor_path = os.path.join(PROJECT_DIR, "index.html")
    viewer_path = os.path.join(PROJECT_DIR, "viewer.html")

    if not os.path.exists(editor_path) or not os.path.exists(viewer_path):
        print("ERROR: index.html or viewer.html not found in", PROJECT_DIR)
        sys.exit(1)

    editor = collect(editor_path)
    viewer = collect(viewer_path)

    missing = []
    mismatches = []
    ok_count = 0

    for elem_id, e_info in sorted(editor.items()):
        if elem_id not in viewer:
            missing.append(elem_id)
            continue

        v_info = viewer[elem_id]
        diffs = []

        for attr in COMPARE_ATTRS:
            e_val = e_info["attrs"].get(attr)
            v_val = v_info["attrs"].get(attr)
            if e_val != v_val:
                diffs.append(f"  {attr}: editor=\"{e_val}\" vs viewer=\"{v_val}\"")

        # select の options 比較
        if e_info["tag"] == "select":
            e_opts = e_info.get("options", [])
            v_opts = v_info.get("options", [])
            if e_opts != v_opts:
                diffs.append(f"  options: editor={e_opts} vs viewer={v_opts}")

        if diffs:
            mismatches.append((elem_id, diffs))
        else:
            ok_count += 1

    # viewer にだけある要素（参考）
    viewer_only = [eid for eid in sorted(viewer) if eid not in editor]

    # --- 出力 ---
    has_issues = missing or mismatches

    if missing:
        print(f"\n\033[31m[MISSING] viewer.html に存在しない要素 ({len(missing)}件)\033[0m")
        for eid in missing:
            print(f"  - {eid}")

    if mismatches:
        print(f"\n\033[33m[MISMATCH] 属性が異なる要素 ({len(mismatches)}件)\033[0m")
        for eid, diffs in mismatches:
            print(f"  {eid}:")
            for d in diffs:
                print(f"    {d}")

    if viewer_only:
        print(f"\n\033[36m[INFO] viewer.html にのみ存在 ({len(viewer_only)}件)\033[0m")
        for eid in viewer_only:
            print(f"  - {eid}")

    print(f"\n[OK] {ok_count} elements matched")

    if has_issues:
        print(f"\n=> {len(missing)} missing, {len(mismatches)} mismatched")
        sys.exit(1)
    else:
        print("\n=> All clear!")
        sys.exit(0)


if __name__ == "__main__":
    main()
