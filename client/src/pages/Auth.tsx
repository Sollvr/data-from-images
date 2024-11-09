import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const authSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const { login, register } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const form = useForm({
    resolver: zodResolver(authSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof authSchema>) => {
    try {
      const result = await (isLogin ? login(data) : register(data));
      if (result.ok) {
        setLocation("/");
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
    }
  };

  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen p-6">
      <Card className="w-full max-w-md p-6 space-y-6">
        <h1 className="text-2xl font-bold text-center">
          {isLogin ? "Login" : "Register"}
        </h1>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Username"
              {...form.register("username")}
              className="w-full"
            />
            {form.formState.errors.username && (
              <p className="text-sm text-destructive">
                {form.formState.errors.username.message}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Password"
              {...form.register("password")}
              className="w-full"
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full">
            {isLogin ? "Login" : "Register"}
          </Button>
        </form>

        <div className="text-center">
          <Button
            variant="link"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm"
          >
            {isLogin
              ? "Don't have an account? Register"
              : "Already have an account? Login"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
