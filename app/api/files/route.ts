import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const WORKSPACE_DIR = path.join(process.cwd(), "manual");

// Directories to ignore when scanning for manual sections
const IGNORE_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  "app",
  "components",
  "hooks",
  "lib",
  "public",
  "scripts",
  ".gemini",
]);

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

// Recursively traverse directory to build GHC Operations Manual folder tree
function buildFileTree(dirPath: string, relativePath = ""): FileNode[] {
  const items = fs.readdirSync(dirPath);
  const nodes: FileNode[] = [];

  // Sort directories first, then files alphabetically
  const sortedItems = items.sort((a, b) => {
    const aPath = path.join(dirPath, a);
    const bPath = path.join(dirPath, b);
    const aIsDir = fs.statSync(aPath).isDirectory();
    const bIsDir = fs.statSync(bPath).isDirectory();
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.localeCompare(b);
  });

  for (const item of sortedItems) {
    if (IGNORE_DIRS.has(item)) continue;

    const fullPath = path.join(dirPath, item);
    const itemRelativePath = relativePath ? `${relativePath}/${item}` : item;
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const children = buildFileTree(fullPath, itemRelativePath);
      // Only include directory if it's not empty
      if (children.length > 0) {
        nodes.push({
          name: item,
          path: itemRelativePath,
          type: "directory",
          children,
        });
      }
    } else if (item.endsWith(".md")) {
      nodes.push({
        name: item,
        path: itemRelativePath,
        type: "file",
      });
    }
  }

  return nodes;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filePathParam = searchParams.get("path");

  // Read single file content
  if (filePathParam) {
    try {
      const fullPath = path.join(WORKSPACE_DIR, filePathParam);
      
      // Prevent directory traversal attacks
      if (!fullPath.startsWith(WORKSPACE_DIR)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      if (!fs.existsSync(fullPath)) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      const content = fs.readFileSync(fullPath, "utf8");
      return NextResponse.json({ content });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // Scan workspace to list directory structure
  try {
    const tree = buildFileTree(WORKSPACE_DIR);
    return NextResponse.json({ tree });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { path: relativePath, content } = body;

    if (!relativePath) {
      return NextResponse.json({ error: "Path parameter required" }, { status: 400 });
    }

    const fullPath = path.join(WORKSPACE_DIR, relativePath);

    // Prevent directory traversal attacks
    if (!fullPath.startsWith(WORKSPACE_DIR)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Write file back to disk
    fs.writeFileSync(fullPath, content || "", "utf8");
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { path: relativePath } = body;

    if (!relativePath) {
      return NextResponse.json({ error: "Path parameter required" }, { status: 400 });
    }

    const fullPath = path.join(WORKSPACE_DIR, relativePath);

    // Prevent directory traversal attacks
    if (!fullPath.startsWith(WORKSPACE_DIR)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      if (stat.isFile()) {
        fs.unlinkSync(fullPath);
      }
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
