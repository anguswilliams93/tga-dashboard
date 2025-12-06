"use server";

import { getSuggestions as getSuggestionsFromDb } from "@/lib/db";

export interface Suggestion {
  id: number;
  suggestion: string;
  email: string | null;
  status: string;
  created_at: string;
}

export async function getSuggestions(): Promise<Suggestion[]> {
  try {
    const suggestions = getSuggestionsFromDb();
    return suggestions;
  } catch (error) {
    console.error("Failed to get suggestions:", error);
    return [];
  }
}
