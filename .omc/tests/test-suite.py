"""
集成测试套件 (Phase 3)
测试 .omc/scripts/ 下的所有脚本功能和边界条件。

用法: python test-suite.py [--verbose]
"""
import json, os, sys, subprocess, tempfile, shutil

PYTHON = os.path.expanduser(r"~\AppData\Local\Programs\Python\Python312\python.exe")
SCRIPTS = os.path.expanduser(r"~\.omc\scripts")
VERBOSE = "--verbose" in sys.argv

passed = 0
failed = 0

def test(name, func):
    global passed, failed
    try:
        func()
        passed += 1
        print(f"  [OK] {name}")
    except AssertionError as e:
        failed += 1
        print(f"  [FAIL] {name}: {e}")
        if VERBOSE:
            import traceback
            traceback.print_exc()
    except Exception as e:
        failed += 1
        print(f"  [ERROR] {name}: {e}")
        if VERBOSE:
            import traceback
            traceback.print_exc()

def run_script(script_name, *args):
    """运行脚本并返回 (stdout, stderr, exit_code)"""
    path = os.path.join(SCRIPTS, script_name)
    cmd = [PYTHON, path] + list(args)
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
    return r.stdout, r.stderr, r.returncode

def run_ps1(script_name):
    """运行 PowerShell 脚本"""
    path = os.path.join(SCRIPTS, script_name)
    cmd = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
    return r.stdout, r.stderr, r.returncode

# ===========================================================
# env-check.ps1 测试
# ===========================================================
def test_env_check_output():
    stdout, stderr, rc = run_ps1("env-check.ps1")
    assert rc in (0, 1), f"exit code should be 0 or 1, got {rc}"
    data = json.loads(stdout)
    assert "checks" in data
    assert "all_available" in data
    assert "timestamp" in data
    assert len(data["checks"]) >= 8, f"expected >=8 tools, got {len(data['checks'])}"

def test_env_check_git_detected():
    stdout, _, _ = run_ps1("env-check.ps1")
    data = json.loads(stdout)
    git_check = data["checks"].get("git", {})
    assert git_check.get("available"), "git should be available"

def test_env_check_missing_tool():
    stdout, _, _ = run_ps1("env-check.ps1")
    data = json.loads(stdout)
    arm = data["checks"].get("arm-gcc", {})
    if not arm.get("available"):
        assert "hint" in arm, "unavailable tools should have hints"

# ===========================================================
# session-feedback.py 测试
# ===========================================================
def test_session_feedback_runs():
    stdout, stderr, rc = run_script("session-feedback.py")
    assert rc == 0, f"exit code should be 0, got {rc}: {stderr}"
    assert len(stdout.strip()) > 0, "should produce output"

# ===========================================================
# weekly-report.py 测试
# ===========================================================
def test_weekly_report_json():
    stdout, _, rc = run_script("weekly-report.py", "--json")
    assert rc == 0, f"exit code should be 0, got {rc}"
    data = json.loads(stdout)
    assert "summary" in data
    assert "agents" in data
    assert "recommendations" in data
    assert "generated_at" in data

def test_weekly_report_text():
    stdout, _, rc = run_script("weekly-report.py")
    assert rc == 0
    assert "OMC" in stdout or len(stdout) > 0

# ===========================================================
# patch-hud-agents.py 测试
# ===========================================================
def test_patch_idempotent():
    # 运行两次，第二次应该是 no-op
    stdout1, _, rc1 = run_script("patch-hud-agents.py")
    stdout2, _, rc2 = run_script("patch-hud-agents.py")
    assert rc1 == 0 and rc2 == 0
    assert "SKIP" in stdout2 or "already patched" in stdout2.lower(), \
        f"second run should skip: {stdout2}"

# ===========================================================
# experiments.py 测试
# ===========================================================
def test_experiments_list():
    stdout, _, rc = run_script("experiments.py", "--list")
    assert rc == 0
    assert "[ON]" in stdout or "[OFF]" in stdout

def test_experiments_default():
    stdout, _, rc = run_script("experiments.py")
    assert rc == 0
    assert "experiments:" in stdout

# ===========================================================
# routing-feedback.py 测试
# ===========================================================
def test_routing_feedback_runs():
    stdout, _, rc = run_script("routing-feedback.py")
    assert rc == 0
    assert len(stdout.strip()) > 0

def test_routing_feedback_json():
    stdout, _, rc = run_script("routing-feedback.py", "--json")
    assert rc == 0
    data = json.loads(stdout)
    assert "avoid" in data
    assert "prefer" in data

# ===========================================================
# settings.json 完整性测试
# ===========================================================
def test_settings_valid_json():
    with open(os.path.expanduser("~/.claude/settings.json")) as f:
        data = json.load(f)
    assert "omcHud" in data
    assert "hooks" in data
    assert data["omcHud"]["locale"] == "zh-CN"

# ===========================================================
# CLAUDE.md 完整性测试
# ===========================================================
def test_claude_md_sections():
    with open(os.path.expanduser("~/.claude/CLAUDE.md"), encoding="utf-8") as f:
        content = f.read()
    # XML 标签段落
    xml_sections = [
        "checkpoint_system", "agent_direct_comm", "observability",
        "fault_recovery", "agent_core_workflow", "delegation_rules",
    ]
    for section in xml_sections:
        assert f"<{section}>" in content, f"missing <{section}>"
        assert f"</{section}>" in content, f"missing </{section}>"
    # HTML 注释边界段落
    assert "<!-- AGENT_ARCH:START -->" in content, "missing AGENT_ARCH start"
    assert "<!-- AGENT_ARCH:END -->" in content, "missing AGENT_ARCH end"
    assert "<!-- LANGUAGE:START -->" in content, "missing LANGUAGE start"
    assert "<!-- LANGUAGE:END -->" in content, "missing LANGUAGE end"

# ===========================================================
# 主入口
# ===========================================================
if __name__ == "__main__":
    print("=== OMC 集成测试套件 ===\n")

    print("[env-check.ps1]")
    test("输出有效 JSON", test_env_check_output)
    test("git 已检测", test_env_check_git_detected)
    test("缺失工具有提示", test_env_check_missing_tool)

    print("\n[session-feedback.py]")
    test("正常运行", test_session_feedback_runs)

    print("\n[weekly-report.py]")
    test("JSON 输出有效", test_weekly_report_json)
    test("文本输出有效", test_weekly_report_text)

    print("\n[patch-hud-agents.py]")
    test("幂等运行 (no-op on re-run)", test_patch_idempotent)

    print("\n[experiments.py]")
    test("列表输出", test_experiments_list)
    test("默认输出", test_experiments_default)

    print("\n[routing-feedback.py]")
    test("正常运行", test_routing_feedback_runs)
    test("JSON 输出有效", test_routing_feedback_json)

    print("\n[settings.json]")
    test("有效 JSON + omcHud", test_settings_valid_json)

    print("\n[CLAUDE.md]")
    test("所有段落完整", test_claude_md_sections)

    print(f"\n{'='*40}")
    print(f"通过: {passed}  失败: {failed}  总计: {passed + failed}")
    if failed > 0:
        print(f"\n[!] {failed} 个测试失败")
        sys.exit(1)
    else:
        print(f"[OK] 全部通过")
