// 通用领域配置
const config = {
  name: 'generic',
  skillCategory: {},
  categoryPrompts: { general: '按任务描述执行，确保产出符合验收标准' },
  troubleshootingMap: [],
  verificationCriteria: '代码正确性: 逻辑无遗漏，边界条件已处理',
  security: { enabled: true, domain: 'generic', preflight_rules: { check_high_risk: true, check_file_permissions: true, check_blacklist: true, check_embedded_constraints: false } },
}
