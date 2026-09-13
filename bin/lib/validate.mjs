import path from "node:path";
import { chmod, readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const REQUIRED_JSON_FILES = [
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  ".cursor-plugin/plugin.json",
  "hooks/hooks.json",
  "package.json",
];

const REQUIRED_FILES = [
  "bin/jiaoyuan-skill.mjs",
  "bin/lib/detect-platform.mjs",
  "bin/lib/install.mjs",
  "bin/lib/validate.mjs",
  "hooks/run-hook.cmd",
  "hooks/session-start",
  "hooks/session-start.ps1",
  "skills/jiaoyuan/SKILL.md",
  ".codex/INSTALL.md",
  ".opencode/INSTALL.md",
  ".openclaw/INSTALL.md",
  ".hermes/INSTALL.md",
  ".nanobot/INSTALL.md",
  "README.md",
  "README.en.md",
];

const MARKDOWN_FILES = [
  "README.md",
  "README.en.md",
  ".codex/INSTALL.md",
  ".opencode/INSTALL.md",
  ".openclaw/INSTALL.md",
  ".hermes/INSTALL.md",
  ".nanobot/INSTALL.md",
];

const COMMANDS = [
  "矛盾分析法",
  "实践认识论",
  "调查研究",
  "群众路线",
  "批评与自我批评",
  "持久战略",
  "集中兵力",
  "星火燎原",
  "统筹兼顾",
  "工作流组合",
  "纸老虎论",
  "统一战线",
];

const ENTRY_SKILL = "jiaoyuan";
const ORCHESTRATION_SKILL = "workflows";

const WEAPON_SECTIONS = [
  "## 不适用场景",
  "## 何时使用",
  "## 方法流程",
  "## 常见错误",
  "## 操作规程",
  "## 与其他 skill 的关系",
];

const CITATION_PATTERN = /——毛泽东|——《/;
const QUOTE_LINE_PATTERN = /^\s*>\s*"/;

const QUOTE_DISCIPLINE_PREFIXES = ['"', "【编者概括】", "——", "注：", "引文体例"];
const QUOTE_DISCIPLINE_LABEL_PATTERN = /^第[一二三四五六七八九十]+阶段[：:—-]/;

const WEAPON_FIELDS_PATTERN = /^\*\*输出字段\*\*：(.+)$/m;
const FIELD_TOKEN_PATTERN = /`([^`]+)`/g;
const WORKFLOW_STEP_PATTERN = /^\*\*Step\s+\d+：([a-z0-9-]+)（/;
const ADOPT_LINE_PATTERN = /^- 采用：(.+)$/;
const EXTRA_LINE_PATTERN = /^- 额外补充：(.+)$/;

function extractFieldTokens(text) {
  return [...text.matchAll(FIELD_TOKEN_PATTERN)].map((match) => match[1]);
}

const KB_GUIDANCE_HEADING = "## 知识库不可用时，用户索要原文怎么办";

async function validateKnowledgeBaseGuidance(repoRoot, errors) {
  const kbPath = path.join(repoRoot, "skills", ENTRY_SKILL, "knowledge", "kb-discovery.md");

  if (!(await exists(kbPath))) {
    errors.push(`Missing knowledge base doc: skills/${ENTRY_SKILL}/knowledge/kb-discovery.md`);
    return;
  }

  const content = await readFile(kbPath, "utf8");

  if (!content.includes(KB_GUIDANCE_HEADING)) {
    errors.push(
      `skills/${ENTRY_SKILL}/knowledge/kb-discovery.md is missing '${KB_GUIDANCE_HEADING}' — without it, the behaviour when the knowledge base is absent is undefined`,
    );
  }
}

async function exists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(targetPath, matcher, files = []) {
  const entries = await readdir(targetPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(fullPath, matcher, files);
      continue;
    }

    if (matcher(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function parseFrontmatter(content, filePath) {
  const normalized = content.replace(/^\uFEFF/, "");
  const lines = normalized.split(/\r?\n/);

  if (lines[0] !== "---") {
    throw new Error(`Missing frontmatter: ${filePath}`);
  }

  const terminatorIndex = lines.indexOf("---", 1);
  if (terminatorIndex < 1) {
    throw new Error(`Missing frontmatter terminator: ${filePath}`);
  }

  const frontmatter = lines.slice(1, terminatorIndex).join("\n");
  if (!/^name:\s*.+$/m.test(frontmatter)) {
    throw new Error(`Missing 'name' in frontmatter: ${filePath}`);
  }
  if (!/^description:\s*\|$/m.test(frontmatter)) {
    throw new Error(`Missing block 'description' in frontmatter: ${filePath}`);
  }
}

function readJson(text, filePath) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON: ${filePath}\n${error.message}`);
  }
}

