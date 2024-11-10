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
import { User, Lock, Loader2, AlertCircle, MailCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const loginSchema = z.object({
  username: z.string().email("Must be a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registrationSchema = z.object({
  email: z.string().email("Must be a valid email address"),
});

function AuthContent() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string>("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const verified = params.get("verified");
    const email = params.get("email");

    if (error) {
      setAuthError(decodeURIComponent(error));
    } else if (verified === "true") {
      toast({
        title: "Email verified",
        description: "Your email has been verified. Please complete your registration.",
      });
      if (email) {
        setLocation(`/complete-registration?email=${encodeURIComponent(email)}`);
      }
    }
  }, [toast, setLocation]);

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registrationForm = useForm({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      email: "",
    },
  });

  const onLoginSubmit = async (data: z.infer<typeof loginSchema>) => {
    setAuthError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.needsVerification) {
          setVerificationSent(true);
          setCurrentEmail(data.username);
          return;
        }
        throw new Error(result.message);
      }

      setLocation("/app");
    } catch (error: any) {
      setAuthError(error.message || "Failed to login");
    } finally {
      setIsLoading(false);
    }
  };

  const onRegisterSubmit = async (data: z.infer<typeof registrationSchema>) => {
    setAuthError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: data.email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Registration failed");
      }

      setVerificationSent(true);
      setCurrentEmail(data.email);
    } catch (error: any) {
      setAuthError(error.message || "Failed to register");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!currentEmail) {
      setAuthError("Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentEmail }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      toast({
        title: "Verification email sent",
        description: "Please check your email for the verification link.",
      });
    } catch (error: any) {
      setAuthError(error.message || "Failed to resend verification email");
    } finally {
      setIsLoading(false);
    }
  };

  if (verificationSent) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-screen p-6">
        <Card className="w-full max-w-md p-6 space-y-6">
          <div className="text-center space-y-4">
            <MailCheck className="h-12 w-12 mx-auto text-primary" />
            <h2 className="text-2xl font-bold">Check your email</h2>
            <p className="text-muted-foreground">
              We've sent you a verification link. Please check your email to verify your account.
            </p>
            <Button
              variant="outline"
              onClick={handleResendVerification}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Resend verification email
            </Button>
          </div>
        </Card>
      </div>
    );
  }

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

        {isLogin ? (
          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Email address"
                  {...loginForm.register("username")}
                  className="pl-9"
                  disabled={isLoading}
                />
              </div>
              {loginForm.formState.errors.username && (
                <p className="text-sm text-destructive">
                  {loginForm.formState.errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  {...loginForm.register("password")}
                  className="pl-9"
                  disabled={isLoading}
                />
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sign In
            </Button>
          </form>
        ) : (
          <form onSubmit={registrationForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Email address"
                  {...registrationForm.register("email")}
                  className="pl-9"
                  disabled={isLoading}
                />
              </div>
              {registrationForm.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {registrationForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Continue with Email
            </Button>
          </form>
        )}

        <div className="text-center">
          <Button
            variant="link"
            onClick={() => {
              setIsLogin(!isLogin);
              setAuthError(null);
              loginForm.reset();
              registrationForm.reset();
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
