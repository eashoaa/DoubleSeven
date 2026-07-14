import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm rounded-3xl border border-hairline bg-card p-8">
      <div className="mb-6 text-center">
        <div className="text-lg font-bold tracking-tight text-foreground">
          D7 <span className="font-normal text-muted-foreground">Heaven&apos;s Gate</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to your account</p>
      </div>
      <LoginForm />
    </div>
  );
}
