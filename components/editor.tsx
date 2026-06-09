"use client";

import * as React from "react";
import { MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ManualSection {
  path: string;
  title: string;
  html: string;
}

interface EditorProps {
  sections: ManualSection[];
  activeFilePath: string;
  isLoading: boolean;
  onActiveSectionChange: (filePath: string) => void;
}

interface ManualComment {
  id: string;
  note: string;
  quote: string;
  sectionPath: string;
  sectionTitle: string;
  startOffset: number;
  endOffset: number;
  createdAt: string;
}

interface PendingSelection {
  x: number;
  y: number;
  anchorX: number;
  anchorY: number;
  quote: string;
  sectionPath: string;
  sectionTitle: string;
  startOffset: number;
  endOffset: number;
}

interface AnchoredComment extends ManualComment {
  x: number;
  y: number;
}

const COMMENTS_STORAGE_KEY = "ghc-manual-comments-v1";

function getSectionId(filePath: string) {
  return `manual-section-${filePath.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function stripDuplicateTitle(html: string, title: string) {
  const normalizedTitle = title.trim().toLowerCase();
  const headingMatch = html.match(/^\s*<h1>(.*?)<\/h1>/i);
  if (!headingMatch) return html;

  const headingText = headingMatch[1]
    .replace(/<[^>]+>/g, "")
    .trim()
    .toLowerCase();

  if (headingText !== normalizedTitle) return html;
  return html.slice(headingMatch[0].length).trimStart();
}

function getTextOffset(root: HTMLElement, node: Node, offset: number) {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(node, offset);
  return range.toString().length;
}

function createRangeFromOffsets(root: HTMLElement, startOffset: number, endOffset: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let currentOffset = 0;
  let hasStart = false;
  let node = walker.nextNode();

  while (node) {
    const textLength = node.textContent?.length || 0;
    const nextOffset = currentOffset + textLength;

    if (!hasStart && startOffset >= currentOffset && startOffset <= nextOffset) {
      range.setStart(node, startOffset - currentOffset);
      hasStart = true;
    }

    if (hasStart && endOffset >= currentOffset && endOffset <= nextOffset) {
      range.setEnd(node, endOffset - currentOffset);
      return range;
    }

    currentOffset = nextOffset;
    node = walker.nextNode();
  }

  return null;
}

function loadStoredComments() {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(COMMENTS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function Editor({
  sections,
  activeFilePath,
  isLoading,
  onActiveSectionChange,
}: EditorProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const latestActivePath = React.useRef(activeFilePath);
  const [comments, setComments] = React.useState<ManualComment[]>(loadStoredComments);
  const [anchoredComments, setAnchoredComments] = React.useState<AnchoredComment[]>([]);
  const [pendingSelection, setPendingSelection] = React.useState<PendingSelection | null>(null);
  const [isComposingComment, setIsComposingComment] = React.useState(false);
  const [commentDraft, setCommentDraft] = React.useState("");

  React.useEffect(() => {
    window.localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(comments));
  }, [comments]);

  React.useEffect(() => {
    latestActivePath.current = activeFilePath;
  }, [activeFilePath]);

  React.useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let animationFrame = 0;

    const updateCommentAnchors = () => {
      const containerRect = scrollContainer.getBoundingClientRect();
      const documentRect = scrollContainer
        .querySelector<HTMLElement>(".manual-document")
        ?.getBoundingClientRect();

      if (!documentRect) {
        setAnchoredComments([]);
        return;
      }

      const nextAnchors = comments
        .map((comment) => {
          const section = document.getElementById(getSectionId(comment.sectionPath));
          const prose = section?.querySelector<HTMLElement>(".manual-prose");
          if (!prose) return null;

          const range = createRangeFromOffsets(prose, comment.startOffset, comment.endOffset);
          if (!range) return null;

          const rangeRect = range.getBoundingClientRect();
          const isVisible =
            rangeRect.bottom > containerRect.top + 48 &&
            rangeRect.top < containerRect.bottom - 24;

          if (!isVisible) return null;

          const preferredX = documentRect.right + 24;
          const x = Math.min(
            Math.max(preferredX, containerRect.left + 16),
            containerRect.right - 304
          );
          const y = Math.min(
            Math.max(rangeRect.top - 8, containerRect.top + 12),
            containerRect.bottom - 124
          );

          return {
            ...comment,
            x,
            y,
          };
        })
        .filter((comment): comment is AnchoredComment => comment !== null)
        .sort((a, b) => a.y - b.y)
        .reduce<AnchoredComment[]>((positionedComments, comment) => {
          const previous = positionedComments[positionedComments.length - 1];
          const minY = previous ? previous.y + 108 : comment.y;

          positionedComments.push({
            ...comment,
            y: Math.max(comment.y, minY),
          });

          return positionedComments;
        }, []);

      setAnchoredComments(nextAnchors);
    };

    const requestUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateCommentAnchors);
    };

    requestUpdate();
    scrollContainer.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      scrollContainer.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [comments, sections]);

  React.useEffect(() => {
    if (typeof CSS === "undefined" || !("highlights" in CSS) || !("Highlight" in window)) {
      return;
    }

    const highlightRanges = comments
      .map((comment) => {
        const section = document.getElementById(getSectionId(comment.sectionPath));
        const prose = section?.querySelector<HTMLElement>(".manual-prose");
        if (!prose) return null;
        return createRangeFromOffsets(prose, comment.startOffset, comment.endOffset);
      })
      .filter((range): range is Range => range !== null);

    CSS.highlights.delete("manual-comments");

    if (highlightRanges.length > 0) {
      const HighlightConstructor = window.Highlight as new (...ranges: Range[]) => Highlight;
      CSS.highlights.set("manual-comments", new HighlightConstructor(...highlightRanges));
    }

    return () => {
      CSS.highlights.delete("manual-comments");
    };
  }, [comments, sections]);

  React.useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || sections.length === 0) return;

    let animationFrame = 0;

    const updateActiveSection = () => {
      const containerTop = scrollContainer.getBoundingClientRect().top;
      const sectionPositions = sections
        .map((section) => {
          const element = document.getElementById(getSectionId(section.path));
          if (!element) return null;

          return {
            path: section.path,
            top: element.getBoundingClientRect().top - containerTop,
          };
        })
        .filter((section): section is { path: string; top: number } => section !== null);

      const readingLine = scrollContainer.clientHeight * 0.24;
      const currentSection =
        sectionPositions
          .filter((section) => section.top <= readingLine)
          .sort((a, b) => b.top - a.top)[0] || sectionPositions[0];

      if (currentSection && currentSection.path !== latestActivePath.current) {
        latestActivePath.current = currentSection.path;
        onActiveSectionChange(currentSection.path);
      }
    };

    const requestUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateActiveSection);
    };

    requestUpdate();
    scrollContainer.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      scrollContainer.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [sections, onActiveSectionChange]);

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const target = event.target instanceof Element ? event.target : null;
    const prose = target?.closest<HTMLElement>(".manual-prose");
    const section = prose?.closest<HTMLElement>("[data-section-path]");
    const selectedText = range.toString();

    if (!prose || !section || !selectedText.trim()) return;
    if (!prose.contains(range.commonAncestorContainer)) return;

    event.preventDefault();

    const sectionPath = section.dataset.sectionPath || "";
    const sectionTitle =
      sections.find((manualSection) => manualSection.path === sectionPath)?.title || "Comment";
    const rangeRect = range.getBoundingClientRect();
    const scrollContainerRect = scrollRef.current?.getBoundingClientRect();
    const documentRect = scrollRef.current
      ?.querySelector<HTMLElement>(".manual-document")
      ?.getBoundingClientRect();
    const preferredX = (documentRect?.right || rangeRect.right) + 24;
    const maxX = (scrollContainerRect?.right || window.innerWidth) - 304;
    const anchorX = Math.min(Math.max(preferredX, 16), maxX);
    const anchorY = Math.min(
      Math.max(rangeRect.top - 8, (scrollContainerRect?.top || 0) + 12),
      (scrollContainerRect?.bottom || window.innerHeight) - 220
    );

    setPendingSelection({
      x: event.clientX,
      y: event.clientY,
      anchorX,
      anchorY,
      quote: selectedText.trim(),
      sectionPath,
      sectionTitle,
      startOffset: getTextOffset(prose, range.startContainer, range.startOffset),
      endOffset: getTextOffset(prose, range.endContainer, range.endOffset),
    });
    setIsComposingComment(false);
    setCommentDraft("");
  };

  const saveComment = () => {
    if (!pendingSelection || !commentDraft.trim()) return;

    setComments((currentComments) => [
      ...currentComments,
      {
        id: crypto.randomUUID(),
        note: commentDraft.trim(),
        quote: pendingSelection.quote,
        sectionPath: pendingSelection.sectionPath,
        sectionTitle: pendingSelection.sectionTitle,
        startOffset: pendingSelection.startOffset,
        endOffset: pendingSelection.endOffset,
        createdAt: new Date().toISOString(),
      },
    ]);
    setPendingSelection(null);
    setIsComposingComment(false);
    setCommentDraft("");
    window.getSelection()?.removeAllRanges();
  };

  const deleteComment = (commentId: string) => {
    setComments((currentComments) =>
      currentComments.filter((comment) => comment.id !== commentId)
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 h-full w-full bg-white dark:bg-zinc-950 p-8 sm:p-12 overflow-hidden">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          <div className="h-7 w-2/3 rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          <div className="space-y-3">
            <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
            <div className="h-4 w-11/12 rounded bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
            <div className="h-4 w-4/5 rounded bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onContextMenu={handleContextMenu}
      onClick={() => setPendingSelection(null)}
      className="manual-scroll flex-1 h-full w-full bg-white dark:bg-zinc-950 overflow-y-auto overflow-x-hidden relative select-text scroll-smooth"
    >
      <article className="manual-document mx-auto max-w-2xl px-8 py-10 sm:px-12 sm:py-14">
        {sections.map((section, index) => {
          const isActive = section.path === activeFilePath;

          return (
            <section
              key={section.path}
              id={getSectionId(section.path)}
              data-section-path={section.path}
              aria-current={isActive ? "location" : undefined}
              className={`manual-section scroll-mt-10 transition-colors duration-200 ${
                index === 0 ? "" : "border-t border-zinc-200/70 pt-10 mt-12 dark:border-zinc-800/80"
              }`}
            >
              <div className="mb-5 flex items-start justify-between gap-5">
                <div>
                  <h1
                    className={`text-[1.7rem] font-bold leading-tight tracking-[-0.02em] text-wrap-balance ${
                      isActive
                        ? "text-primary"
                        : "text-zinc-950 dark:text-zinc-50"
                    }`}
                  >
                    {section.title}
                  </h1>
                </div>
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full transition-colors ${
                    isActive
                      ? "bg-primary"
                      : "bg-zinc-200 dark:bg-zinc-800"
                  }`}
                  aria-hidden="true"
                />
              </div>

              <div
                className="manual-prose"
                dangerouslySetInnerHTML={{
                  __html: stripDuplicateTitle(section.html, section.title),
                }}
              />
            </section>
          );
        })}
      </article>

      {pendingSelection && (
        <div
          className={`fixed z-50 w-72 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 ${
            isComposingComment ? "p-3" : "p-2"
          }`}
          style={{
            left: isComposingComment
              ? pendingSelection.anchorX
              : Math.min(pendingSelection.x, window.innerWidth - 304),
            top: isComposingComment
              ? pendingSelection.anchorY
              : Math.min(pendingSelection.y, window.innerHeight - 64),
          }}
          onClick={(event) => event.stopPropagation()}
        >
          {isComposingComment ? (
            <div>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate">{pendingSelection.sectionTitle}</span>
                  </div>
                  <p className="line-clamp-2 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                    &ldquo;{pendingSelection.quote}&rdquo;
                  </p>
                </div>
              </div>
              <textarea
                id="manual-comment-draft"
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                placeholder="Write a comment..."
                className="min-h-24 w-full resize-none rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-950"
                autoFocus
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setPendingSelection(null);
                    setIsComposingComment(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="button" size="xs" onClick={saveComment}>
                  Comment
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => setIsComposingComment(true)}
            >
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              Add comment
            </button>
          )}
        </div>
      )}

      {anchoredComments.map((comment) => (
        <aside
          key={comment.id}
          className="fixed z-40 hidden w-72 rounded-lg border border-zinc-200 bg-white/95 p-3 text-sm text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-100 lg:block"
          style={{ left: comment.x, top: comment.y }}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{comment.sectionTitle}</span>
              </div>
              <p className="line-clamp-2 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                &ldquo;{comment.quote}&rdquo;
              </p>
            </div>
            <button
              type="button"
              onClick={() => deleteComment(comment.id)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              aria-label="Delete comment"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          <p className="text-xs leading-relaxed">{comment.note}</p>
        </aside>
      ))}

      <style jsx global>{`
        ::highlight(manual-comments) {
          background: color-mix(in oklch, var(--primary), transparent 72%);
          color: inherit;
        }

        .manual-document {
          font-family: var(--font-sans), sans-serif;
        }

        .manual-prose {
          color: var(--foreground);
          font-size: 0.875rem;
          line-height: 1.65;
          text-wrap: pretty;
        }

        .manual-prose p {
          margin: 0 0 0.65rem;
        }

        .manual-prose h1 {
          font-size: 1.45rem;
          font-weight: 700;
          line-height: 1.22;
          letter-spacing: -0.018em;
          margin: 1.25rem 0 0.55rem;
          text-wrap: balance;
        }

        .manual-prose h2 {
          font-size: 1.22rem;
          font-weight: 650;
          line-height: 1.28;
          letter-spacing: -0.012em;
          margin: 1.05rem 0 0.45rem;
          text-wrap: balance;
        }

        .manual-prose h3 {
          font-size: 1.05rem;
          font-weight: 650;
          line-height: 1.35;
          margin: 0.9rem 0 0.35rem;
        }

        .manual-prose ul,
        .manual-prose ol {
          padding-left: 1.25rem;
          margin: 0.55rem 0 0.75rem;
        }

        .manual-prose ul {
          list-style: disc;
        }

        .manual-prose ol {
          list-style: decimal;
        }

        .manual-prose li {
          margin: 0.25rem 0;
        }

        .manual-prose a {
          color: var(--primary);
          text-decoration: underline;
          text-underline-offset: 0.18em;
        }

        .manual-prose blockquote {
          border-left: 1px solid var(--border);
          color: var(--muted-foreground);
          margin: 0.85rem 0;
          padding-left: 0.85rem;
        }

        .manual-prose hr {
          border: 0;
          border-top: 1px solid var(--border);
          margin: 1.25rem 0;
        }

        .manual-prose table {
          border-collapse: collapse;
          display: block;
          margin: 1rem 0;
          max-width: 100%;
          overflow-x: auto;
          width: max-content;
        }

        .manual-prose th,
        .manual-prose td {
          border: 1px solid var(--border);
          padding: 0.45rem 0.6rem;
          text-align: left;
          vertical-align: top;
        }

        .manual-prose th {
          background: var(--muted);
          font-weight: 650;
        }

        @media (prefers-reduced-motion: reduce) {
          .manual-scroll {
            scroll-behavior: auto;
          }

          .manual-section,
          .manual-section * {
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
