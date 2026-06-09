"use client";

import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";

// Keep custom text styles extension to handle font styling elegantly
const CustomTextStyle = TextStyle.configure().extend({
  addAttributes() {
    return {
      fontFamily: {
        default: null,
        parseHTML: (element) => element.style.fontFamily,
        renderHTML: (attributes) => {
          if (!attributes.fontFamily) return {};
          return { style: `font-family: ${attributes.fontFamily}` };
        },
      },
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize,
        renderHTML: (attributes) => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
    };
  },
});

interface EditorProps {
  content: string;
  onChange: (html: string) => void;
  onEditorReady: (editor: any) => void;
}

export function Editor({
  content,
  onChange,
  onEditorReady,
}: EditorProps) {

  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
        },
      }),
      CustomTextStyle,
      Color,
      Placeholder.configure({
        placeholder: "Empty document.",
      }),
    ],
    content: content,
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-full h-full prose prose-sm dark:prose-invert max-w-none leading-relaxed font-sans",
      },
    },
  });

  // Sync editor instance
  React.useEffect(() => {
    if (editor) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Sync content updates
  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="flex-1 h-full w-full bg-white dark:bg-zinc-950 p-8 sm:p-12 overflow-y-auto relative select-text">
      {/* Editor Mount Area */}
      <div className="max-w-2xl mx-auto min-h-full h-full">
        <EditorContent editor={editor} className="min-h-full h-full" />
      </div>

      {/* Styled ProseMirror CSS overrides for Notepad feel */}
      <style jsx global>{`
        .ProseMirror {
          min-height: 100%;
          font-family: var(--font-sans), sans-serif;
        }
        .ProseMirror p {
          margin-bottom: 0.5rem;
          line-height: 1.6;
          color: inherit;
        }
        .ProseMirror h1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          line-height: 1.2;
          color: inherit;
        }
        .ProseMirror h2 {
          font-size: 1.35rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.4rem;
          line-height: 1.25;
          color: inherit;
        }
        .ProseMirror h3 {
          font-size: 1.15rem;
          font-weight: 650;
          margin-top: 0.5rem;
          margin-bottom: 0.35rem;
          line-height: 1.3;
          color: inherit;
        }
        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .ProseMirror blockquote {
          border-left: 2px solid var(--border);
          padding-left: 0.75rem;
          color: var(--muted-foreground);
          font-style: italic;
          margin: 0.75rem 0;
        }
        .ProseMirror hr {
          border: 0;
          border-top: 1px solid #e4e4e7;
          margin: 1rem 0;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #a1a1aa;
          pointer-events: none;
          height: 0;
        }
        .dark .ProseMirror p.is-editor-empty:first-child::before {
          color: #52525b;
        }
      `}</style>
    </div>
  );
}
