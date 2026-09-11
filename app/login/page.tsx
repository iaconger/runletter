import { AuthForm } from "@/components/auth/AuthForm";
export const metadata = { title: "Sign in" };
export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { sent, error, next } = await searchParams;
  return <AuthForm mode="signin" sent={sent} error={error} next={next} />;
}
