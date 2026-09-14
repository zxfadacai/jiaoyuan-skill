import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { runValidation } from "../bin/lib/validate.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function captureStream() {
  let output = "";
  return {
    stream: {
      write(chunk) {
        output += String(chunk);
      },
    },
    output() {
      return output;
    },
  };
}

test("validate succeeds in a published package without docs directory", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "jiaoyuan-skill-published-"));
  const packageRoot = path.join(tempRoot, "package");
  const stdout = captureStream();
  const stderr = captureStream();

  try {
    await cp(repoRoot, packageRoot, {
      recursive: true,
      filter(source) {
        const relative = path.relative(repoRoot, source);
        return !relative.startsWith(".git")
          && !relative.startsWith("docs")
          && !relative.includes(`${path.sep}node_modules${path.sep}`)
          && !relative.startsWith("tests");
      },
    });

    const result = await runValidation({
      repoRoot: packageRoot,
      stdout: stdout.stream,
      stderr: stderr.stream,
    });

    assert.equal(result.ok, true, stderr.output());
    const readme = await readFile(path.join(packageRoot, "README.md"), "utf8");
    assert.match(readme, /jiaoyuan-skill/);
    assert.doesNotMatch(readme, /HughYau|superpowers/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

async function withBrokenPackage(mutate) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "jiaoyuan-skill-broken-"));
  const packageRoot = path.join(tempRoot, "package");

  await cp(repoRoot, packageRoot, {
    recursive: true,
    filter(source) {
      const relative = path.relative(repoRoot, source);
      return !relative.startsWith(".git")
        && !relative.startsWith("docs")
        && !relative.includes(`${path.sep}node_modules${path.sep}`)
        && !relative.startsWith("tests");
    },
  });

  try {
    await mutate(packageRoot);
    const stdout = captureStream();
    const stderr = captureStream();
    const result = await runValidation({
      repoRoot: packageRoot,
      stdout: stdout.stream,
      stderr: stderr.stream,
    });
    return { result, stderr: stderr.output() };
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

test("validate fails when a weapon is missing a required section", async () => {
  const { result, stderr } = await withBrokenPackage(async (packageRoot) => {
    const target = path.join(packageRoot, "skills", "united-front", "SKILL.md");
    const content = await readFile(target, "utf8");
    await writeFile(target, content.replace("## 与其他 skill 的关系", "## 别的东西"));
  });

  assert.equal(result.ok, false);
  assert.match(stderr, /与其他 skill 的关系/);
});

test("validate fails when a weapon has no inline source citation", async () => {
  const { result, stderr } = await withBrokenPackage(async (packageRoot) => {
    const target = path.join(packageRoot, "skills", "paper-tiger", "SKILL.md");
    const content = await readFile(target, "utf8");
    await writeFile(target, content.replace(/——毛泽东|——《[^"\n]*/g, ""));
  });

  assert.equal(result.ok, false);
  assert.match(stderr, /inline source citation/);
});

test("validate fails when a weapon has no original-texts.md", async () => {
  const { result, stderr } = await withBrokenPackage(async (packageRoot) => {
    await rm(path.join(packageRoot, "skills", "united-front", "original-texts.md"), { force: true });
  });

  assert.equal(result.ok, false);
  assert.match(stderr, /original-texts\.md/);
});

test("validate fails when a persona file is not declared in the entry skill load list", async () => {
  const { result, stderr } = await withBrokenPackage(async (packageRoot) => {
    await writeFile(
      path.join(packageRoot, "skills", "jiaoyuan", "dna", "undeclared.md"),
      "# 未声明的文件\n",
    );
  });

  assert.equal(result.ok, false);
  assert.match(stderr, /undeclared\.md is not declared/);
});

test("validate fails when the entry skill declares a missing persona file", async () => {
  const { result, stderr } = await withBrokenPackage(async (packageRoot) => {
    await rm(path.join(packageRoot, "skills", "jiaoyuan", "dna", "tensions.md"), { force: true });
  });

  assert.equal(result.ok, false);
  assert.match(stderr, /declares dna\/tensions\.md but the file does not exist/);
});

test("validate fails when a blockquote is not a verbatim quote and carries no marker", async () => {
  const { result, stderr } = await withBrokenPackage(async (packageRoot) => {
    const target = path.join(packageRoot, "skills", "united-front", "original-texts.md");
    const content = await readFile(target, "utf8");
    await writeFile(
      target,
      `${content}\n> 毛泽东在这里其实是想说团结比斗争更重要。\n`,
    );
  });

  assert.equal(result.ok, false);
  assert.match(stderr, /blockquote must start with/);
});

test("validate fails when a weapon does not declare its output fields", async () => {
  const { result, stderr } = await withBrokenPackage(async (packageRoot) => {
    const target = path.join(packageRoot, "skills", "paper-tiger", "SKILL.md");
    const content = await readFile(target, "utf8");
    await writeFile(target, content.replace(/^\*\*输出字段\*\*：.*\n/m, ""));
  });

  assert.equal(result.ok, false);
  assert.match(stderr, /missing the '\*\*输出字段\*\*：' declaration/);
});

test("validate fails when a workflow step adopts a field the weapon does not output", async () => {
  const { result, stderr } = await withBrokenPackage(async (packageRoot) => {
    const target = path.join(packageRoot, "skills", "workflows", "SKILL.md");
    const content = await readFile(target, "utf8");
    await writeFile(
      target,
      content.replace(
        "- 采用：`现状是` · `关键约束是` · `我之前不知道但现在知道的是` · `基于以上，我的判断是`",
        "- 采用：`现状是` · `关键约束是` · `凭空捏造的字段` · `基于以上，我的判断是`",
      ),
    );
  });

  assert.equal(result.ok, false);
  assert.match(stderr, /adopts field '凭空捏造的字段'/);
});

test("validate fails when a workflow step references an unknown weapon", async () => {
  const { result, stderr } = await withBrokenPackage(async (packageRoot) => {
    const target = path.join(packageRoot, "skills", "workflows", "SKILL.md");
    const content = await readFile(target, "utf8");
    await writeFile(target, content.replace("**Step 1：investigation-first（调查研究）**", "**Step 1：not-a-real-skill（不存在）**"));
  });

  assert.equal(result.ok, false);
  assert.match(stderr, /references unknown weapon 'not-a-real-skill'/);
});

test("validate fails when 额外补充 duplicates a field the weapon already outputs", async () => {
  const { result, stderr } = await withBrokenPackage(async (packageRoot) => {
    const target = path.join(packageRoot, "skills", "workflows", "SKILL.md");
    const content = await readFile(target, "utf8");
    await writeFile(
      target,
      content.replace("- 额外补充：`主要的未知项是` · `已知的可依托基础是`", "- 额外补充：`现状是` · `主要的未知项是`"),
    );
  });

  assert.equal(result.ok, false);
  assert.match(stderr, /lists '现状是' as 额外补充, but that weapon already outputs it/);
});

test("validate fails when a workflow step has no 采用 line", async () => {
  const { result, stderr } = await withBrokenPackage(async (packageRoot) => {
    const target = path.join(packageRoot, "skills", "workflows", "SKILL.md");
    const content = await readFile(target, "utf8");
    const adopted =
      "- 采用：`当前阶段` · `判断依据` · `本阶段的核心任务` · `本阶段的禁止事项` · `转入下一阶段的条件` · `阶段检查点`";
    assert.ok(content.includes(adopted), "fixture line not found in workflows/SKILL.md");
    await writeFile(target, content.replace(adopted, "- 相关说明：见该武器的操作规程"));
  });

  assert.equal(result.ok, false);
  assert.match(stderr, /has no '- 采用：' line/);
});

test("validate fails when the knowledge base guidance section is missing", async () => {
  const { result, stderr } = await withBrokenPackage(async (packageRoot) => {
    const target = path.join(packageRoot, "skills", "jiaoyuan", "knowledge", "kb-discovery.md");
    const content = await readFile(target, "utf8");
    const heading = "## 知识库不可用时，用户索要原文怎么办";
    assert.ok(content.includes(heading), "fixture heading not found in kb-discovery.md");
    await writeFile(target, content.replace(heading, "## 其他事项"));
  });

  assert.equal(result.ok, false);
  assert.match(stderr, /behaviour when the knowledge base is absent is undefined/);
});

test("validate fails when the platform manifest .codebuddy-plugin/plugin.json is missing", async () => {
  const { result, stderr } = await withBrokenPackage(async (packageRoot) => {
    await rm(path.join(packageRoot, ".codebuddy-plugin", "plugin.json"), { force: true });
  });

  assert.equal(result.ok, false);
  assert.match(stderr, /Missing JSON file: \.codebuddy-plugin\/plugin\.json/);
});

test("validate fails when the root SKILL.md has no block description", async () => {
  const { result, stderr } = await withBrokenPackage(async (packageRoot) => {
    const target = path.join(packageRoot, "SKILL.md");
    const content = await readFile(target, "utf8");
    await writeFile(target, content.replace("description: |", "description: inline text"));
  });

  assert.equal(result.ok, false);
  assert.match(stderr, /Missing block 'description' in frontmatter: SKILL\.md/);
});
