"use server";

import { fetchRrpData } from "@/lib/api";
import type { RrpObservation, ChartDataPoint } from "@/types";

export async function getRrp(days: number = 180): Promise<RrpObservation[]> {
  return fetchRrpData(days);
}

export async function getRrpChartData(days: number = 180): Promise<ChartDataPoint[]> {
  const data = await fetchRrpData(days);

  // FRED RRPONTSYD data is already in BILLIONS (e.g., 2.514 = $2.514 billion)
  return data
    .filter((obs) => obs.value !== ".")
    .map((obs) => ({
      date: obs.date,
      value: parseFloat(obs.value), // Already in billions
    }));
}

export async function getLatestRrp(): Promise<{
  balance: number; // Value in millions (matching TGA format)
  date: string;
  change: number;
} | null> {
  const data = await fetchRrpData(30);

  const validData = data.filter((obs) => obs.value !== ".");

  if (validData.length < 2) return null;

  const latest = validData[validData.length - 1];
  const previous = validData[validData.length - 2];

  // FRED data is in BILLIONS (e.g., 2.514 = $2.514B)
  const latestBalance = parseFloat(latest.value);
  const previousBalance = parseFloat(previous.value);

  return {
    balance: latestBalance, // Already in billions
    date: latest.date,
    change: previousBalance !== 0
      ? ((latestBalance - previousBalance) / previousBalance) * 100
      : 0,
  };
}
