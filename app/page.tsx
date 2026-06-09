"use client";

import * as React from "react";
import { DocumentSidebar, FileNode } from "@/components/document-sidebar";
import { Editor } from "@/components/editor";
import { Button } from "@/components/ui/button";
import { markdownToHtml } from "@/lib/markdown";
import { 
  Menu, Share2, Sun, Moon, Check, Cloud
} from "lucide-react";

export default function Home() {
  const [tree, setTree] = React.useState<FileNode[]>([]);
  const [activeFilePath, setActiveFilePath] = React.useState("");
  const [fileContent, setFileContent] = React.useState("");
  const [editorInstance, setEditorInstance] = React.useState<any>(null);
  
  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const [copied, setCopied] = React.useState(false);

  // Sync initial theme
  React.useEffect(() => {
    const root = window.document.documentElement;
    if (root.classList.contains("dark")) {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  }, []);

  const handleToggleTheme = () => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    const nextTheme = theme === "dark" ? "light" : "dark";
    root.classList.add(nextTheme);
    setTheme(nextTheme);
  };

  // Find first file in nested tree structure recursively
  const findFirstFile = (nodes: FileNode[]): FileNode | null => {
    for (const node of nodes) {
      if (node.type === "file") return node;
      if (node.children) {
        const found = findFirstFile(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  // Fetch file tree from API on mount
  const fetchTree = async (selectDefault = false) => {
    try {
      const res = await fetch("/api/files");
      const data = await res.json();
      if (data.tree) {
        setTree(data.tree);
        
        // Select the first markdown file by default if none is active
        if (selectDefault || !activeFilePath) {
          const first = findFirstFile(data.tree);
          if (first) {
            setActiveFilePath(first.path);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load directory tree", e);
    }
  };

  React.useEffect(() => {
    fetchTree(true);
  }, []);

  // Fetch active file content
  React.useEffect(() => {
    if (!activeFilePath) return;

    const fetchContent = async () => {
      try {
        const res = await fetch(`/api/files?path=${encodeURIComponent(activeFilePath)}`);
        const data = await res.json();
        if (data.content !== undefined) {
          // Convert Markdown to HTML for TipTap Editor
          const html = markdownToHtml(data.content);
          setFileContent(html);
        }
      } catch (e) {
        console.error("Failed to fetch file content", e);
      }
    };

    fetchContent();
  }, [activeFilePath]);

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format active path for title display (e.g. "02-SOPS/Billing/SOP-24-Bill-EOPS.md" -> "Bill Eops")
  const formatActiveTitle = (filePath: string) => {
    if (!filePath) return "No File Selected";
    const parts = filePath.split("/");
    const filename = parts[parts.length - 1];
    return filename
      .replace(/\.md$/, "")
      .replace(/^SOP-\d+-/, "")
      .replace(/^\d+-/, "")
      .replace(/-/g, " ");
  };

  return (
    <div className="flex h-screen w-screen bg-white dark:bg-zinc-950 overflow-hidden font-sans select-none">
      
      {/* Collapsible Directory Sidebar */}
      {isSidebarOpen && (
        <DocumentSidebar
          tree={tree}
          activeFilePath={activeFilePath}
          onSelectFile={setActiveFilePath}
          onNewFile={() => {}}
        />
      )}

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950">
        
        {/* Apple Notes style toolbar header */}
        <header className="h-12 border-b border-zinc-200/60 dark:border-zinc-800/60 px-4 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30 shrink-0">
          
          {/* Left Operations */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="cursor-pointer text-zinc-600 dark:text-zinc-400"
              title="Toggle Sidebar"
            >
              <Menu className="w-4.5 h-4.5" />
            </Button>
            
            {/* Active section title */}
            <span className="text-xs font-semibold text-zinc-850 dark:text-white capitalize ml-1">
              {formatActiveTitle(activeFilePath)}
            </span>
          </div>

          {/* Right Operations */}
          <div className="flex items-center gap-1">
            {/* Dark mode */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleTheme}
              className="cursor-pointer text-zinc-650 dark:text-zinc-400"
              title={theme === "dark" ? "Light Mode" : "Dark Mode"}
            >
              {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </Button>

            {/* Note link copy */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShareLink}
              className="cursor-pointer text-zinc-600 dark:text-zinc-400"
              title="Copy Section Path"
            >
              {copied ? <Check className="w-4.5 h-4.5 text-emerald-500" /> : <Share2 className="w-4.5 h-4.5" />}
            </Button>
          </div>
        </header>

        {/* Triple column document area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Borderless Editor Canvas */}
          {activeFilePath ? (
            <Editor
              content={fileContent}
              onChange={() => {}}
              onEditorReady={setEditorInstance}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-400 dark:text-zinc-600 text-xs">
              Select a section file in the sidebar to begin editing the manual.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
