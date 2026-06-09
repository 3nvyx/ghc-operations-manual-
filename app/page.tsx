"use client";

import * as React from "react";
import { DocumentSidebar, FileNode } from "@/components/document-sidebar";
import { Editor, ManualSection } from "@/components/editor";
import { Button } from "@/components/ui/button";
import { markdownToHtml } from "@/lib/markdown";
import { 
  Menu, Share2, Sun, Moon, Check
} from "lucide-react";

function formatFileTitle(filePath: string) {
  if (!filePath) return "No section selected";
  const parts = filePath.split("/");
  const filename = parts[parts.length - 1];
  return filename
    .replace(/\.md$/, "")
    .replace(/^SOP-\d+-/, "")
    .replace(/^\d+-/, "")
    .replace(/-/g, " ");
}

function getSectionId(filePath: string) {
  return `manual-section-${filePath.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function flattenFiles(nodes: FileNode[]): FileNode[] {
  return nodes.flatMap((node) => {
    if (node.type === "file") return [node];
    return flattenFiles(node.children || []);
  });
}

export default function Home() {
  const [tree, setTree] = React.useState<FileNode[]>([]);
  const [activeFilePath, setActiveFilePath] = React.useState("");
  const [sections, setSections] = React.useState<ManualSection[]>([]);
  const [isLoadingManual, setIsLoadingManual] = React.useState(true);
  
  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [theme, setTheme] = React.useState<"light" | "dark">(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });
  const [copied, setCopied] = React.useState(false);

  const handleToggleTheme = () => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    const nextTheme = theme === "dark" ? "light" : "dark";
    root.classList.add(nextTheme);
    setTheme(nextTheme);
  };

  React.useEffect(() => {
    let isCurrent = true;

    fetch("/api/files")
      .then((res) => res.json())
      .then(async (data) => {
        if (!data.tree) return;

        const files = flattenFiles(data.tree);
        const manualSections = await Promise.all(
          files.map(async (file) => {
            const contentRes = await fetch(`/api/files?path=${encodeURIComponent(file.path)}`);
            const contentData = await contentRes.json();

            return {
              path: file.path,
              title: formatFileTitle(file.path),
              html: markdownToHtml(contentData.content || ""),
            };
          })
        );

        if (!isCurrent) return;

        setTree(data.tree);
        setSections(manualSections);
        if (files[0]) {
          setActiveFilePath(files[0].path);
        }
      })
      .catch((e) => {
        console.error("Failed to load manual", e);
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoadingManual(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const handleShareLink = () => {
    const sectionUrl = activeFilePath
      ? `${window.location.origin}${window.location.pathname}#${getSectionId(activeFilePath)}`
      : window.location.href;

    navigator.clipboard.writeText(sectionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectFile = (filePath: string) => {
    setActiveFilePath(filePath);
    document.getElementById(getSectionId(filePath))?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="flex h-screen w-screen bg-white dark:bg-zinc-950 overflow-hidden font-sans select-none">
      
      {/* Collapsible Directory Sidebar */}
      {isSidebarOpen && (
        <DocumentSidebar
          tree={tree}
          activeFilePath={activeFilePath}
          onSelectFile={handleSelectFile}
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
              {formatFileTitle(activeFilePath)}
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
          {isLoadingManual || sections.length > 0 ? (
            <Editor
              sections={sections}
              activeFilePath={activeFilePath}
              isLoading={isLoadingManual}
              onActiveSectionChange={setActiveFilePath}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-400 dark:text-zinc-600 text-xs">
              No manual sections found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
