-- GHC Operations Manual Neon schema
-- Run this file in the Neon SQL Editor.

CREATE TABLE IF NOT EXISTS manual_sections (
  path text PRIMARY KEY,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'work_in_progress',
  owner_name text,
  review_notes text,
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT manual_sections_status_check CHECK (
    status IN ('work_in_progress', 'needs_review', 'approved', 'archived')
  )
);

CREATE TABLE IF NOT EXISTS manual_blocks (
  id text PRIMARY KEY,
  section_path text NOT NULL REFERENCES manual_sections(path) ON DELETE CASCADE,
  sort_order integer NOT NULL,
  block_type text NOT NULL,
  plain_text text NOT NULL DEFAULT '',
  markdown text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT manual_blocks_type_check CHECK (
    block_type IN ('heading', 'subheading', 'paragraph', 'list', 'quote', 'table', 'divider')
  )
);

CREATE TABLE IF NOT EXISTS manual_comments (
  id text PRIMARY KEY,
  note text NOT NULL,
  quote text NOT NULL,
  section_path text NOT NULL,
  section_title text NOT NULL,
  start_offset integer NOT NULL,
  end_offset integer NOT NULL,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT manual_comments_offsets_check CHECK (end_offset >= start_offset)
);

CREATE TABLE IF NOT EXISTS manual_tags (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  color text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS manual_section_tags (
  section_path text NOT NULL REFERENCES manual_sections(path) ON DELETE CASCADE,
  tag_id text NOT NULL REFERENCES manual_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (section_path, tag_id)
);

CREATE TABLE IF NOT EXISTS manual_activity (
  id text PRIMARY KEY,
  section_path text REFERENCES manual_sections(path) ON DELETE SET NULL,
  action text NOT NULL,
  actor_name text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS manual_sections_status_idx
  ON manual_sections (status);

CREATE INDEX IF NOT EXISTS manual_sections_updated_at_idx
  ON manual_sections (updated_at DESC);

CREATE INDEX IF NOT EXISTS manual_blocks_section_order_idx
  ON manual_blocks (section_path, sort_order);

CREATE INDEX IF NOT EXISTS manual_blocks_type_idx
  ON manual_blocks (block_type);

CREATE INDEX IF NOT EXISTS manual_comments_section_path_idx
  ON manual_comments (section_path);

CREATE INDEX IF NOT EXISTS manual_comments_created_at_idx
  ON manual_comments (created_at DESC);

CREATE INDEX IF NOT EXISTS manual_comments_unresolved_idx
  ON manual_comments (section_path, created_at DESC)
  WHERE is_resolved = false;

CREATE INDEX IF NOT EXISTS manual_activity_section_path_idx
  ON manual_activity (section_path, created_at DESC);

CREATE OR REPLACE FUNCTION set_manual_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS manual_sections_set_updated_at ON manual_sections;
CREATE TRIGGER manual_sections_set_updated_at
BEFORE UPDATE ON manual_sections
FOR EACH ROW
EXECUTE FUNCTION set_manual_updated_at();

DROP TRIGGER IF EXISTS manual_comments_set_updated_at ON manual_comments;
CREATE TRIGGER manual_comments_set_updated_at
BEFORE UPDATE ON manual_comments
FOR EACH ROW
EXECUTE FUNCTION set_manual_updated_at();

DROP TRIGGER IF EXISTS manual_blocks_set_updated_at ON manual_blocks;
CREATE TRIGGER manual_blocks_set_updated_at
BEFORE UPDATE ON manual_blocks
FOR EACH ROW
EXECUTE FUNCTION set_manual_updated_at();
