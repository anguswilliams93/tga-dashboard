"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { submitSuggestion } from "@/app/actions/submitSuggestion";
import { getSuggestions, type Suggestion } from "@/app/actions/getSuggestions";
import {
  Lightbulb,
  Send,
  CheckCircle2,
  Loader2,
  MessageSquarePlus,
  Sparkles,
  ChevronDown,
  ChevronUp,
  List,
  Clock
} from "lucide-react";

interface SuggestionBoxProps {
  delay?: number;
}

const containerVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 80,
      damping: 20
    }
  }
};

const successVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 200,
      damping: 15
    }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.2 }
  }
};

export function SuggestionBox({ delay = 0 }: SuggestionBoxProps) {
  const [suggestion, setSuggestion] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Fetch suggestions when dropdown is opened
  useEffect(() => {
    if (showSuggestions && suggestions.length === 0) {
      setIsLoadingSuggestions(true);
      getSuggestions()
        .then((data) => setSuggestions(data))
        .catch(() => setSuggestions([]))
        .finally(() => setIsLoadingSuggestions(false));
    }
  }, [showSuggestions, suggestions.length]);

  // Refresh suggestions after successful submission
  const refreshSuggestions = async () => {
    const data = await getSuggestions();
    setSuggestions(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!suggestion.trim()) {
      setError("Please enter a suggestion");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitSuggestion({
        suggestion: suggestion.trim(),
        email: email.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error || "Failed to submit suggestion");
        return;
      }

      // Show success state
      setIsSubmitted(true);
      setSuggestion("");
      setEmail("");

      // Refresh suggestions list
      await refreshSuggestions();

      // Reset after 5 seconds
      setTimeout(() => {
        setIsSubmitted(false);
      }, 5000);
    } catch {
      setError("Failed to send suggestion. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
    >
      <Card className={cn(
        "overflow-hidden border-0 shadow-lg",
        "bg-gradient-to-br from-card via-card to-violet-500/5"
      )}>
        {/* Gradient accent */}
        <motion.div
          className="h-1 w-full bg-gradient-to-r from-violet-500 to-purple-500"
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: delay + 0.2, duration: 0.8, ease: "easeOut" }}
        />

        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <MessageSquarePlus className="h-5 w-5 text-violet-500" />
                Suggest a Feature
              </CardTitle>
              <CardDescription>
                Help us improve the dashboard with your ideas
              </CardDescription>
            </div>
            <Badge
              variant="secondary"
              className="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Beta
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <AnimatePresence mode="wait">
            {isSubmitted ? (
              <motion.div
                key="success"
                variants={successVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex flex-col items-center justify-center py-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.1 }}
                >
                  <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
                </motion.div>
                <h3 className="text-lg font-semibold mb-2">Thank You!</h3>
                <p className="text-sm text-muted-foreground">
                  Your suggestion has been sent. We appreciate your feedback!
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* Suggestion textarea */}
                <div className="space-y-2">
                  <label
                    htmlFor="suggestion"
                    className="text-sm font-medium flex items-center gap-2"
                  >
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    Your Idea
                  </label>
                  <textarea
                    id="suggestion"
                    value={suggestion}
                    onChange={(e) => setSuggestion(e.target.value)}
                    placeholder="Describe the feature you'd like to see..."
                    className={cn(
                      "w-full min-h-[100px] px-4 py-3 rounded-xl",
                      "bg-muted/50 border border-border/50",
                      "placeholder:text-muted-foreground/50",
                      "focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50",
                      "transition-all duration-200 resize-none"
                    )}
                  />
                </div>

                {/* Email input (optional) */}
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className={cn(
                      "w-full px-4 py-2.5 rounded-xl",
                      "bg-muted/50 border border-border/50",
                      "placeholder:text-muted-foreground/50",
                      "focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50",
                      "transition-all duration-200"
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Add your email if you&apos;d like us to follow up
                  </p>
                </div>

                {/* Error message */}
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500"
                  >
                    {error}
                  </motion.p>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={isSubmitting || !suggestion.trim()}
                  className={cn(
                    "w-full h-11 rounded-xl font-medium",
                    "bg-gradient-to-r from-violet-500 to-purple-500",
                    "hover:from-violet-600 hover:to-purple-600",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-all duration-200"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Suggestion
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground pt-2">
                  Suggestions are sent to the development team
                </p>
              </motion.form>
            )}
          </AnimatePresence>

          {/* View Suggestions Dropdown */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-2">
                <List className="h-4 w-4" />
                View All Suggestions
                {suggestions.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {suggestions.length}
                  </Badge>
                )}
              </span>
              {showSuggestions ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            <AnimatePresence>
              {showSuggestions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 100, damping: 15 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
                    {isLoadingSuggestions ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : suggestions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No suggestions yet. Be the first!
                      </p>
                    ) : (
                      suggestions.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={cn(
                            "p-3 rounded-lg",
                            "bg-muted/30 border border-border/30",
                            "hover:bg-muted/50 transition-colors"
                          )}
                        >
                          <p className="text-sm text-foreground line-clamp-2">
                            {item.suggestion}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(item.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs ml-auto",
                                item.status === "pending" && "text-yellow-600 border-yellow-600/30",
                                item.status === "reviewed" && "text-blue-600 border-blue-600/30",
                                item.status === "implemented" && "text-emerald-600 border-emerald-600/30"
                              )}
                            >
                              {item.status}
                            </Badge>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
