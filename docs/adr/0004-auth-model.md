# ADR 0004: Authentication and per-user scoping

**Status:** Accepted

## Context

Blurt is a single-tenant-per-user product: every recording, item, task, note
and list belongs to one user, and no user may see another's data. We needed
authentication and an access-control rule simple enough to apply uniformly
across every route.

## Decision

- **Passwords**: hashed with `bcrypt` directly (`bcrypt.hashpw` /
  `bcrypt.checkpw`), not via passlib.
- **Sessions**: stateless **JWT**, HS256, signed with `JWT_SECRET`; the token
  carries the user id and an expiry. The frontend stores it in `localStorage`
  under `blurt_token` and sends it as a `Bearer` header.
- **Injection**: routes take
  `CurrentUserId = Annotated[uuid.UUID, Depends(get_current_user_id)]`. An
  invalid or expired token is a 401.
- **Scoping rule**: every query filters by `user_id`. A request for a row that
  exists but belongs to another user returns **404, not 403** — the API does
  not reveal that the row exists.

## Consequences

- No server-side session store; any API replica can verify a token with the
  shared secret.
- The 404-on-cross-user rule is a convention every router must follow by hand;
  it is covered by per-feature "scoped to the user" tests rather than enforced
  by a single chokepoint.
- `JWT_SECRET` is security-critical. Its default (`dev-secret-change-in-production`)
  is for local only and must be overridden in the cluster Secret.
- Deferred: passkeys, forgot-password, remember-me, and full account deletion
  (only per-recording delete exists today).