async function validateMarkdownLinks(repoRoot, relativePath, errors) {
  const fullPath = path.join(repoRoot, relativePath);
  const content = await readFile(fullPath, "utf8");
  const matches = content.matchAll(/!\[[^\]]*\]\(([^)]+)\)|\[[^\]]+\]\(([^)]+)\)/g);

  for (const match of matches) {
    const rawTarget = (match[1] ?? match[2] ?? "").trim();
    if (!rawTarget) {
      continue;
    }

    const [targetWithoutFragment] = rawTarget.split("#");
    if (!targetWithoutFragment || /^[a-z]+:/i.test(targetWithoutFragment)) {
      continue;
    }

    const resolved = path.resolve(path.dirname(fullPath), targetWithoutFragment);
    if (!(await exists(resolved))) {
      errors.push(`Broken local markdown target '${rawTarget}' in ${relativePath}`);
    }
  }
}

function validateTextIncludes(content, expected, label, errors) {
  if (!content.includes(expected)) {
    errors.push(`${label} is missing '${expected}'`);
  }
}

async function validateHookStructure(repoRoot, hooksJson, errors) {
  const sessionStartEntries = hooksJson?.hooks?.SessionStart;
  if (!Array.isArray(sessionStartEntries) || sessionStartEntries.length === 0) {
    errors.push("hooks/hooks.json is missing hooks.SessionStart entries");
    return;
  }

  const [sessionStart] = sessionStartEntries;
  if (sessionStart.matcher !== "startup|clear|compact") {
    errors.push("hooks/hooks.json SessionStart matcher must stay 'startup|clear|compact'");
  }

  const command = sessionStart.hooks?.[0]?.command ?? "";
  if (!command.includes("run-hook.cmd") || !command.includes("session-start")) {
    errors.push("hooks/hooks.json SessionStart command must invoke run-hook.cmd session-start");
  }

  const shellHookPath = path.join(repoRoot, "hooks", "session-start");
  await chmod(shellHookPath, 0o755).catch(() => {});

  const shellHook = await readFile(shellHookPath, "utf8");
  validateTextIncludes(shellHook, "jiaoyuan:skill", "hooks/session-start", errors);
  validateTextIncludes(shellHook, "hookSpecificOutput", "hooks/session-start", errors);
  validateTextIncludes(shellHook, "additionalContext", "hooks/session-start", errors);
  validateTextIncludes(shellHook, "\"additional_context\"", "hooks/session-start", errors);
  validateTextIncludes(shellHook, "CURSOR_PLUGIN_ROOT", "hooks/session-start", errors);
  validateTextIncludes(shellHook, "CLAUDE_PLUGIN_ROOT", "hooks/session-start", errors);

  const psHook = await readFile(path.join(repoRoot, "hooks", "session-start.ps1"), "utf8");
  validateTextIncludes(psHook, "ConvertTo-AsciiJsonString", "hooks/session-start.ps1", errors);
  validateTextIncludes(psHook, "jiaoyuan:skill", "hooks/session-start.ps1", errors);
  validateTextIncludes(psHook, "hookSpecificOutput", "hooks/session-start.ps1", errors);
  validateTextIncludes(psHook, "additionalContext", "hooks/session-start.ps1", errors);
  validateTextIncludes(psHook, "\"additional_context\"", "hooks/session-start.ps1", errors);
  validateTextIncludes(psHook, "CURSOR_PLUGIN_ROOT", "hooks/session-start.ps1", errors);
  validateTextIncludes(psHook, "CLAUDE_PLUGIN_ROOT", "hooks/session-start.ps1", errors);

  const cmdHook = await readFile(path.join(repoRoot, "hooks", "run-hook.cmd"), "utf8");
  validateTextIncludes(cmdHook, "%HOOK_NAME%.ps1", "hooks/run-hook.cmd", errors);
  validateTextIncludes(cmdHook, "powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File", "hooks/run-hook.cmd", errors);
  validateTextIncludes(cmdHook, "bash \"%SCRIPT_DIR%%HOOK_NAME%\"", "hooks/run-hook.cmd", errors);
  validateTextIncludes(cmdHook, "sh \"%SCRIPT_DIR%%HOOK_NAME%\"", "hooks/run-hook.cmd", errors);
}

