"""
周度度量报告生成器 (Phase 3)
读取 .omc/sessions/ + agent-replay JSONL，输出执行摘要和路由建议。
用法: python weekly-report.py [--json]
"""
import json, os, sys, glob
from datetime import datetime, timedelta
from collections import defaultdict

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

OMC_DIR = os.path.expanduser("~/.omc")
SESSIONS_DIR = os.path.join(OMC_DIR, "sessions")
STATE_DIR = os.path.join(OMC_DIR, "state")
WEEK_AGO = datetime.now() - timedelta(days=7)

def find_recent_files(pattern, since=None):
    files = sorted(glob.glob(pattern), key=os.path.getmtime, reverse=True)
    if since:
        files = [f for f in files if datetime.fromtimestamp(os.path.getmtime(f)) > since]
    return files

def analyze_replays():
    """分析 replay JSONL 提取 agent/tool/error 统计"""
    replays = find_recent_files(os.path.join(STATE_DIR, "agent-replay-*.jsonl"), WEEK_AGO)
    stats = {
        "total_events": 0,
        "agents": defaultdict(lambda: {"spawns": 0, "completions": 0, "errors": 0}),
        "tools": defaultdict(int),
        "interventions": 0,
        "errors": 0,
        "skills_activated": 0,
    }
    for rp in replays:
        try:
            with open(rp) as f:
                for line in f:
                    try:
                        evt = json.loads(line)
                        stats["total_events"] += 1
                        t = evt.get("type", "")
                        if t == "agent_start":
                            at = evt.get("agent_type", "unknown")
                            stats["agents"][at]["spawns"] += 1
                        elif t == "agent_stop":
                            at = evt.get("agent_type", "unknown")
                            stats["agents"][at]["completions"] += 1
                        elif t in ("tool_start", "tool_end"):
                            stats["tools"][evt.get("tool_name", "?")] += 1
                        elif t == "intervention":
                            stats["interventions"] += 1
                        elif t == "error":
                            stats["errors"] += 1
                            at = evt.get("agent_type", "unknown")
                            stats["agents"][at]["errors"] += 1
                        elif t == "skill_activated":
                            stats["skills_activated"] += 1
                    except json.JSONDecodeError:
                        continue
        except Exception:
            continue
    return stats

def analyze_sessions():
    """分析 session JSON 计算完成率"""
    sessions = find_recent_files(os.path.join(SESSIONS_DIR, "*.json"), WEEK_AGO)
    stats = {
        "total": len(sessions),
        "durations": [],
        "total_cost": 0.0,
        "total_tokens": 0,
    }
    for sess_file in sessions:
        try:
            with open(sess_file) as f:
                data = json.load(f)
            dur = data.get("durationMinutes", 0)
            if dur > 0:
                stats["durations"].append(dur)
            stats["total_tokens"] += data.get("totalTokens", 0)
        except Exception:
            continue
    return stats

def compute_recommendations(replay_stats):
    """基于 replay 数据生成路由建议"""
    recs = []
    agents = replay_stats["agents"]
    for agent_type, data in agents.items():
        if data["spawns"] > 0:
            error_rate = data["errors"] / data["spawns"]
            if error_rate > 0.3 and data["spawns"] >= 2:
                recs.append({
                    "agent_type": agent_type,
                    "action": "review",
                    "reason": f"错误率 {error_rate:.0%} (spawns={data['spawns']})"
                })
            completion_rate = data["completions"] / data["spawns"]
            if completion_rate < 0.5 and data["spawns"] >= 3:
                recs.append({
                    "agent_type": agent_type,
                    "action": "investigate",
                    "reason": f"完成率 {completion_rate:.0%} (spawns={data['spawns']})"
                })
    return recs

def generate_report():
    replay = analyze_replays()
    sessions = analyze_sessions()

    # 计算自主度
    total_spawns = sum(a["spawns"] for a in replay["agents"].values())
    interventions = replay["interventions"]
    autonomy = 1 - (interventions / max(total_spawns, 1))

    # 计算平均时长
    avg_duration = sum(sessions["durations"]) / max(len(sessions["durations"]), 1)

    # 最常用工具 Top 5
    top_tools = sorted(replay["tools"].items(), key=lambda x: x[1], reverse=True)[:5]

    # 瓶颈 Agent
    agent_errors = [(at, d["errors"]) for at, d in replay["agents"].items() if d["errors"] > 0]
    agent_errors.sort(key=lambda x: x[1], reverse=True)

    # 路由建议
    recommendations = compute_recommendations(replay)

    report = {
        "generated_at": datetime.now().isoformat(),
        "period": "7 days",
        "summary": {
            "sessions": sessions["total"],
            "total_events": replay["total_events"],
            "avg_duration_min": round(avg_duration, 1),
            "interventions": interventions,
            "autonomy": f"{autonomy:.0%}",
            "skills_activated": replay["skills_activated"],
        },
        "agents": {at: dict(d) for at, d in replay["agents"].items()},
        "top_tools": [{"tool": t, "calls": c} for t, c in top_tools],
        "bottlenecks": [{"agent": at, "errors": e} for at, e in agent_errors[:5]],
        "recommendations": recommendations,
    }

    return report

def main():
    as_json = "--json" in sys.argv
    report = generate_report()

    if as_json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        s = report["summary"]
        print(f"=== OMC 周度度量报告 ({report['generated_at'][:10]}) ===")
        print(f"会话: {s['sessions']}  |  事件: {s['total_events']}  |  平均时长: {s['avg_duration_min']}分钟")
        print(f"自主度: {s['autonomy']}  |  干预: {s['interventions']}  |  技能: {s['skills_activated']}")
        if report["bottlenecks"]:
            print(f"\n瓶颈 Agent:")
            for b in report["bottlenecks"]:
                print(f"  {b['agent']}: {b['errors']} 次错误")
        if report["recommendations"]:
            print(f"\n路由建议:")
            for r in report["recommendations"]:
                action_cn = {"review": "审查", "investigate": "排查"}.get(r['action'], r['action'])
                print(f"  [{action_cn}] {r['agent_type']} — {r['reason']}")

if __name__ == "__main__":
    main()
