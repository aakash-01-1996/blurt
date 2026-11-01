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
