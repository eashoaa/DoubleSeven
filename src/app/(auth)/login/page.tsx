import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="shadow-card w-full max-w-sm rounded-3xl border border-hairline bg-card p-8">
      <div className="mb-6 text-center">
        <div className="text-2xl font-extrabold tracking-tight text-foreground">Double Seven.</div>
        <div className="text-sm font-bold text-muted-foreground">Heaven&apos;s Gate</div>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to your account</p>
      </div>
      <LoginForm />
    </div>
  );
}
