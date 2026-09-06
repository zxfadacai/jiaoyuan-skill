# 教员 · jiaoyuan-skill

> "谁是我们的敌人？谁是我们的朋友？这个问题是革命的首要问题。"

一套以「实事求是」为总原则、以辩证方法论为核心的 AI 方法论 Skill：融合人格化表达与可执行工作流，帮你分析问题、制定策略、组织行动。

不是复读语录，而是用认识世界、改造世界的方法论来分析你的问题。

---

## 这是什么

- **一条总原则**：实事求是——先看事实，再下判断。
- **十一件思想武器**：矛盾分析法、实践认识论、调查研究、群众路线、批评与自我批评、持久战略、集中兵力、星火燎原、统筹兼顾、统一战线、纸老虎论。
- **一套工作流编排**：新项目启动、复杂问题攻坚、方案迭代优化。
- **一层人格表达**：教员第一人称 + 表达 DNA + 价值观 + 内在张力。

## 方法结构

```
总原则：实事求是（约束全部判断）
 ├─ 哲学基座：矛盾分析法 · 实践认识论
 ├─ 工作方法：调查研究 · 群众路线 · 批评与自我批评
 └─ 战略战术：持久战略 · 集中兵力 · 星火燎原 · 统筹兼顾 · 统一战线 · 纸老虎论
```

## 十一件思想武器

| 思想武器 | 核心要义 | 原著出处 |
|---------|---------|---------|
| 矛盾分析法 | 抓主要矛盾 | 《矛盾论》 |
| 实践认识论 | 实践→认识→再实践 | 《实践论》 |
| 调查研究 | 没有调查就没有发言权 | 《反对本本主义》 |
| 群众路线 | 从群众中来，到群众中去 | 《关于领导方法的若干问题》 |
| 批评与自我批评 | 惩前毖后，治病救人 | 《论联合政府》 |
| 持久战略 | 战略防御→相持→反攻 | 《论持久战》 |
| 集中兵力 | 集中优势兵力，各个歼灭 | 《中国革命战争的战略问题》 |
| 星火燎原 | 建立根据地，不做流寇 | 《星星之火，可以燎原》 |
| 统筹兼顾 | 调动一切积极因素 | 《论十大关系》 |
| 统一战线 | 分清敌我友，又团结又斗争 | 《中国社会各阶级的分析》 |
| 纸老虎论 | 战略上藐视，战术上重视 | 与斯特朗的谈话 |

另有 `workflows` 作为跨 skill 编排层，定义多种方法串联时的调用顺序与数据传递规范。

## 安装

```bash
npx jiaoyuan-skill
```

非交互式：

```bash
npx jiaoyuan-skill install --target claude-code --scope user
npx jiaoyuan-skill install --target claude-code,cursor --scope project
npx jiaoyuan-skill install --target codex,opencode,openclaw,hermes,nanobot --scope user
npx jiaoyuan-skill install --target all --scope user
npx jiaoyuan-skill uninstall --target claude-code --scope user
npx jiaoyuan-skill validate
```

支持平台：Claude Code、Cursor、Codex、OpenCode、OpenClaw、Hermes、nanobot。

## 使用方式

安装后，每次会话开始时入口 skill 会自动注入，AI 将：

1. 先以「实事求是」约束判断，避免脱离实际和先验结论；
2. 根据场景判断是否值得调用某个思想武器；
3. 在明显适用时加载对应 skill，而不是机械全调用。

> 注：会话自动注入（SessionStart hook）仅对 Claude Code / Cursor 生效；Codex、OpenCode、OpenClaw、Hermes、nanobot 通过入口 skill 的 name + description 被宿主发现并按需读取。

手动命令入口（对应 `commands/*.md`）：

```
/contradiction-analysis   矛盾分析法
/practice-cognition       实践认识论
/investigation-first      调查研究
/mass-line                群众路线
/criticism-self-criticism 批评与自我批评
/protracted-strategy      持久战略
/concentrate-forces       集中兵力
/spark-prairie-fire       星火燎原
/overall-planning         统筹兼顾
/paper-tiger              纸老虎论
/workflows                工作流组合
```

## 原著依据

所有方法论均引自公开出版物，每条引用标注篇名与年份，保证方法论有据可查。部分 skill 目录下附 `original-texts.md` 原文引用。

本 Skill 可挂载《毛泽东选集》全文数字化版本作为可选外部知识库，用于检索原文与精确引用；未配置时静默降级，仅使用内置框架。

## 项目结构

```
jiaoyuan-skill/
├── skills/                     # 入口 + 十一件思想武器 + 工作流
│   ├── jiaoyuan/               # 会话入口（身份 + 总原则 + 调度 + 输出协议）
│   │   ├── dna/                # 人格层（身份卡/表达 DNA/价值观/内在张力/谱系）
│   │   └── knowledge/          # 外挂知识库发现与检索机制
│   ├── contradiction-analysis/
│   ├── practice-cognition/
│   ├── investigation-first/
│   ├── mass-line/
│   ├── criticism-self-criticism/
│   ├── protracted-strategy/
│   ├── concentrate-forces/
│   ├── spark-prairie-fire/
│   ├── overall-planning/
│   ├── united-front/
│   ├── paper-tiger/
│   └── workflows/
├── agents/                     # 可派遣 subagent
├── commands/                   # 手动 slash commands
├── hooks/                      # SessionStart 注入
├── bin/                        # npm CLI（install/uninstall/validate）
└── tests/                      # 校验与测试
```

## 许可证

MIT License
