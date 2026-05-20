"""
SessionStart hook: 读取上轮 session 的执行度量并注入上下文。
从 .omc/sessions/ 读最新 session 指标，输出给 StatusLine stdin。
"""
import json, os, sys, glob

SESSIONS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sessions")
REPLAY_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "state")
MAX_FEEDBACK = 5  # 最多查最近 N 个 session

def load_last_sessions():
    """加载最近 session 指标"""
    if not os.path.isdir(SESSIONS_DIR):
        return []
    files = sorted(glob.glob(os.path.join(SESSIONS_DIR, "*.json")), key=os.path.getmtime, reverse=True)
    sessions = []
    for f in files[:MAX_FEEDBACK]:
        try:
            with open(f) as fh:
                data = json.load(fh)
                data["_file"] = os.path.basename(f)
                sessions.append(data)
        except Exception:
            continue
    return sessions

def load_replay_summary():
    """从 replay JSONL 提取摘要"""
    if not os.path.isdir(REPLAY_DIR):
        return None
    replays = sorted(glob.glob(os.path.join(REPLAY_DIR, "agent-replay-*.jsonl")), key=os.path.getmtime, reverse=True)
    if not replays:
        return None
    try:
        with open(replays[0]) as f:
            lines = f.readlines()
        agents = set()
        tools = set()
        errors = 0
        for line in lines[-500:]:  # 最近 500 行
            try:
                evt = json.loads(line)
                if evt.get("type") == "agent_start":
                    agents.add(evt.get("agent_type", "?"))
                elif evt.get("type") == "tool_start":
                    tools.add(evt.get("tool_name", "?"))
                elif evt.get("type") in ("error", "intervention"):
                    errors += 1
            except Exception:
                continue
        return {
            "unique_agents": len(agents),
            "agent_types": list(agents),
            "unique_tools": len(tools),
            "errors_or_interventions": errors
        }
    except Exception:
        return None

def main():
    sessions = load_last_sessions()
    replay = load_replay_summary()

    feedback = {
        "type": "session_feedback",
        "last_sessions": len(sessions),
        "latest": sessions[0] if sessions else None,
        "replay": replay
    }

    # 输出纯文本给 statusline stdin (OMC 会解析)
    parts = []
    if sessions:
        latest = sessions[0]
        parts.append(f"上次session: {latest.get('sessionId','?')[:8]}")
    if replay:
        parts.append(f"agents:{replay['unique_agents']} tools:{replay['unique_tools']}")
        if replay['errors_or_interventions'] > 0:
            parts.append(f"[!]{replay['errors_or_interventions']}次干预")

    print(" | ".join(parts) if parts else "首轮session")

if __name__ == "__main__":
    main()
