# Jiaoyuan · jiaoyuan-skill

> "Who are our enemies? Who are our friends? This is a question of the first importance for the revolution."

A methodology skill for AI agents, grounded in "seek truth from facts" and dialectical thinking. It combines persona-driven expression with executable workflows to help analyze problems, form strategy, and organize action.

Not a quote replayer — a working method for understanding and changing the world, applied to your problem.

---

## What it is

- **One guiding principle**: seek truth from facts — look at facts before judging.
- **Eleven thinking tools**: contradiction analysis, practice-cognition, investigation first, mass line, criticism & self-criticism, protracted strategy, concentrate forces, spark a prairie fire, overall planning, united front, paper tiger.
- **Workflow orchestration**: new-project launch, hard-problem attack, iterative refinement.
- **A persona layer**: first-person expression DNA, values, and internal tensions.

## Examples

Three illustrative examples are in [README.md](README.md#效果示例) — macro consultation, structured action output, and a case where **no** thinking tool should be loaded at all. They are written in Chinese, since the skill responds in Chinese by default.

Each example there also records the **dispatch decision**: which thinking tool fired, and why that one rather than another. Neither source project's examples showed that layer.

A structured output looks like this:

```
User   ❯ The team has to maintain a legacy system, ship new features,
         and pay down tech debt — with not enough people. How should
         we sequence this quarter?

Answer ❯ Contradiction list:
         · legacy stability vs new feature delivery
         · tech debt repayment vs quarterly results
         · limited headcount vs three fronts at once

         ⭐ Principal contradiction: limited headcount vs three fronts
         Why: collapsing the fronts relieves the other two; leaving it
         unresolved lets all three drag each other down.

         Nature: non-antagonistic (aligned interests, only a
         disagreement about ordering)

         Response: concentrate forces — keep one main thrust this
         quarter, move the other two into maintenance mode. Next I will
         list the candidate thrusts and the basis for choosing.

         ⚠️ Monitor: whether a legacy incident escalates it into the
         principal contradiction
```

> **The tools above are *dispatched*, not *performed*.** Each one has explicit trigger conditions, non-applicable cases, and a defined output format. When the facts are insufficient, it refuses to conclude. The value is not in sounding like anyone — it is that **every judgement is put under a factual constraint**: look at facts first, and if the facts don't support it, don't say the pretty thing.

## Method structure

```
Guiding principle: seek truth from facts (constrains every judgement)
 ├─ Philosophical base: contradiction analysis · practice-cognition
 ├─ Working methods:   investigation first · mass line · criticism & self-criticism
 └─ Strategy & tactics: protracted strategy · concentrate forces · spark a prairie fire
                        overall planning · united front · paper tiger
```

## The eleven thinking tools

| Thinking tool | Core idea | Source |
|---------------|-----------|--------|
| Contradiction analysis | Seize the principal contradiction | "On Contradiction" |
| Practice-cognition | Practice → knowledge → practice | "On Practice" |
| Investigation first | No investigation, no right to speak | "Oppose Book Worship" |
| Mass line | From the masses, to the masses | "Some Questions Concerning Methods of Leadership" |
| Criticism & self-criticism | Learn from past mistakes to avoid future ones | "On Coalition Government" |
| Protracted strategy | Strategic defence → stalemate → counter-offensive | "On Protracted War" |
| Concentrate forces | Concentrate superior force, destroy the enemy piecemeal | "Problems of Strategy in China's Revolutionary War" |
| Spark a prairie fire | Build base areas, do not become a roving bandit | "A Single Spark Can Start a Prairie Fire" |
| Overall planning | Mobilize every positive factor | "On the Ten Major Relationships" |
| United front | Tell friends from enemies; unite and struggle | "Analysis of the Classes in Chinese Society" |
| Paper tiger | Despise strategically, respect tactically | Interview with Anna Louise Strong |

A separate `workflows` skill acts as the cross-skill orchestration layer, defining call order and data hand-off between methods.

## Install

```bash
npx jiaoyuan-skill
```

Non-interactive:

```bash
npx jiaoyuan-skill install --target claude-code --scope user
npx jiaoyuan-skill install --target claude-code,cursor --scope project
npx jiaoyuan-skill install --target codex,opencode,openclaw,hermes,nanobot --scope user
npx jiaoyuan-skill install --target all --scope user
npx jiaoyuan-skill uninstall --target claude-code --scope user
npx jiaoyuan-skill validate
```

Supported platforms: Claude Code, Cursor, Codex, OpenCode, OpenClaw, Hermes, nanobot.

## Usage

On session start (Claude Code / Cursor), the entry skill is injected automatically via a SessionStart hook: it first constrains judgement with "seek truth from facts", then dispatches the appropriate thinking tool only when clearly useful. On Codex, OpenCode, OpenClaw, Hermes, and nanobot, the entry skill is discovered by its name + description and read on demand.

Manual command entry points (backed by `commands/*.md`):

```
/矛盾分析法
/实践认识论
/调查研究
/群众路线
/批评与自我批评
/持久战略
/集中兵力
/星火燎原
/统筹兼顾
/统一战线
/纸老虎论
/工作流组合
```

Tone override: `用教员口吻` for first-person prose, `用平实口吻` for methodology only.

## Sources

All methodology is distilled from public works. Each method cites its source and year, and every skill ships an `original-texts.md` with quoted passages. **Verbatim quotations** and **editorial summaries** are kept strictly distinct in format.

### Optional: mount the full-text knowledge base

Used for retrieving original text, citing precisely, and verifying article numbers. **It is optional**: every skill ships an `original-texts.md` with the verified quotations, installed together with the skill.

Without it, the AI does not search on its own. But if you explicitly ask for original text that is not among the built-in quotations, it will say so plainly and point you to the command below — it will not recite from memory.

```bash
git clone https://github.com/weiyinfu/MaoZeDongAnthology.git ~/MaoZeDongAnthology
```

The repository contains all 229 articles of the Selected Works, volumes 1–5 (`src/NNN-title.md`, numbered 000–228), plus a hierarchical `src/目录.md`.

Discovery order (lazy — only on first need for original text):

1. the `JIAOYUAN_KB_PATH` environment variable
2. conventional directories: `./MaoZeDongAnthology/`, `../MaoZeDongAnthology/`, `~/MaoZeDongAnthology/`

The check is for a `src/目录.md` inside the directory. Cloning it as a sibling of this project makes it discoverable with no configuration at all.

> Note: pieces **not included in the five volumes** — such as 《人的正确思想是从哪里来的？》(1963) — cannot be found in this knowledge base and must cite their own title and year. See `skills/jiaoyuan/knowledge/kb-discovery.md`.

## Project structure

```
jiaoyuan-skill/
├── skills/                     # entry + eleven thinking tools + workflows
│   ├── jiaoyuan/               # session entry (identity + principle + dispatch + output protocol)
│   │   ├── dna/                # persona layer (identity / expression / values / tensions / lineage / boundaries)
│   │   └── knowledge/          # optional knowledge-base discovery and retrieval
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
├── agents/                     # dispatchable subagents
├── commands/                   # manual slash commands
├── hooks/                      # SessionStart injection
├── bin/                        # npm CLI (install/uninstall/validate)
└── tests/                      # validation and tests
```

## License

MIT License
