#!/usr/bin/env python3
"""
OMC 结果聚合器 — 收集并行 Agent 输出并生成统一报告

读取 .omc/outputs/task_{id}.json，合并生成汇总报告。
解决并行执行后的三个问题：
  1. 无结果聚合    → 自动收集所有 Task 输出
  2. 格式不一致    → 严格按 agent-output.schema.yaml 校验
  3. Token 浪费    → 生成精简摘要，不入主上下文

用法:
  python .omc/scripts/aggregate-results.py <task_ids...>
  python .omc/scripts/aggregate-results.py --all      # 聚合所有
  python .omc/scripts/aggregate-results.py --watch     # 等待所有完成
"""

import os
import sys
import json
import time
import yaml
from pathlib import Path
from datetime import datetime, timezone, timedelta

HOME = Path.home()
OUTPUTS_DIR = Path.cwd() / ".omc" / "outputs"
SCHEMA_FILE = Path.cwd() / ".omc" / "schemas" / "agent-output.schema.yaml"

TZ = timezone(timedelta(hours=8))

REQUIRED_FIELDS = ["task_id", "agent", "model", "status", "summary"]


def validate_output(data):
    """验证输出是否符合协议。返回 (valid, errors)。"""
    errors = []
    for field in REQUIRED_FIELDS:
        if field not in data:
            errors.append(f"缺少必填字段: {field}")
    if "status" in data and data["status"] not in ("completed", "failed", "blocked", "partial"):
        errors.append(f"无效状态: {data['status']}")
    if "model" in data and data["model"] not in ("haiku", "sonnet", "opus"):
        errors.append(f"无效模型: {data['model']}")
    return len(errors) == 0, errors


