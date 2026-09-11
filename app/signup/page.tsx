import { AuthForm } from "@/components/auth/AuthForm";
export const metadata = { title: "Create an account" };
export default async function Signup({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { sent, error, next, role, as } = await searchParams;
  return <AuthForm mode="signup" sent={sent} error={error} next={next} role={role ?? as} />;
}