async function validateWeaponStructure(repoRoot, errors) {
  const skillsRoot = path.join(repoRoot, "skills");
  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const weapons = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name !== ENTRY_SKILL && name !== ORCHESTRATION_SKILL)
    .sort();

  if (weapons.length === 0) {
    errors.push("skills/ contains no weapon directories");
    return;
  }

  for (const weapon of weapons) {
    const label = `skills/${weapon}/SKILL.md`;
    const skillPath = path.join(skillsRoot, weapon, "SKILL.md");

    if (!(await exists(skillPath))) {
      errors.push(`Missing weapon skill file: ${label}`);
      continue;
    }

    const content = await readFile(skillPath, "utf8");

    for (const section of WEAPON_SECTIONS) {
      if (!content.includes(section)) {
        errors.push(`${label} is missing required section '${section}'`);
      }
    }

    if (!CITATION_PATTERN.test(content)) {
      errors.push(`${label} has no inline source citation (expected '——毛泽东' or '——《')`);
    }

    const originPath = path.join(skillsRoot, weapon, "original-texts.md");
    if (!(await exists(originPath))) {
      errors.push(`Missing original-texts.md for weapon: skills/${weapon}/`);
      continue;
    }

    const originContent = await readFile(originPath, "utf8");
    const quoteCount = originContent
      .split(/\r?\n/)
      .filter((line) => QUOTE_LINE_PATTERN.test(line)).length;

    if (quoteCount === 0) {
      errors.push(`skills/${weapon}/original-texts.md contains no quoted original text`);
    }
  }
}

async function validatePersonaLayer(repoRoot, errors) {
  const entrySkillPath = path.join(repoRoot, "skills", ENTRY_SKILL, "SKILL.md");
  if (!(await exists(entrySkillPath))) {
    return;
  }

  const dnaDir = path.join(repoRoot, "skills", ENTRY_SKILL, "dna");
  if (!(await exists(dnaDir))) {
    errors.push(`Missing persona layer directory: skills/${ENTRY_SKILL}/dna`);
    return;
  }

  const actual = (await readdir(dnaDir))
    .filter((name) => name.endsWith(".md"))
    .sort();

  if (actual.length === 0) {
    errors.push(`skills/${ENTRY_SKILL}/dna contains no markdown files`);
    return;
  }

  const content = await readFile(entrySkillPath, "utf8");
  const loadLine = content
    .split(/\r?\n/)
    .find((line) => line.includes("`dna/`") && line.includes("加载"));

  if (!loadLine) {
    return;
  }

  const declared = [...loadLine.matchAll(/`([A-Za-z0-9._-]+\.md)`/g)]
    .map((match) => match[1])
    .filter((name, index, list) => list.indexOf(name) === index)
    .sort();

  for (const name of actual) {
    if (!declared.includes(name)) {
      errors.push(`skills/${ENTRY_SKILL}/dna/${name} is not declared in the entry skill load list`);
    }
  }

  for (const name of declared) {
    if (!actual.includes(name)) {
      errors.push(`entry skill load list declares dna/${name} but the file does not exist`);
    }
  }
}

