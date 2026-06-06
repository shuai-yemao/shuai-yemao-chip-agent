"""
路由反馈引擎 (Phase 3)
基于 weekly-report.py 的度量分析，生成可在 SessionStart 注入的路由建议。

被 session-feedback.py 调用，输出简短的上下文提示。
"""
import json, os, sys
from collections import defaultdict

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# 将 weekly-report 作为模块导入（简化版：直接复制核心逻辑）
OMC_DIR = os.path.expanduser("~/.omc")
STATE_DIR = os.path.join(OMC_DIR, "state")
SESSIONS_DIR = os.path.join(OMC_DIR, "sessions")

def load_recent_sessions(limit=5):
    """加载最近 N 个 session"""
    import glob
    files = sorted(
        glob.glob(os.path.join(SESSIONS_DIR, "*.json")),
        key=os.path.getmtime, reverse=True
    )[:limit]
    sessions = []
    for f in files:
        try:
            with open(f) as fh:
                sessions.append(json.load(fh))
        except Exception:
            continue
    return sessions

def load_recent_replays(limit=3):
    """加载最近 N 个 replay JSONL"""
    import glob
    files = sorted(
        glob.glob(os.path.join(STATE_DIR, "agent-replay-*.jsonl")),
        key=os.path.getmtime, reverse=True
    )[:limit]
    agent_stats = defaultdict(lambda: {"spawns": 0, "completions": 0, "errors": 0})
    total_interventions = 0
    total_events = 0

    for f in files:
        try:
            with open(f) as fh:
                for line in fh:
                    try:
                        evt = json.loads(line)
                        total_events += 1
                        t = evt.get("type", "")
                        at = evt.get("agent_type", "unknown")
                        if t == "agent_start":
                            agent_stats[at]["spawns"] += 1
                        elif t == "agent_stop":
                            agent_stats[at]["completions"] += 1
                        elif t == "error":
                            agent_stats[at]["errors"] += 1
                        elif t == "intervention":
                            total_interventions += 1
                    except json.JSONDecodeError:
                        continue
        except Exception:
            continue
    return agent_stats, total_interventions, total_events

def generate_routing_hints():
    """基于历史数据生成路由建议"""
    agent_stats, interventions, total_events = load_recent_replays()

    hints = []
    total_spawns = sum(a["spawns"] for a in agent_stats.values())

    for agent_type, stats in agent_stats.items():
        if stats["spawns"] < 2:
            continue

        # 错误率分析
        error_rate = stats["errors"] / max(stats["spawns"], 1)
        if error_rate > 0.4:
            hints.append({
                "type": "avoid",
                "agent": agent_type,
                "reason": f"error_rate={error_rate:.0%} (n={stats['spawns']})"
            })

        # 完成率分析
        completion_rate = stats["completions"] / max(stats["spawns"], 1)
        if completion_rate > 0.9 and stats["spawns"] >= 3 and error_rate < 0.2:
            hints.append({
                "type": "prefer",
                "agent": agent_type,
                "reason": f"completion={completion_rate:.0%} error={error_rate:.0%}"
            })

    return hints

def main():
    as_json = "--json" in sys.argv
    hints = generate_routing_hints()

    if as_json:
        print(json.dumps({"avoid": [h for h in hints if h["type"] == "avoid"],
                          "prefer": [h for h in hints if h["type"] == "prefer"]},
                         indent=2, ensure_ascii=False))
        return

    if not hints:
        print("路由: 数据不足，使用默认规则")
        return

    avoid = [h for h in hints if h["type"] == "avoid"]
    prefer = [h for h in hints if h["type"] == "prefer"]

    if as_json:
        print(json.dumps({"avoid": avoid, "prefer": prefer}, indent=2, ensure_ascii=False))
    else:
        parts = []
        if prefer:
            parts.append("推荐: " + ", ".join(h["agent"].split(":")[-1] for h in prefer[:3]))
        if avoid:
            parts.append("慎用: " + ", ".join(h["agent"].split(":")[-1] for h in avoid[:3]))
        print("路由: " + " | ".join(parts) if parts else "路由: 无调整建议")

if __name__ == "__main__":
    main()
