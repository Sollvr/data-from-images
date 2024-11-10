import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Lock, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Separator } from "@/components/ui/separator";

const authSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

function AuthContent() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { login, register } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    console.log("Auth component mounted");
    setAuthError(null);

    // Check for error in URL params
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error === "google-auth-failed") {
      setAuthError("Google authentication failed. Please try again.");
    }
  }, []);

  const form = useForm({
    resolver: zodResolver(authSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof authSchema>) => {
    setAuthError(null);
    console.log("Attempting authentication...");
    setIsLoading(true);
    try {
      const result = await (isLogin
        ? login.username(data.username, data.password)
        : register(data.username, data.password));

      if (result.ok) {
        console.log("Authentication successful, redirecting...");
        setLocation("/app");
      } else {
        console.error("Authentication failed:", result.message);
        setAuthError(result.message);
      }
    } catch (error: any) {
      console.error("Unexpected error during authentication:", error);
      setAuthError(error?.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = "/auth/google";
  };

  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen p-6">
      <Card className="w-full max-w-md p-6 space-y-6">
        <h1 className="text-2xl font-bold text-center">
          {isLogin ? "Welcome Back" : "Create Account"}
        </h1>

        {authError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Username"
                {...form.register("username")}
                className="pl-9"
                disabled={isLoading}
              />
            </div>
            {form.formState.errors.username && (
              <p className="text-sm text-destructive">
                {form.formState.errors.username.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password"
                {...form.register("password")}
                className="pl-9"
                disabled={isLoading}
              />
            </div>
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isLogin ? "Sign In" : "Sign Up"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          type="button"
          disabled={isLoading}
          className="w-full"
          onClick={handleGoogleLogin}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="text-center">
          <Button
            variant="link"
            onClick={() => {
              setIsLogin(!isLogin);
              setAuthError(null);
              form.reset();
            }}
            className="text-sm"
            disabled={isLoading}
          >
            {isLogin
              ? "Don't have an account? Sign Up"
              : "Already have an account? Sign In"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function Auth() {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-center text-destructive mb-4">
              Authentication Error
            </h2>
            <p className="text-center text-muted-foreground">
              There was a problem loading the authentication page. Please try
              refreshing the page.
            </p>
          </Card>
        </div>
      }
    >
      <AuthContent />
    </ErrorBoundary>
  );
}
