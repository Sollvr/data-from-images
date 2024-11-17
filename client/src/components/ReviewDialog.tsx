import { useState } from "react";
import { Star, StarOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewDialog({ open, onOpenChange }: ReviewDialogProps) {
  const [stars, setStars] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (stars === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a rating",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .insert([
          { 
            user_id: user?.id,
            stars, 
            feedback: feedback.trim() || null 
          }
        ]);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted.",
      });
      
      // Reset form
      setStars(0);
      setFeedback("");
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit review",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How was your experience?</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => setStars(rating)}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                {rating <= stars ? (
                  <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                ) : (
                  <StarOff className="w-8 h-8 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
          <Input
            placeholder="Quick feedback (optional)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value.slice(0, 50))}
            maxLength={50}
            className="text-center"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setStars(0);
                setFeedback("");
                onOpenChange(false);
              }}
              disabled={isSubmitting}
            >
              Skip
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || stars === 0}>
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 