async function validateQuoteDiscipline(repoRoot, errors) {
  const skillsRoot = path.join(repoRoot, "skills");
  const entries = await readdir(skillsRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const originPath = path.join(skillsRoot, entry.name, "original-texts.md");
    if (!(await exists(originPath))) {
      continue;
    }

    const label = `skills/${entry.name}/original-texts.md`;
    const lines = (await readFile(originPath, "utf8")).split(/\r?\n/);

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith(">")) {
        return;
      }

      const body = trimmed.replace(/^>+\s*/, "");
      if (!body) {
        return;
      }

      if (QUOTE_DISCIPLINE_PREFIXES.some((prefix) => body.startsWith(prefix))) {
        return;
      }

      if (QUOTE_DISCIPLINE_LABEL_PATTERN.test(body)) {
        return;
      }

      errors.push(
        `${label}:${index + 1} blockquote must start with '"' (verbatim quote) or be marked with one of: ${QUOTE_DISCIPLINE_PREFIXES.join(" ")}`,
      );
    });
  }
}

async function collectWeaponFields(repoRoot, errors) {
  const skillsRoot = path.join(repoRoot, "skills");
  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const weapons = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name !== ENTRY_SKILL && name !== ORCHESTRATION_SKILL)
    .sort();

  const fields = new Map();

  for (const weapon of weapons) {
    const skillPath = path.join(skillsRoot, weapon, "SKILL.md");
    if (!(await exists(skillPath))) {
      continue;
    }

    const content = await readFile(skillPath, "utf8");
    const match = content.match(WEAPON_FIELDS_PATTERN);

    if (!match) {
      errors.push(
        `skills/${weapon}/SKILL.md is missing the '**输出字段**：' declaration in 操作规程`,
      );
      continue;
    }

    const tokens = extractFieldTokens(match[1]);
    if (tokens.length === 0) {
      errors.push(`skills/${weapon}/SKILL.md declares '输出字段' but lists no backticked fields`);
      continue;
    }

    fields.set(weapon, tokens);
  }

  return fields;
}

async function validateWorkflowContracts(repoRoot, errors) {
  const weaponFields = await collectWeaponFields(repoRoot, errors);

  const workflowPath = path.join(repoRoot, "skills", ORCHESTRATION_SKILL, "SKILL.md");
  if (!(await exists(workflowPath))) {
    return;
  }

  const label = `skills/${ORCHESTRATION_SKILL}/SKILL.md`;
  const lines = (await readFile(workflowPath, "utf8")).split(/\r?\n/);

  let currentWeapon = null;
  let sawAdopt = false;
  let stepLine = 0;

  const closeStep = () => {
    if (currentWeapon && !sawAdopt) {
      errors.push(`${label}:${stepLine} step '${currentWeapon}' has no '- 采用：' line`);
    }
  };

  lines.forEach((line, index) => {
    const stepMatch = line.match(WORKFLOW_STEP_PATTERN);

    if (stepMatch) {
      closeStep();
      currentWeapon = stepMatch[1];
      sawAdopt = false;
      stepLine = index + 1;

      if (!weaponFields.has(currentWeapon)) {
        errors.push(`${label}:${index + 1} step references unknown weapon '${currentWeapon}'`);
      }
      return;
    }

    if (!currentWeapon) {
      return;
    }

    const expected = weaponFields.get(currentWeapon) ?? [];

    const adoptMatch = line.match(ADOPT_LINE_PATTERN);
    if (adoptMatch) {
      sawAdopt = true;
      for (const token of extractFieldTokens(adoptMatch[1])) {
        if (!expected.includes(token)) {
          errors.push(
            `${label}:${index + 1} step '${currentWeapon}' adopts field '${token}', which is not in that weapon's 输出字段`,
          );
        }
      }
      return;
    }

    const extraMatch = line.match(EXTRA_LINE_PATTERN);
    if (extraMatch) {
      for (const token of extractFieldTokens(extraMatch[1])) {
        if (expected.includes(token)) {
          errors.push(
            `${label}:${index + 1} step '${currentWeapon}' lists '${token}' as 额外补充, but that weapon already outputs it`,
          );
        }
      }
    }
  });

  closeStep();
}

