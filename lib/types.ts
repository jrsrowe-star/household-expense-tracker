export type Person = "Jordan" | "Nicole";

export type Category = {
  id: string;
  name: string;
  color: string;
  created_at?: string;
};

export type Expense = {
  id: string;
  person: Person;
  name: string;
  amount: number;
  category_id: string | null;
  year: number;
  month: number; // 1-12
  half: 1 | 2;
  created_at?: string;
};

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const PEOPLE: Person[] = ["Jordan", "Nicole"];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount || 0);
}