def read_task_output(task_id):
    """读取单个 Task 的输出。"""
    os.makedirs(OUTPUTS_DIR, exist_ok=True)
    output_file = OUTPUTS_DIR / f"task_{task_id}.json"
    if not output_file.exists():
        return None
    try:
        return json.loads(output_file.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def aggregate(task_ids):
    """聚合多个 Task 输出生成统一报告。"""
    results = []
    missing = []
    invalid = []

    for tid in task_ids:
        data = read_task_output(tid)
        if data is None:
            missing.append(tid)
            continue
        valid, errors = validate_output(data)
        if not valid:
            invalid.append({"task_id": tid, "errors": errors})
        results.append(data)

    return results, missing, invalid


def generate_report(results, missing, invalid):
    """生成 Markdown 聚合报告。"""
    now = datetime.now(TZ).strftime("%Y-%m-%d %H:%M:%S CST")
    lines = [f"# OMC 并行执行聚合报告", f"生成时间: {now}", ""]

    # 总体统计
    total = len(results) + len(missing)
    completed = sum(1 for r in results if r.get("status") == "completed")
    failed = sum(1 for r in results if r.get("status") == "failed")
    total_tokens = sum(r.get("metrics", {}).get("token_used", 0) for r in results)
    total_duration = max(r.get("metrics", {}).get("duration_ms", 0) for r in results)

    lines.append("## 总体")
    lines.append(f"| 指标 | 值 |")
    lines.append(f"|------|----|")
    lines.append(f"| 总任务 | {total} |")
    lines.append(f"| 完成 | {completed} |")
    failed_count = failed + len(missing)
    if failed_count > 0:
        lines.append(f"| 失败/丢失 | {failed_count} |")
    lines.append(f"| 总 Token | {total_tokens:,} |")
    lines.append(f"| 并行耗时 | {total_duration / 1000:.0f}s (≈ 最慢任务) |")
    lines.append("")

    # 逐任务摘要
    lines.append("## 逐任务")
    lines.append("| Task | Agent | 模型 | 状态 | 摘要 |")
    lines.append("|------|-------|------|------|------|")
    for r in sorted(results, key=lambda x: x.get("task_id", "")):
        tid = r.get("task_id", "?")
        agent = r.get("agent", "?")
        model = r.get("model", "?")
        status = r.get("status", "?")
        summary = r.get("summary", "")[:60]
        status_icon = {"completed": "[OK]", "failed": "[X]", "blocked": "[!]", "partial": "[?]"}.get(status, "[?]")
        lines.append(f"| {tid} | {agent} | {model} | {status_icon} | {summary} |")
    for tid in missing:
        lines.append(f"| {tid} | ? | ? | [X] | 输出文件缺失 |")
    lines.append("")

    # 关键发现汇总
    all_findings = []
    for r in results:
        for f in r.get("findings", []):
            all_findings.append({"task_id": r.get("task_id"), **f})
    if all_findings:
        lines.append("## 关键发现")
        for f in all_findings:
            icon = {"OK": "[OK]", "WARN": "[!]", "ERROR": "[X]", "INFO": "   "}.get(f.get("level", ""), "   ")
            lines.append(f"- {icon} [{f['task_id']}] {f.get('message', '')}")

    # 建议后续步骤
    all_steps = []
    for r in results:
        for s in r.get("next_steps", []):
            all_steps.append(f"- [{r.get('task_id')}] {s}")
    if all_steps:
        lines.append("")
        lines.append("## 建议后续")
        lines.extend(all_steps)

    # 错误详情
    all_errors = []
    for r in results:
        for e in r.get("errors", []):
            all_errors.append({"task_id": r.get("task_id"), **e})
    if all_errors or invalid:
        lines.append("")
        lines.append("## 错误/警告")
        for inv in invalid:
            lines.append(f"- [X] Task {inv['task_id']}: 格式无效 — {', '.join(inv['errors'])}")
        for e in all_errors:
            lines.append(f"- [X] [{e['task_id']}] {e.get('code', 'ERR')}: {e.get('message', '')}")

    return "\n".join(lines)


# ═══ 共享上下文协议 ═══

def write_shared_context(context_data, context_name="shared"):
    """Agent 写入共享上下文（Agent 间通信）。"""
    os.makedirs(OUTPUTS_DIR, exist_ok=True)
    ctx_file = OUTPUTS_DIR / f"shared_context_{context_name}.json"
    ctx_file.write_text(json.dumps({
        "updated_at": datetime.now(TZ).isoformat(),
        "data": context_data
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] Shared context written: {context_name}")

def read_shared_context(context_name="shared"):
    """Agent 读取共享上下文。"""
    ctx_file = OUTPUTS_DIR / f"shared_context_{context_name}.json"
    if not ctx_file.exists():
        return None
    return json.loads(ctx_file.read_text(encoding="utf-8")).get("data", {})


def main():
    if len(sys.argv) < 2:
        print("用法: aggregate-results.py <task_ids...>")
        print("       aggregate-results.py --all")
        sys.exit(1)

    if sys.argv[1] == "--all":
        os.makedirs(OUTPUTS_DIR, exist_ok=True)
        task_ids = sorted(
            f.stem.replace("task_", "") for f in OUTPUTS_DIR.glob("task_*.json")
            if f.stem.startswith("task_")
        )
    else:
        task_ids = sys.argv[1:]

    if not task_ids:
        print("[!] No task outputs found")
        return

    print(f"[*] Aggregating {len(task_ids)} task(s)...")
    results, missing, invalid = aggregate(task_ids)
    report = generate_report(results, missing, invalid)

    # 写入聚合报告
    os.makedirs(OUTPUTS_DIR, exist_ok=True)
    report_file = OUTPUTS_DIR / f"aggregate-{datetime.now(TZ).strftime('%Y%m%d-%H%M%S')}.md"
    report_file.write_text(report, encoding="utf-8")
    print(report)
    print(f"\n报告已保存: {report_file}")

    # 写入状态摘要（供其他 Agent 读取）
    if results:
        summary_data = {
            "total": len(task_ids),
            "completed": sum(1 for r in results if r.get("status") == "completed"),
            "failed": sum(1 for r in results if r.get("status") == "failed"),
            "missing": len(missing),
            "total_tokens": sum(r.get("metrics", {}).get("token_used", 0) for r in results),
            "tasks": {r["task_id"]: r["status"] for r in results},
            "aggregated_at": datetime.now(TZ).isoformat()
        }
        write_shared_context(summary_data, "aggregation")


if __name__ == "__main__":
    main()
