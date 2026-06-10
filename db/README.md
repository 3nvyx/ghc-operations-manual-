# Neon Database Setup

Use Neon for interactive app data such as comments, review status, owners, tags, and activity history. Keep the manual content itself in Markdown files.

## 1. Create a Neon Project

1. Go to the Neon Console.
2. Create a new project.
3. Open **Connect** and copy the pooled or standard Postgres connection string.

Use the connection string format Neon provides, similar to:

```env
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require&channel_binding=require"
```

Create a local `.env.local` file and paste your real `DATABASE_URL` there. Do not commit `.env.local`.

## 2. Create Tables

Open the Neon SQL Editor and run the full contents of:

```text
db/schema.sql
```

The schema creates:

- `manual_sections`: one manual section/document, including title, order, review status, owner, and metadata.
- `manual_blocks`: the actual editable text blocks inside a section, ordered as headings, subheadings, paragraphs, lists, quotes, tables, or dividers.
- `manual_comments`: anchored comments for highlighted text.
- `manual_tags`: reusable tags such as Finance, Billing, Needs Source, or SOP.
- `manual_section_tags`: many-to-many tag assignments.
- `manual_activity`: lightweight audit trail for future edits and workflow events.

If you want Neon to become the source of truth for the manual text, render sections by loading `manual_sections` and their ordered `manual_blocks`. If you want Markdown files to stay as the source of truth, use `manual_blocks` later as an import target.

## 3. Run Locally

```bash
npm run dev
```

If `DATABASE_URL` is missing or the table has not been created yet, the app falls back to browser-local comments.
