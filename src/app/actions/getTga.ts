"use server";

import { fetchTgaData } from "@/lib/api";
import type { TgaRecord, ChartDataPoint } from "@/types";

export async function getTga(days: number = 180): Promise<TgaRecord[]> {
  return fetchTgaData(days);
}

export async function getTgaChartData(days: number = 180): Promise<ChartDataPoint[]> {
  const data = await fetchTgaData(days);

  // API returns values in millions (e.g., 935847 = $935.847 billion)
  return data.map((record) => ({
    date: record.record_date,
    value: parseFloat(record.open_today_bal) / 1000, // Convert millions to billions
  }));
}

export async function getLatestTga(): Promise<{
  balance: number; // Value in millions (from API)
  date: string;
  change: number;
} | null> {
  const data = await fetchTgaData(30);

  if (data.length < 2) return null;

  const latest = data[data.length - 1];
  const previous = data[data.length - 2];

  // API returns values in millions (e.g., 935847 = $935.847 billion)
  const latestBalance = parseFloat(latest.open_today_bal);
  const previousBalance = parseFloat(previous.open_today_bal);

  return {
    balance: latestBalance, // Keep in millions
    date: latest.record_date,
    change: ((latestBalance - previousBalance) / previousBalance) * 100,
  };
}
