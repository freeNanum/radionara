# AGENTS.md
This document defines how coding agents should operate in this repository.
It is generated from current repository state and must be updated as tooling is added.

## 1) Repository Snapshot
- Root path: `/mnt/d/WORK4/radionara`
- Current state: empty directory (no files detected)
- Existing `AGENTS.md` before creation: none found
- Cursor rules (`.cursor/rules/` or `.cursorrules`): none found
- Copilot rules (`.github/copilot-instructions.md`): none found
- Runtime/package manager/test/lint tool: not detectable yet
- Agents must not assume Node/Python/Go/Rust/etc. until config files exist

## 2) Command Policy (Build/Lint/Test)
Because the repository is empty, there are no confirmed runnable commands.
Use the discovery process below before running anything.

### 2.1 Discovery Order
1. JavaScript/TypeScript
   - `package.json`
   - lockfiles: `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, `bun.lockb`
2. Python
   - `pyproject.toml`, `poetry.lock`, `requirements.txt`, `Pipfile`
3. Go
   - `go.mod`
4. Rust
   - `Cargo.toml`
5. Java/Kotlin
   - `pom.xml`, `build.gradle`, `build.gradle.kts`
6. Generic runners
   - `Makefile`, `justfile`, CI workflows, task runner configs

If none are present, report exactly:
"No runnable build/lint/test commands are configured yet."

### 2.2 Confirmed Commands (Current)
- Build: not configured
- Lint: not configured
- Test: not configured
- Single-test execution: not configured

### 2.3 Single-Test Requirement
When a test framework is introduced, document and use the exact single-test command.
Reference examples only (do not run until matching framework exists):
- Vitest: `vitest path/to/file.test.ts -t "test name"`
- Jest: `jest path/to/file.test.ts -t "test name"`
- Pytest: `pytest tests/test_file.py::test_case_name`
- Go: `go test ./pkg/name -run TestCaseName`
- Rust: `cargo test test_name`

## 3) Execution Rules for Agents
1. Do not invent repository scripts.
2. Do not add dependencies unless task scope requires it.
3. Prefer the smallest viable change.
4. Validate with project-native tools when available.
5. If tooling is missing, validate via static review and state assumptions.

## 4) Code Style Baseline (Greenfield)
Use this baseline until project-specific conventions appear.

### 4.1 Imports and Modules
- Group imports in stable order:
  1) standard library, 2) third-party, 3) internal modules.
- Remove unused imports.
- Prefer explicit named imports over wildcard imports.
- Use aliases only if repository config defines them.

### 4.2 Formatting
- Use formatter defaults of the selected ecosystem.
- Keep lines readable (target around 100 chars unless tool says otherwise).
- Keep functions focused and cohesive.
- Avoid unrelated formatting churn.

### 4.3 Types and Interfaces
- Use explicit types on public interfaces and exported APIs.
- Keep internal annotations pragmatic (clarity over verbosity).
- Never suppress type checks (`as any`, ignore directives, unchecked casts).
- Model domain concepts with dedicated types, not loose maps.

### 4.4 Naming
- Name by intent, not by temporary implementation detail.
- Follow language-conventional casing:
  - `camelCase` for variables/functions where idiomatic
  - `PascalCase` for classes/types/components
  - `UPPER_SNAKE_CASE` for constants
- Prefer full words over ambiguous abbreviations.

### 4.5 Error Handling
- Fail fast with actionable messages.
- Never use empty catch blocks.
- Preserve root-cause context when wrapping/rethrowing.
- Return structured errors at service/API boundaries.

### 4.6 Testing
- Choose one consistent test placement strategy (colocated or dedicated tree).
- Keep tests deterministic (control time/network/randomness).
- Cover happy paths and key failure paths.
- For bug fixes, add or adjust a reproducing test when framework exists.

## 5) Provisional Layout
Until a real layout is established:
- Source: `src/`
- Tests: `tests/` or colocated `*.test.*`
- Utility scripts: `scripts/`
- Documentation: `docs/`

If the project adopts a different structure, update this file immediately.

## 6) Git and Change Hygiene
- Keep changes atomic and reviewable.
- Do not mix refactors with bug fixes unless requested.
- Preserve unrelated local modifications.
- Avoid committing generated noise unless required.
- Commit only when explicitly requested by the user.

## 7) Agent Checklist
Before editing:
1. Scan for config/rule files.
2. Confirm real commands from source-of-truth files.
3. Identify the nearest existing pattern.

During editing:
1. Keep scope aligned to request.
2. Avoid speculative architecture changes.
3. Update docs if behavior or commands change.

After editing:
1. Run lint/tests/build when configured.
2. Prefer single-test execution for targeted checks.
3. Report what was run and pass/fail outcomes.

## 8) Cursor/Copilot Rule Integration
Status at creation time:
- `.cursor/rules/`: not present
- `.cursorrules`: not present
- `.github/copilot-instructions.md`: not present

If these files are added later, agents must:
1. Treat them as higher-priority instruction sources.
2. Merge relevant constraints into this file.
3. Add a short "Last synchronized" note with date.

## 9) Maintenance
This file is strict because repository scaffolding is not present yet.
When the first real stack lands, update in this order:
1. Confirmed build/lint/test/single-test commands
2. Language-specific style rules
3. Project layout and naming conventions
4. Cursor/Copilot rule integration status

End of file.
