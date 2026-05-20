"""
Canary 实验标志系统 (Phase 3)
管理改进项的灰度启用。SessionStart 时读取配置，注入激活实验到上下文。

配置 (settings.json):
  "omcExperiments": {
    "patch-hud-agents": true,
    "session-feedback": true,
    "env-check": true,
    "runtime-verify": false,
    "naming-v2": true
  }
"""
import json, os, sys

CONFIG_PATH = os.path.expanduser("~/.claude/settings.json")
STATE_PATH = os.path.expanduser("~/.omc/state/experiments-state.json")

DEFAULT_EXPERIMENTS = {
    "patch-hud-agents": True,       # HUD Cherry agent 编码补丁
    "session-feedback": True,       # SessionStart 度量反馈注入
    "env-check": True,              # PreToolUse 环境探针
    "weekly-report": True,          # 周度度量报告
    "naming-v2": True,              # 统一 agent_type 命名
    "runtime-verify": False,        # [待实现] TypeScript 运行时验证
    "auto-compact-feedback": False, # [待实现] 自动压缩建议
    "self-review-guard": False,     # [待实现] 禁止自审批守卫
}

def load_state():
    """加载实验状态"""
    if os.path.exists(STATE_PATH):
        try:
            with open(STATE_PATH) as f:
                return json.load(f)
        except Exception:
            pass
    return {"rollout_history": []}

def save_state(state):
    os.makedirs(os.path.dirname(STATE_PATH), exist_ok=True)
    with open(STATE_PATH, "w") as f:
        json.dump(state, f, indent=2)

def load_config():
    """从 settings.json 读取实验配置"""
    try:
        with open(CONFIG_PATH) as f:
            settings = json.load(f)
        configured = settings.get("omcExperiments", {})
        # 合并默认值
        merged = dict(DEFAULT_EXPERIMENTS)
        merged.update(configured)
        return merged
    except Exception:
        return dict(DEFAULT_EXPERIMENTS)

def get_active():
    """返回当前激活的实验列表"""
    config = load_config()
    return [k for k, v in config.items() if v]

def record_rollout(experiment_id, version):
    """记录实验发布事件"""
    from datetime import datetime
    state = load_state()
    state["rollout_history"].append({
        "experiment": experiment_id,
        "version": version,
        "activated_at": datetime.now().isoformat()
    })
    # 保留最近 50 条
    state["rollout_history"] = state["rollout_history"][-50:]
    save_state(state)

def is_enabled(experiment_id):
    """检查实验是否启用"""
    config = load_config()
    return config.get(experiment_id, False)

def main():
    if "--list" in sys.argv:
        config = load_config()
        for k, v in config.items():
            status = "[ON]" if v else "[OFF]"
            print(f"  {status} {k}")
        return

    if "--check" in sys.argv and len(sys.argv) > 2:
        exp = sys.argv[sys.argv.index("--check") + 1]
        print("true" if is_enabled(exp) else "false")
        return

    # 默认：输出激活列表给 SessionStart 消费
    active = get_active()
    if active:
        print(f"experiments: {', '.join(active)}")
    else:
        print("experiments: none active")

if __name__ == "__main__":
    main()
