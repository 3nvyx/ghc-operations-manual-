import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { htmlToMarkdown, markdownToHtml } from "@/lib/markdown";

interface SectionRow {
  path: string;
  title: string;
  sort_order: number;
  status: string;
}

interface BlockRow {
  section_path: string;
  sort_order: number;
  markdown: string;
}

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "new-section";
}

function getBlockType(block: string) {
  const trimmed = block.trim();
  if (/^#\s+/.test(trimmed)) return "heading";
  if (/^#{2,6}\s+/.test(trimmed)) return "subheading";
  if (/^>\s+/.test(trimmed)) return "quote";
  if (/^(-|\*|\+|\d+\.)\s+/m.test(trimmed)) return "list";
  if (/^\|.*\|$/m.test(trimmed)) return "table";
  if (/^---+$/.test(trimmed)) return "divider";
  return "paragraph";
}

function stripMarkdown(markdown: string) {
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

function parseBlocks(markdown: string) {
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

function sortTree(nodes: FileNode[]) {
  nodes.sort((a, b) => {
    if (a.type === "directory" && b.type === "file") return -1;
    if (a.type === "file" && b.type === "directory") return 1;
    return a.name.localeCompare(b.name);
  });

  for (const node of nodes) {
    if (node.children) sortTree(node.children);
  }

  return nodes;
}

function buildTree(paths: string[]) {
  const root: FileNode[] = [];

  for (const filePath of paths) {
    const parts = filePath.split("/");
    let currentLevel = root;
    let currentPath = "";

    for (const [index, part] of parts.entries()) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = index === parts.length - 1;
      let node = currentLevel.find((item) => item.path === currentPath);

      if (!node) {
        node = {
          name: part,
          path: currentPath,
          type: isFile ? "file" : "directory",
          children: isFile ? undefined : [],
        };
        currentLevel.push(node);
      }

      if (!isFile) {
        node.children ??= [];
        currentLevel = node.children;
      }
    }
  }

  return sortTree(root);
}

export async function GET() {
  try {
    const sql = getSql();
    const sectionRows = (await sql`
      SELECT path, title, sort_order, status
      FROM manual_sections
      ORDER BY sort_order ASC, path ASC
    `) as SectionRow[];

    const blockRows = (await sql`
      SELECT section_path, sort_order, markdown
      FROM manual_blocks
      ORDER BY section_path ASC, sort_order ASC
    `) as BlockRow[];

    const blocksBySection = new Map<string, BlockRow[]>();

    for (const block of blockRows) {
      const blocks = blocksBySection.get(block.section_path) || [];
      blocks.push(block);
      blocksBySection.set(block.section_path, blocks);
    }

    const sections = sectionRows.map((section) => {
      const markdown = (blocksBySection.get(section.path) || [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((block) => block.markdown)
        .join("\n\n");

      return {
        path: section.path,
        title: section.title,
        status: section.status,
        html: markdownToHtml(markdown),
      };
    });

    return NextResponse.json({
      tree: buildTree(sectionRows.map((section) => section.path)),
      sections,
    });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = String(body.title || "New Section").trim();
    const sql = getSql();
    const countRows = (await sql`
      SELECT count(*)::int AS count
      FROM manual_sections
    `) as { count: number }[];
    const sortOrder = countRows[0].count + 1;
    const path = `12-NEW-SECTIONS/${String(sortOrder).padStart(2, "0")}-${slugify(title)}.md`;
    const markdown = "**(Work in progress)**\n\nStart drafting this section here.";
    const blocks = parseBlocks(markdown);

    await sql`
      INSERT INTO manual_sections (path, title, sort_order, status)
      VALUES (${path}, ${title}, ${sortOrder}, 'work_in_progress')
    `;

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
          ${path},
          ${block.sortOrder},
          ${block.blockType},
          ${block.plainText},
          ${block.markdown}
        )
      `;
    }

    return NextResponse.json({
      section: {
        path,
        title,
        status: "work_in_progress",
        html: markdownToHtml(markdown),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const path = String(body.path || "");
    const title = String(body.title || "").trim();
    const html = String(body.html || "");

    if (!path || !title) {
      return NextResponse.json(
        { error: "Section path and title are required" },
        { status: 400 }
      );
    }

    const sql = getSql();
    const markdown = htmlToMarkdown(html);
    const blocks = parseBlocks(markdown || " ");

    await sql`
      UPDATE manual_sections
      SET title = ${title}, status = 'needs_review'
      WHERE path = ${path}
    `;

    await sql`DELETE FROM manual_blocks WHERE section_path = ${path}`;

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
          ${path},
          ${block.sortOrder},
          ${block.blockType},
          ${block.plainText},
          ${block.markdown}
        )
      `;
    }

    return NextResponse.json({
      success: true,
      section: {
        path,
        title,
        status: "needs_review",
        html: markdownToHtml(markdown),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const path = String(body.path || "");

    if (!path) {
      return NextResponse.json(
        { error: "Section path is required" },
        { status: 400 }
      );
    }

    const sql = getSql();
    const deletedRows = (await sql`
      DELETE FROM manual_sections
      WHERE path = ${path}
      RETURNING path
    `) as { path: string }[];

    if (deletedRows.length === 0) {
      return NextResponse.json(
        { error: "Section was not found" },
        { status: 404 }
      );
    }

    await sql`DELETE FROM manual_comments WHERE section_path = ${path}`;

    return NextResponse.json({
      success: true,
      deletedPath: path,
    });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
