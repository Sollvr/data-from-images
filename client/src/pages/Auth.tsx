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
import { Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { FaGoogle } from "react-icons/fa";
import { Separator } from "@/components/ui/separator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

function AuthContent() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { login, register } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  useEffect(() => {
    console.log('Auth component mounted');
    setAuthError(null); // Clear any previous errors
  }, []);

  const form = useForm({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof authSchema>) => {
    setAuthError(null);
    console.log('Attempting authentication...');
    setIsLoading(true);
    try {
      const result = await (isLogin 
        ? login.email(data.email, data.password) 
        : register(data.email, data.password)
      );
      
      if (result.ok) {
        console.log('Authentication successful, redirecting...');
        setLocation("/app");
      } else {
        console.error('Authentication failed:', result.message);
        setAuthError(result.message);
      }
    } catch (error: any) {
      console.error('Unexpected error during authentication:', error);
      setAuthError(error?.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    console.log('Attempting Google sign in...');
    setGoogleLoading(true);
    try {
      const result = await login.google();
      if (!result.ok) {
        console.error('Google sign in failed:', result.message);
        setAuthError(result.message);
      } else {
        console.log('Google sign in initiated...');
        // Don't clear loading state as we're redirecting
      }
    } catch (error: any) {
      console.error('Unexpected error during Google sign in:', error);
      setAuthError(error?.message || "Failed to sign in with Google");
      setGoogleLoading(false);
    }
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

        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleGoogleSignIn}
          disabled={isLoading || googleLoading}
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FaGoogle className="h-4 w-4 mr-2" />
          )}
          {googleLoading ? "Redirecting..." : "Continue with Google"}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Email"
                type="email"
                {...form.register("email")}
                className="pl-9"
                disabled={isLoading || googleLoading}
              />
            </div>
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
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
                disabled={isLoading || googleLoading}
              />
            </div>
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || googleLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isLogin ? "Sign In" : "Sign Up"}
          </Button>
        </form>

        <div className="text-center">
          <Button
            variant="link"
            onClick={() => {
              setIsLogin(!isLogin);
              setAuthError(null);
              form.reset();
            }}
            className="text-sm"
            disabled={isLoading || googleLoading}
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
              There was a problem loading the authentication page. Please try refreshing the page.
            </p>
          </Card>
        </div>
      }
    >
      <AuthContent />
    </ErrorBoundary>
  );
}
