import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

interface CommentRow {
  id: string;
  note: string;
  quote: string;
  section_path: string;
  section_title: string;
  start_offset: number;
  end_offset: number;
  created_at: string;
}

function toClientComment(row: CommentRow) {
  return {
    id: row.id,
    note: row.note,
    quote: row.quote,
    sectionPath: row.section_path,
    sectionTitle: row.section_title,
    startOffset: row.start_offset,
    endOffset: row.end_offset,
    createdAt: row.created_at,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function GET() {
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT
        id,
        note,
        quote,
        section_path,
        section_title,
        start_offset,
        end_offset,
        created_at
      FROM manual_comments
      ORDER BY created_at ASC
    `) as CommentRow[];

    return NextResponse.json({ comments: rows.map(toClientComment) });
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
    const sql = getSql();

    const rows = (await sql`
      INSERT INTO manual_comments (
        id,
        note,
        quote,
        section_path,
        section_title,
        start_offset,
        end_offset,
        created_at
      )
      VALUES (
        ${body.id},
        ${body.note},
        ${body.quote},
        ${body.sectionPath},
        ${body.sectionTitle},
        ${body.startOffset},
        ${body.endOffset},
        ${body.createdAt}
      )
      RETURNING
        id,
        note,
        quote,
        section_path,
        section_title,
        start_offset,
        end_offset,
        created_at
    `) as CommentRow[];

    return NextResponse.json({ comment: toClientComment(rows[0]) });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Comment id is required" },
        { status: 400 }
      );
    }

    const sql = getSql();
    await sql`DELETE FROM manual_comments WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