export async function runValidation({ repoRoot, stdout = process.stdout, stderr = process.stderr } = {}) {
  const root = repoRoot ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const errors = [];

  stdout.write("Validating JSON files...\n");
  const jsonObjects = new Map();
  for (const relativePath of REQUIRED_JSON_FILES) {
    const fullPath = path.join(root, relativePath);
    if (!(await exists(fullPath))) {
      errors.push(`Missing JSON file: ${relativePath}`);
      continue;
    }

    const content = await readFile(fullPath, "utf8");
    try {
      jsonObjects.set(relativePath, readJson(content, relativePath));
    } catch (error) {
      errors.push(error.message);
    }
  }

  const packageJson = jsonObjects.get("package.json");
  const marketplaceJson = jsonObjects.get(".claude-plugin/marketplace.json");
  if (packageJson && marketplaceJson) {
    const packageVersion = packageJson.version;
    const marketplaceVersion = marketplaceJson.metadata?.version;
    const pluginVersion = marketplaceJson.plugins?.[0]?.version;

    if (!packageJson.bin?.["jiaoyuan-skill"]) {
      errors.push("package.json is missing bin.jiaoyuan-skill");
    }
    for (const requiredPackageFile of [".nanobot", ".codex", ".opencode", ".openclaw", ".hermes"]) {
      if (!packageJson.files?.includes(requiredPackageFile)) {
        errors.push(`package.json files is missing '${requiredPackageFile}'`);
      }
    }
    if (marketplaceVersion !== packageVersion) {
      errors.push(`Version mismatch: package.json=${packageVersion}, marketplace metadata=${marketplaceVersion}`);
    }
    if (pluginVersion !== packageVersion) {
      errors.push(`Version mismatch: package.json=${packageVersion}, marketplace plugin=${pluginVersion}`);
    }
    if (marketplaceJson.plugins?.[0]?.source !== "./") {
      errors.push("marketplace plugin source must stay './' for GitHub marketplace installs");
    }
  }

  stdout.write("Validating required files...\n");
  for (const relativePath of REQUIRED_FILES) {
    if (!(await exists(path.join(root, relativePath)))) {
      errors.push(`Missing required file: ${relativePath}`);
    }
  }

  stdout.write("Validating frontmatter...\n");
  const frontmatterFiles = [
    ...(await walkFiles(path.join(root, "skills"), (filePath) => path.basename(filePath) === "SKILL.md")),
    ...(await walkFiles(path.join(root, "agents"), (filePath) => filePath.endsWith(".md"))),
    ...(await walkFiles(path.join(root, "commands"), (filePath) => filePath.endsWith(".md"))),
  ];

  for (const filePath of frontmatterFiles) {
    const content = await readFile(filePath, "utf8");
    try {
      parseFrontmatter(content, path.relative(root, filePath));
    } catch (error) {
      errors.push(error.message);
    }
  }

  stdout.write("Validating command coverage...\n");
  for (const command of COMMANDS) {
    const filePath = path.join(root, "commands", `${command}.md`);
    if (!(await exists(filePath))) {
      errors.push(`Missing command file: commands/${command}.md`);
    }
  }

  stdout.write("Validating markdown links...\n");
  for (const relativePath of MARKDOWN_FILES) {
    if (await exists(path.join(root, relativePath))) {
      await validateMarkdownLinks(root, relativePath, errors);
    }
  }

  stdout.write("Validating hook structure...\n");
  await validateHookStructure(root, jsonObjects.get("hooks/hooks.json"), errors);

  stdout.write("Validating weapon structure...\n");
  await validateWeaponStructure(root, errors);

  stdout.write("Validating persona layer manifest...\n");
  await validatePersonaLayer(root, errors);

  stdout.write("Validating quote discipline...\n");
  await validateQuoteDiscipline(root, errors);

  stdout.write("Validating workflow contracts...\n");
  await validateWorkflowContracts(root, errors);

  stdout.write("Validating knowledge base guidance...\n");
  await validateKnowledgeBaseGuidance(root, errors);

  if (errors.length > 0) {
    for (const error of errors) {
      stderr.write(`FAIL: ${error}\n`);
    }

    stderr.write(`Validation FAILED with ${errors.length} error(s).\n`);
    return {
      ok: false,
      errors,
    };
  }

  stdout.write("Validation passed.\n");
  return {
    ok: true,
    errors: [],
  };
}
