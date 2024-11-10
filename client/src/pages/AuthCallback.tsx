import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
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
        // Check if there's an error in the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const errorDescription = hashParams.get('error_description');
        if (errorDescription) {
          throw new Error(errorDescription);
        }

        console.log('Processing authentication callback...');
        const { error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }

        console.log('Authentication successful, redirecting...');
        setLocation('/app');
      } catch (error: any) {
        console.error('Error handling auth callback:', error);
        setError(error?.message || 'Failed to complete authentication');
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
