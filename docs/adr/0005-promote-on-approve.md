# ADR 0005: Promote-on-approve data model

**Status:** Accepted

## Context

Extraction produces an `Item` per span, carrying a `section`
(`work_log | task | note | list`) and a JSONB `fields` blob. Items are
provisional — they sit `pending` until the user reviews them. But the product
surfaces (Work log, Tasks, Notes, Lists) each need a clean, queryable,
typed shape to render and mutate, not a bag of JSON.

## Decision

On **approval**, promote the `Item` into a first-class row for its section:

- `work_log` → `WorkLogEntry`
- `task` → `Task`
- `note` → `Note`
- `list` → `List` (+ ordered `ListItem` children)

Each target table has a unique `item_id` back to the originating `Item`, so the
provenance is kept and promotion is idempotent per item. Promotion reads
`item.fields`, falling back to `span_text` when a field is absent. The
`review_item` endpoint dispatches to a small `_create_<section>` helper.
