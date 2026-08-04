# Maintainers

## Active maintainers

| Name / handle | Role | Scope |
| ------------- | ---- | ----- |
| Softlyft (`@softlyft`) | Project maintainer (BDFL) | Protocol direction, releases, final ADR/RFC decisions |

Update this table when maintainership changes.

## Responsibilities

- Review pull requests in a timely manner
- Keep the reference client and reference relay buildable
- Ensure RFCs/ADRs stay consistent with shipped behavior
- Triage security reports per `SECURITY.md`
- Cut releases and communicate breaking protocol changes

## Review expectations

- At least one maintainer approval for code that affects protocol, crypto, or relay security
- Documentation and non-security fixes may be merged by a maintainer after self-review when appropriate
- Protocol changes require an RFC (or an explicit ADR) before merge when they change wire behavior

## Release process

1. Ensure `pnpm typecheck`, `pnpm lint`, `pnpm test:coverage`, and smoke scripts pass
2. Update changelog / release notes (GitHub Releases)
3. Tag the release
4. Deploy reference hosting only after packages build cleanly (see `docs/deploy.md`)
