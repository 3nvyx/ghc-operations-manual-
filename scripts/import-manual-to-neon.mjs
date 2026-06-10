import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: ".env.local" });

const manualDir = path.join(process.cwd(), "manual");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || !databaseUrl.startsWith("postgres")) {
  console.error(
    "DATABASE_URL must be a Neon/Postgres connection string that starts with postgresql:// or postgres://"
  );
  process.exit(1);
}

const sql = neon(databaseUrl);

function walkMarkdownFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkMarkdownFiles(fullPath, base);
    if (!entry.isFile() || !entry.name.endsWith(".md")) return [];
    return [path.relative(base, fullPath).split(path.sep).join("/")];
  });
}

function formatTitle(filePath) {
  const filename = path.basename(filePath, ".md");
  return filename
    .replace(/^SOP-\d+-/, "")
    .replace(/^\d+-/, "")
    .replace(/-/g, " ");
}

function getBlockType(block) {
  const trimmed = block.trim();
  if (/^#\s+/.test(trimmed)) return "heading";
  if (/^#{2,6}\s+/.test(trimmed)) return "subheading";
  if (/^>\s+/.test(trimmed)) return "quote";
  if (/^(-|\*|\+|\d+\.)\s+/m.test(trimmed)) return "list";
  if (/^\|.*\|$/m.test(trimmed)) return "table";
  if (/^---+$/.test(trimmed)) return "divider";
  return "paragraph";
}

function stripMarkdown(markdown) {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^(-|\*|\+|\d+\.)\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseBlocks(markdown) {
  return markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => ({
      id: crypto.randomUUID(),
      sortOrder: index + 1,
      blockType: getBlockType(block),
      plainText: stripMarkdown(block),
      markdown: block,
    }));
}

const files = walkMarkdownFiles(manualDir).sort((a, b) => a.localeCompare(b));

for (const [sectionIndex, filePath] of files.entries()) {
  const fullPath = path.join(manualDir, filePath);
  const markdown = fs.readFileSync(fullPath, "utf8");
  const title = formatTitle(filePath);
  const status = markdown.includes("**(Work in progress)**")
    ? "work_in_progress"
    : "needs_review";
  const blocks = parseBlocks(markdown);

  await sql`
    INSERT INTO manual_sections (path, title, sort_order, status)
    VALUES (${filePath}, ${title}, ${sectionIndex + 1}, ${status})
    ON CONFLICT (path) DO UPDATE SET
      title = EXCLUDED.title,
      sort_order = EXCLUDED.sort_order,
      status = EXCLUDED.status
  `;

  await sql`DELETE FROM manual_blocks WHERE section_path = ${filePath}`;

  for (const block of blocks) {
    await sql`
      INSERT INTO manual_blocks (
        id,
        section_path,
        sort_order,
        block_type,
        plain_text,
        markdown
      )
      VALUES (
        ${block.id},
        ${filePath},
        ${block.sortOrder},
        ${block.blockType},
        ${block.plainText},
        ${block.markdown}
      )
    `;
  }

  console.log(`Imported ${filePath} (${blocks.length} blocks)`);
}

console.log(`Imported ${files.length} manual sections into Neon.`);
