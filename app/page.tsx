"use client";

import * as React from "react";
import { DocumentSidebar, FileNode } from "@/components/document-sidebar";
import { Editor, EditorHandle, ManualSection } from "@/components/editor";
import { Button } from "@/components/ui/button";
import { 
  Bold, Check, Heading2, List, Menu, Moon, Pencil, Plus, Redo2, Share2, Sun, Trash2, Undo2
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

export default function Home() {
  const editorRef = React.useRef<EditorHandle>(null);
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
  const [isEditing, setIsEditing] = React.useState(true);

  const reloadManual = async () => {
    const res = await fetch("/api/manual");
    const data = await res.json();
    if (data.tree && data.sections) {
      setTree(data.tree);
      setSections(data.sections);
    }
    return data as { sections?: ManualSection[] };
  };

  const handleToggleTheme = () => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    const nextTheme = theme === "dark" ? "light" : "dark";
    root.classList.add(nextTheme);
    setTheme(nextTheme);
  };

  React.useEffect(() => {
    let isCurrent = true;

    fetch("/api/manual")
      .then((res) => res.json())
      .then((data) => {
        if (!data.tree || !data.sections) return;
        if (!isCurrent) return;

        setTree(data.tree);
        setSections(data.sections);
        if (data.sections[0]) {
          setActiveFilePath(data.sections[0].path);
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

  const handleSaveSection = async (section: { path: string; title: string; html: string }) => {
    const response = await fetch("/api/manual", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(section),
    });

    if (!response.ok) {
      throw new Error("Failed to save section");
    }

    const data = await response.json();
    const savedSection = data.section || section;

    setSections((currentSections) =>
      currentSections.map((currentSection) =>
        currentSection.path === section.path
          ? {
              ...currentSection,
              title: savedSection.title || section.title,
              html: savedSection.html || section.html,
            }
          : currentSection
      )
    );
  };

  const handleAddSection = async () => {
    const title = window.prompt("New section title");
    if (!title?.trim()) return;

    const response = await fetch("/api/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error("Failed to add section");
    }

    const data = await response.json();
    const manualData = await reloadManual();
    const newPath = data.section?.path || manualData.sections?.at(-1)?.path;

    if (newPath) {
      setActiveFilePath(newPath);
      requestAnimationFrame(() => {
        document.getElementById(getSectionId(newPath))?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  };

  const handleDeleteSection = async () => {
    const section = sections.find((manualSection) => manualSection.path === activeFilePath);
    if (!section) return;

    const shouldDelete = window.confirm(`Delete "${section.title}"? This cannot be undone.`);
    if (!shouldDelete) return;

    const currentIndex = sections.findIndex((manualSection) => manualSection.path === section.path);
    const nextSection = sections[currentIndex + 1] || sections[currentIndex - 1] || null;
    editorRef.current?.cancelAutosave(section.path);

    const response = await fetch("/api/manual", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: section.path }),
    });

    if (!response.ok) {
      throw new Error("Failed to delete section");
    }

    const manualData = await reloadManual();
    const nextPath =
      nextSection?.path && manualData.sections?.some((manualSection) => manualSection.path === nextSection.path)
        ? nextSection.path
        : manualData.sections?.[0]?.path || "";

    setActiveFilePath(nextPath);
    if (nextPath) {
      requestAnimationFrame(() => {
        document.getElementById(getSectionId(nextPath))?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  };

  const handleToggleEditing = () => {
    const nextEditing = !isEditing;
    setIsEditing(nextEditing);
    editorRef.current?.setEditing(nextEditing);
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
            <Button
              variant={isEditing ? "secondary" : "ghost"}
              size="sm"
              onClick={handleToggleEditing}
              className="cursor-pointer"
              title="Toggle editing"
            >
              <Pencil className="w-3.5 h-3.5" />
              {isEditing ? "Editing" : "Edit"}
            </Button>
            <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-800" />
            <Button
              variant="ghost"
              size="icon"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editorRef.current?.undo()}
              className="cursor-pointer text-zinc-600 dark:text-zinc-400"
              title="Undo"
            >
              <Undo2 className="w-4.5 h-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editorRef.current?.redo()}
              className="cursor-pointer text-zinc-600 dark:text-zinc-400"
              title="Redo"
            >
              <Redo2 className="w-4.5 h-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editorRef.current?.formatBold()}
              className="cursor-pointer text-zinc-600 dark:text-zinc-400"
              title="Bold"
            >
              <Bold className="w-4.5 h-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editorRef.current?.formatHeader()}
              className="cursor-pointer text-zinc-600 dark:text-zinc-400"
              title="Header"
            >
              <Heading2 className="w-4.5 h-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editorRef.current?.formatBulletList()}
              className="cursor-pointer text-zinc-600 dark:text-zinc-400"
              title="Bullet list"
            >
              <List className="w-4.5 h-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAddSection}
              className="cursor-pointer text-zinc-600 dark:text-zinc-400"
              title="Add section"
            >
              <Plus className="w-4.5 h-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDeleteSection}
              disabled={!activeFilePath}
              className="cursor-pointer text-zinc-600 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:text-destructive"
              title="Delete current section"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </Button>
            <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-800" />
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
              ref={editorRef}
              sections={sections}
              activeFilePath={activeFilePath}
              isLoading={isLoadingManual}
              onActiveSectionChange={setActiveFilePath}
              onSaveSection={handleSaveSection}
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
