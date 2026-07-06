export type Person = "Jordan" | "Nicole";

export type Category = {
  id: string;
  name: string;
  color: string;
  sector: string | null;
  created_at?: string;
};

export const SECTORS = [
  "Mortgage",
  "Household Expenses",
  "Groceries",
  "Monthly Subscriptions",
  "Dogs",
  "Restaurants / Bars",
  "Harper",
  "Car Expenses",
] as const;

export const SECTOR_COLORS: Record<string, string> = {
  "Mortgage":              "#BE5E37",
  "Household Expenses":    "#B5832F",
  "Groceries":             "#6E8C45",
  "Monthly Subscriptions": "#3F7D6E",
  "Dogs":                  "#4E739B",
  "Restaurants / Bars":    "#7E6C9C",
  "Harper":                "#BA5F89",
  "Car Expenses":          "#897C6B",
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
