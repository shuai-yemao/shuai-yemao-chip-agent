"""
SessionStart hook: 读取上轮 session 的执行度量并注入上下文。
集成 experiments.py 和 routing-feedback.py，输出路由建议 + 激活实验。
"""
import json, os, sys, glob, subprocess

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
OMC_DIR = os.path.dirname(SCRIPTS_DIR)
SESSIONS_DIR = os.path.join(OMC_DIR, "sessions")
REPLAY_DIR = os.path.join(OMC_DIR, "state")
PYTHON = os.path.expanduser(r"~\AppData\Local\Programs\Python\Python312\python.exe")

def run_module(script_name, *args):
    """运行同目录脚本并返回输出"""
    path = os.path.join(SCRIPTS_DIR, script_name)
    try:
        r = subprocess.run([PYTHON, path] + list(args), capture_output=True, text=True, timeout=5)
        return r.stdout.strip() if r.returncode == 0 else None
    except Exception:
        return None

def load_replay_summary():
    """从 replay JSONL 提取摘要"""
    if not os.path.isdir(REPLAY_DIR):
        return None
    replays = sorted(glob.glob(os.path.join(REPLAY_DIR, "agent-replay-*.jsonl")),
                     key=os.path.getmtime, reverse=True)
    if not replays:
        return None
    try:
        with open(replays[0]) as f:
            lines = f.readlines()
        agents = set()
        errors = 0
        for line in lines[-500:]:
            try:
                evt = json.loads(line)
                if evt.get("type") == "agent_start":
                    agents.add(evt.get("agent_type", "?"))
                elif evt.get("type") in ("error", "intervention"):
                    errors += 1
            except Exception:
                continue
        return {"unique_agents": len(agents), "errors": errors}
    except Exception:
        return None

def main():
    replay = load_replay_summary()

    parts = []

    # 1. Session 摘要
    if replay:
        parts.append(f"上轮: {replay['unique_agents']} agents")
        if replay['errors'] > 0:
            parts.append(f"{replay['errors']}次干预")

    # 2. 激活的实验
    experiments = run_module("experiments.py")
    if experiments and "none" not in experiments:
        parts.append(experiments)

    # 3. 路由建议 (基于 replay 数据)
    routing = run_module("routing-feedback.py")
    if routing and "无调整" not in routing and "数据不足" not in routing:
        parts.append(routing)

    if parts:
        print(" | ".join(parts))
    else:
        print("OMC ready")

if __name__ == "__main__":
    main()
