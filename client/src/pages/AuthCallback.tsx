import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for error parameters
        const params = new URLSearchParams(window.location.search);
        const queryError = params.get('error');
        if (queryError) {
          throw new Error(decodeURIComponent(queryError));
        }

        // Check for error in hash (OAuth2 style)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hashError = hashParams.get('error');
        if (hashError) {
          throw new Error(decodeURIComponent(hashError));
        }

        // Verify authentication state
        const response = await fetch('/api/user', {
          credentials: 'include'
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication failed. Please try again.');
          }
          throw new Error('An unexpected error occurred.');
        }

        // Successfully authenticated
        console.log('Authentication successful, redirecting...');
        setLocation('/app');
      } catch (error: any) {
        console.error('Error handling auth callback:', error);
        setError(error?.message || 'Failed to complete authentication');
        // Redirect to auth page after a delay if there's an error
        setTimeout(() => {
          setLocation('/auth?error=' + encodeURIComponent(error?.message || 'Authentication failed'));
        }, 3000);
      }
    };

    handleCallback();
  }, [setLocation]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 space-y-6">
          <h2 className="text-2xl font-bold text-center text-destructive">
            Authentication Failed
          </h2>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex justify-center">
            <Button onClick={() => setLocation('/auth')}>
              Return to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <h2 className="text-2xl font-semibold">Completing sign in...</h2>
        <p className="text-muted-foreground">Please wait while we verify your authentication.</p>
      </div>
    </div>
  );
}
