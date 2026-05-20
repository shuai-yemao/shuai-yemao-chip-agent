# 环境探针：检查可用开发工具
param([string]$ToolInput = "{}")

$report = @{
    timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssK")
    checks = @{}
    all_available = $true
}

$all_tools = @{
    # 基础工具
    "python"       = "python"
    "node"         = "node"
    "git"          = "git"
    "gcc"          = "gcc"
    "make"         = "mingw32-make"
    # 嵌入式工具链
    "arm-gcc"      = "arm-none-eabi-gcc"
    "openocd"      = "openocd"
    "cmake"        = "cmake"
    "platformio"   = "pio"
    "esptool"      = "esptool.py"
}

$hints = @{
    "arm-gcc"    = "ARM GNU Toolchain: https://developer.arm.com/downloads/-/gnu-rm"
    "openocd"    = "OpenOCD: https://github.com/openocd-org/openocd/releases"
    "platformio" = "PlatformIO: pip install platformio"
    "esptool"    = "esptool: pip install esptool"
    "make"       = "MSYS2: pacman -S mingw-w64-x86_64-make"
    "gcc"        = "MSYS2: pacman -S mingw-w64-x86_64-gcc"
}

foreach ($name in $all_tools.Keys) {
    $cmd = $all_tools[$name]
    try {
        $result = Get-Command $cmd -ErrorAction Stop 2>$null
        $report.checks[$name] = @{
            available = $true
            path = $result.Source
        }
    } catch {
        $hint = if ($hints.ContainsKey($name)) { $hints[$name] } else { "请安装 $cmd" }
        $report.checks[$name] = @{
            available = $false
            hint = $hint
        }
        $report.all_available = $false
    }
}

$report | ConvertTo-Json -Depth 3 -Compress
