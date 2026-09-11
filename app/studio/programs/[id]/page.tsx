// Program editor. Loads from Supabase (or the example program), hands everything to the client editor.
import { notFound } from "next/navigation";
import { getProgram, getMyProfile } from "@/lib/db/programs";
import { isConfigured } from "@/lib/supabase/server";
import { sampleCreator, sampleProgram } from "@/lib/sample";
import { Editor } from "./Editor";

export const metadata = { title: "Edit program" };
export const dynamic = "force-dynamic";

export default async function ProgramEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === sampleProgram.id) {
    return <Editor program={sampleProgram} creatorName={sampleCreator.displayName} readOnly />;
  }
  if (!isConfigured()) notFound();
  const [program, profile] = await Promise.all([getProgram(id), getMyProfile()]);
  if (!program || !profile || program.creatorId !== profile.id) notFound();
  return <Editor program={program} creatorName={profile.displayName || `@${profile.handle}`} handle={profile.handle} />;
}
