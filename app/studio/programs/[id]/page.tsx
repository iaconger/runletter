// Editor for a Letter or a Plan. Loads from Supabase (or the example), hands everything to the client editor.
import { notFound } from "next/navigation";
import { getProgram, getMyProfile, listIssues, listMyPosts } from "@/lib/db/programs";
import { isConfigured } from "@/lib/supabase/server";
import { sampleCreator, sampleProgram } from "@/lib/sample";
import { toISODate } from "@/lib/types";
import { Editor } from "./Editor";

export const metadata = { title: "Editor" };
export const dynamic = "force-dynamic";

export default async function ProgramEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ week?: string; day?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const open = sp.week && sp.day ? { week: Number(sp.week), day: Number(sp.day) } : undefined;
  const today = toISODate(new Date());
  if (id === sampleProgram.id) {
    return <Editor program={sampleProgram} creatorName={sampleCreator.displayName} today={today} open={open} readOnly />;
  }
  if (!isConfigured()) notFound();
  const [program, profile] = await Promise.all([getProgram(id), getMyProfile()]);
  if (!program || !profile || program.creatorId !== profile.id) notFound();
  const [issues, posts] = await Promise.all([program.isLetter ? listIssues(id) : Promise.resolve([]), listMyPosts(id)]);
  return <Editor program={program} issues={issues} posts={posts} creatorName={profile.displayName || `@${profile.handle}`} handle={profile.handle} userId={profile.id} today={today} open={open} units={profile.units} />;
}
