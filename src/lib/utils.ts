import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Task {
  id: number;
  title: string;
  description: string;
  due_date: string;
  priority: number;
  difficulty: number;
  category_id: number;
  category_name: string;
  category_color: string;
  completed: boolean;
  tags: string[];
  stress_detected: boolean;
  suggested_duration: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  color: string;
}
