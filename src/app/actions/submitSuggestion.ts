"use server";

import { insertSuggestion } from "@/lib/db";

export async function submitSuggestion(data: {
  suggestion: string;
  email?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!data.suggestion || data.suggestion.trim().length === 0) {
      return { success: false, error: "Suggestion cannot be empty" };
    }

    if (data.suggestion.length > 5000) {
      return { success: false, error: "Suggestion is too long (max 5000 characters)" };
    }

    if (data.email && data.email.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        return { success: false, error: "Invalid email address" };
      }
    }

    insertSuggestion({
      suggestion: data.suggestion.trim(),
      email: data.email?.trim() || undefined,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to submit suggestion:", error);
    return { success: false, error: "Failed to save suggestion. Please try again." };
  }
}
