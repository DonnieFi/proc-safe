# AGENTS.md - @openclaw/proc-safe

## Purpose

`@openclaw/proc-safe` provides typed process identity, inspection, supervision,
and service-manager primitives. Process identity, parentage, handles, and
authenticated service-manager connections are security-sensitive contracts.

## Repository

- GitHub: `https://github.com/openclaw/proc-safe`
- npm: `https://www.npmjs.com/package/@openclaw/proc-safe`
- Docs: [`docs/`](docs/)
- Default branch: `main`
- Runtime: Node.js `>=22`
- Package manager: `pnpm`; use the version declared in `package.json`
- Human contribution guide: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Security policy: [`SECURITY.md`](SECURITY.md)

Edit `AGENTS.md` directly; do not add `CLAUDE.md` aliases.
Shared maintainer skills live in `openclaw/agent-skills`; do not vendor copies
into this repository unless a repo-specific snapshot is intentionally required.

## Security Boundaries

- Report facts, not application policy. Do not add retries, shell fallbacks, service markers, or admission rules.
- A proven missing process is null. Denial, malformed layouts, incomplete observations, and unavailable bindings throw typed errors.
- Never weaken PID-reuse checks, birth precision, boot-time brackets, handle ownership, or peer authentication.
- Keep each capability in its own TypeScript subpath and Rust module; imports never load native code.
- Public APIs name capabilities, never raw syscalls, pointers, or HANDLEs.
- Test real OS boundaries on the main thread and in worker_threads Workers.
- Native-owned resources close through their native owners, with idempotent disposal.

## Public Package Contract

- Keep exports, generated declarations, README examples, and docs aligned.
- Treat exported types, error codes, option defaults, and package subpaths as
  compatibility surfaces.
- Keep `CHANGELOG.md` focused on users: features, behavior fixes, security
  hardening, compatibility or migration requirements, and measured performance
  or package-size improvements. Add pending entries under `Unreleased`.
- Omit maintenance-only work: internal refactors, deduplication, file/type moves,
  dependency refreshes, and routine tests or CI changes unless they deliver a
  specific user-visible outcome.
- Keep entries concise and group related outcomes. Do not list every PR or add
  generic cleanup entries that only say behavior is unchanged. Keep implementation
  and validation details in the PR.
- Never commit generated `dist/` output.
- Releases are tag-driven from `main` through
  `.github/workflows/release.yml`; never publish locally or add npm tokens.

## Commands

Use repository scripts rather than invoking underlying tools directly:

```bash
pnpm build
pnpm test
pnpm check
pnpm pack:check
```

Run the smallest relevant test while iterating. Run `pnpm check` and
`git diff --check` before handoff.

## Change Rules

- Keep one logical concern per change.
- Use conventional commit and pull request titles.
- Do not edit dependency lockfiles by hand.
- Never commit credentials, private paths, private hosts, or unredacted logs.
- Run the shared `autoreview` skill before shipping non-trivial changes.
