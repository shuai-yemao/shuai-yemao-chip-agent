"""
HUD Agent 编码补丁 (Phase 3)
为 OMC 缓存中的 agents.js 添加 Cherry agent 的 AGENT_TYPE_CODES 条目，
修复 HUD 中 cherryclaw-embedded/learner/doc-handler 无法区分的问题。

SessionStart 时运行（幂等：已打补丁则跳过）。
"""
import re, sys, os, glob

PATCH_MARKER_CODES = "// PATCHED: cherry-agent-codes"
PATCH_MARKER_PREFIX = "// PATCHED: cherry-prefix"

def find_agents_js():
    """查找 OMC 缓存的 agents.js"""
    base = os.path.expanduser("~/.claude/plugins/cache/omc")
    # 递归搜索
    candidates = glob.glob(os.path.join(base, "**/agents.js"), recursive=True)
    # 只保留 dist/hud/elements/ 路径
    candidates = [c for c in candidates if "dist" in c and "hud" in c]
    if not candidates:
        return None
    # 取最新版本 (按路径深度排序：版本号越长越优先)
    candidates.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    return os.path.normpath(candidates[0])

def patch_agent_codes(content):
    """在 AGENT_TYPE_CODES 末尾增加 Cherry agent 条目"""
    if PATCH_MARKER_CODES in content:
        return content, False  # 已打补丁

    # 在 researcher 条目后插入 Cherry 条目
    cherry_entries = """
    // ============================================================
    // CHERRY STUDIO AGENTS
    // ============================================================
    'cherryclaw-embedded': 'Eb',
    'cherryclaw-learner': 'Le',
    'doc-handler': 'Dh',
    %s
"""
    new_content = content.replace(
        "researcher: 'r', // sonnet\n};",
        "researcher: 'r', // sonnet\n" + cherry_entries % PATCH_MARKER_CODES + "};"
    )
    return new_content, new_content != content

def patch_get_agent_code(content):
    """为 getAgentCode() 添加 Cherry 前缀处理"""
    if PATCH_MARKER_PREFIX in content:
        return content, False

    # 在 fallback 逻辑中插入 Cherry 前缀检测
    old_fallback = """if (!code) {
        // Unknown agent - use first letter
        code = shortName.charAt(0).toUpperCase();
    }"""
    new_fallback = """if (!code) {
        // Cherry Studio agents %s
        if (shortName.startsWith('cherryclaw-')) {
            code = shortName.replace('cherryclaw-', '').substring(0, 2);
            code = code.charAt(0).toUpperCase() + code.slice(1).toLowerCase();
        } else if (shortName === 'doc-handler') {
            code = 'Dh';
        } else {
            code = shortName.charAt(0).toUpperCase();
        }
    }""" % PATCH_MARKER_PREFIX

    return content.replace(old_fallback, new_fallback), True

def main():
    agents_js = find_agents_js()
    if not agents_js:
        print("[SKIP] OMC agents.js not found in cache")
        return

    with open(agents_js, 'r', encoding='utf-8') as f:
        content = f.read()

    # Step 1: 添加 AGENT_TYPE_CODES 条目
    content, changed1 = patch_agent_codes(content)

    # Step 2: 修复 getAgentCode 前缀处理
    content, changed2 = patch_get_agent_code(content)

    if changed1 or changed2:
        with open(agents_js, 'w', encoding='utf-8') as f:
            f.write(content)
        changes = []
        if changed1: changes.append("AGENT_TYPE_CODES +3 (Eb/Ln/Dh)")
        if changed2: changes.append("getAgentCode prefix handling")
        print(f"[OK] {os.path.basename(agents_js)}: {', '.join(changes)}")
    else:
        print(f"[SKIP] {os.path.basename(agents_js)}: already patched")

if __name__ == "__main__":
    main()
