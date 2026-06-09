"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  Folder, FolderOpen, FileText, ChevronDown, ChevronRight, 
  Search, Bird
} from "lucide-react";

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

interface DocumentSidebarProps {
  tree: FileNode[];
  activeFilePath: string;
  onSelectFile: (filePath: string) => void;
  onNewFile: () => void;
}

export function DocumentSidebar({
  tree,
  activeFilePath,
  onSelectFile,
}: DocumentSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [expandedPaths, setExpandedPaths] = React.useState<Record<string, boolean>>({
    "00-START-HERE": true,
    "01-OPERATIONS-MANUAL": true,
    "02-SOPS": true,
  });

  const toggleFolder = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPaths((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const formatName = (name: string) => {
    return name
      .replace(/\.md$/, "")
      .replace(/^SOP-\d+-/, "")
      .replace(/^\d+-/, "")
      .replace(/-/g, " ");
  };

  const expandParentFolders = (filePath: string) => {
    const folderParts = filePath.split("/").slice(0, -1);
    if (folderParts.length === 0) return;

    setExpandedPaths((prev) => {
      const next = { ...prev };
      let currentPath = "";

      for (const part of folderParts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        next[currentPath] = true;
      }

      return next;
    });
  };

  const handleSelectFile = (filePath: string) => {
    expandParentFolders(filePath);
    onSelectFile(filePath);
  };

  const filteredTree = React.useMemo(() => {
    // Filter tree recursively
    const filterTree = (nodes: FileNode[], query: string): FileNode[] => {
    if (!query) return nodes;
    
    return nodes
      .map((node) => {
        if (node.type === "file") {
          const nameMatches = node.name.toLowerCase().includes(query.toLowerCase());
          return nameMatches ? node : null;
        }
        
        const filteredChildren = filterTree(node.children || [], query);
        const nameMatches = node.name.toLowerCase().includes(query.toLowerCase());

        if (filteredChildren.length > 0 || nameMatches) {
          return {
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : node.children,
          };
        }

        return null;
      })
      .filter((node): node is FileNode => node !== null);
    };

    return filterTree(tree, searchQuery);
  }, [tree, searchQuery]);

  // Recursive tree renderer
  const renderTreeNodes = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => {
      const isDirectory = node.type === "directory";
      const isExpanded = searchQuery ? true : !!expandedPaths[node.path];
      const isActive = node.path === activeFilePath;

      if (isDirectory) {
        return (
          <div key={node.path} className="flex flex-col">
            <button
              onClick={(e) => toggleFolder(node.path, e)}
              style={{ paddingLeft: `${level * 12 + 8}px` }}
              className="w-full flex items-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-lg hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40 text-zinc-700 dark:text-zinc-350 cursor-pointer text-left select-none"
            >
              <span className="shrink-0 text-zinc-400">
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </span>
              <span className="shrink-0 text-zinc-500 dark:text-zinc-450">
                {isExpanded ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
              </span>
              <span className="truncate">{formatName(node.name)}</span>
            </button>
            
            {isExpanded && node.children && (
              <div className="flex flex-col mt-0.5">
                {renderTreeNodes(node.children, level + 1)}
              </div>
            )}
          </div>
        );
      }

      return (
        <button
          key={node.path}
          onClick={() => handleSelectFile(node.path)}
          aria-current={isActive ? "location" : undefined}
          style={{ paddingLeft: `${level * 12 + 24}px` }}
          className={`w-full flex items-center gap-2 py-1.5 px-3 text-xs rounded-lg cursor-pointer text-left select-none transition-all ${
            isActive
              ? "bg-primary/10 text-primary font-semibold"
              : "hover:bg-zinc-200/30 dark:hover:bg-zinc-800/30 text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium"
          }`}
        >
          <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-primary" : "text-zinc-450"}`} />
          <span className="truncate">{formatName(node.name)}</span>
        </button>
      );
    });
  };

  return (
    <aside className="w-64 flex min-h-0 flex-col h-full overflow-hidden bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 text-zinc-805 dark:text-zinc-200 shrink-0 select-none">
      
      {/* Sidebar Header */}
      <div className="p-4 flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-850 shrink-0">
        <div className="flex items-center gap-2 text-zinc-850 dark:text-white">
          <Bird className="w-5 h-5 text-primary shrink-0 animate-fade-in" />
        </div>
      </div>

      {/* Sidebar Title */}
      <div className="px-4 pt-4 pb-1 shrink-0 text-[10px] text-zinc-400 font-bold uppercase tracking-wider select-none">
        Outline
      </div>

      {/* Directory Search */}
      <div className="px-4 py-2 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
          <Input
            placeholder="Search manual files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 bg-zinc-200/40 dark:bg-zinc-800/40 border-0 focus-visible:ring-1 focus-visible:ring-zinc-500/50 text-xs pl-8 pr-3 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-450 rounded-lg shadow-inner"
          />
        </div>
      </div>

      {/* Directory Tree Scroll */}
      <ScrollArea className="min-h-0 flex-1 px-2 mb-2 scrollbar-thin">
        <div className="space-y-1 pr-1.5">
          {filteredTree.length === 0 ? (
            <div className="text-center py-12 text-xs text-zinc-400 dark:text-zinc-500 font-medium">
              No matching files found
            </div>
          ) : (
            renderTreeNodes(filteredTree)
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
