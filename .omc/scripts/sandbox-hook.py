"""
OMC Sandbox Hook — PreToolUse Bash 拦截器
当 OMC_SANDBOX_MODE=workspace-write 时，将 Bash 命令重定向到 Docker 沙箱执行。
"""
import json
import os
import sys

SANDBOX_MODE = os.environ.get("OMC_SANDBOX_MODE", "default")
SANDBOX_IMAGE = os.environ.get("OMC_SANDBOX_IMAGE", "omc-sandbox:latest")

# 不需要沙箱的命令（需要宿主机环境）
HOST_ONLY_COMMANDS = {
    "docker",      # 防止递归
    "git",         # 需要 SSH key + 凭证
    "npm", "npx", "yarn", "pnpm",  # 包管理器
    "pip", "pip3", "python -m pip",  # Python 包管理
    "apt", "apt-get", "pacman", "winget", "choco",  # 系统包管理
    "cargo", "go install", "gem",  # 其他包管理
    "ssh", "scp",  # 远程连接
    "taskkill", "tasklist", "net", "ipconfig",  # Windows 命令
}

# 纯只读命令（优化：不经过沙箱，更快）
READ_ONLY_PREFIXES = (
    "ls ", "dir ", "cat ", "head ", "tail ", "wc ",
    "grep ", "find ", "which ", "where ", "type ",
    "echo ", "printf ", "date ", "whoami", "pwd",
    "uname", "hostname", "id ", "env", "printenv",
)


def should_sandbox(command: str) -> bool:
    """判断命令是否应放入沙箱执行。"""
    if SANDBOX_MODE != "workspace-write":
        return False

    cmd_stripped = command.strip()

    # 空命令不拦截
    if not cmd_stripped:
        return False

    # 宿主机专用命令不拦截
    for host_cmd in HOST_ONLY_COMMANDS:
        if cmd_stripped.startswith(host_cmd):
            return False

    # 纯只读命令不拦截（性能优化）
    for prefix in READ_ONLY_PREFIXES:
        if cmd_stripped.startswith(prefix) and ">" not in cmd_stripped and ">>" not in cmd_stripped:
            return False

    return True


def translate_paths(command: str) -> str:
    """将 Windows 路径翻译为容器内路径。"""
    home = os.environ.get("HOME", "/c/Users/zhang")
    userprofile = os.environ.get("USERPROFILE", "C:\\Users\\zhang")

    # /c/Users/zhang/... → /workspace/...
    command = command.replace(home, "/workspace")
    # ~/... → /workspace/...
    command = command.replace("~/", "/workspace/")
    # C:\Users\zhang\... → /workspace/...
    command = command.replace(userprofile + "\\", "/workspace/")
    command = command.replace(userprofile + "/", "/workspace/")
    # MSYS2 风格路径
    command = command.replace("/c/Users/zhang", "/workspace")

    return command


def wrap_in_sandbox(command: str) -> str:
    """将命令包装在 Docker 沙箱中执行。"""
    userprofile = os.environ.get("USERPROFILE", "C:\\Users\\zhang")
    translated = translate_paths(command)
    docker_exe = os.environ.get("DOCKER_EXE", "docker")

    wrapped = (
        f'MSYS_NO_PATHCONV=1 "{docker_exe}" run --rm '
        f'-v "{userprofile}":/workspace '
        f'-w /workspace '
        f'-e HOME=/workspace '
        f'-e USER=sandbox '
        f'{SANDBOX_IMAGE} '
        f'"{translated}"'
    )

    return wrapped


def main():
    try:
        raw = sys.stdin.read()
        if not raw or not raw.strip():
            # 无输入时不干预，让 harness 使用原始调用
            return
        input_data = json.loads(raw)
    except (json.JSONDecodeError, EOFError):
        # 无法解析输入，不干预
        return

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    if tool_name != "Bash":
        # 非 Bash 工具调用，不干预
        print(json.dumps(input_data))
        return

    command = tool_input.get("command", "")
    description = tool_input.get("description", "")

    if not should_sandbox(command):
        print(json.dumps(input_data))
        return

    wrapped = wrap_in_sandbox(command)

    # 更新 description 标注沙箱执行
    new_description = f"[sandbox] {description}" if description else "[sandbox]"

    output = {
        "tool_name": tool_name,
        "tool_input": {
            "command": wrapped,
            "description": new_description,
        },
    }
    print(json.dumps(output))


if __name__ == "__main__":
    main()
