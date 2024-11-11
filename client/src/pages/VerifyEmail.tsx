import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");

        if (!token) {
          setStatus("error");
          setMessage("Invalid verification token");
          return;
        }

        // Use VITE_API_URL for the API endpoint
        const response = await fetch(`${import.meta.env.VITE_API_URL}/verify-email?token=${token}`);
        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          toast({
            title: "Success",
            description: "Email verified successfully!",
          });
        } else {
          setStatus("error");
          toast({
            variant: "destructive",
            title: "Error",
            description: data.message || "Failed to verify email",
          });
        }
        setMessage(data.message);
      } catch (error) {
        console.error("Email verification error:", error);
        setStatus("error");
        setMessage("An error occurred during verification");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to connect to verification service",
        });
      }
    };

    verifyEmail();
  }, [toast]);

  const handleRetry = () => {
    setStatus("loading");
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <h2 className="text-2xl font-semibold">Verifying Email</h2>
              <p className="text-muted-foreground">Please wait while we verify your email address...</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
              <h2 className="text-2xl font-semibold text-green-500">Email Verified!</h2>
              <p className="text-muted-foreground">{message}</p>
              <Button onClick={() => setLocation("/auth")} className="mt-4">
                Proceed to Login
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 mx-auto text-destructive" />
              <h2 className="text-2xl font-semibold text-destructive">Verification Failed</h2>
              <p className="text-muted-foreground">{message}</p>
              <div className="flex flex-col gap-2 mt-4">
                <Button onClick={handleRetry} variant="secondary">
                  Retry Verification
                </Button>
                <Button onClick={() => setLocation("/auth")} variant="outline">
                  Return to Login
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
