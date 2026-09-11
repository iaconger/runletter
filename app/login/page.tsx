import { AuthForm } from "@/components/auth/AuthForm";
export const metadata = { title: "Sign in" };
export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { sent, error, next, role, as } = await searchParams;
  // A sign-in link from /studio or /creators carries the creator role; otherwise infer it from where they were headed.
  const inferred = next?.startsWith("/studio") ? "creator" : undefined;
  return <AuthForm mode="signin" sent={sent} error={error} next={next} role={role ?? as ?? inferred} />;
}
