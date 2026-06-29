"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Category, Expense, Person } from "@/lib/types";
import { MONTH_NAMES, formatCurrency } from "@/lib/types";
import PersonPanel from "./PersonPanel";

const PERSON_COLORS: Record<Person, string> = {
  Jordan: "#2563eb",
  Nicole: "#db2777",
};

export default function EntryPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [half, setHalf] = useState<1 | 2>(now.getDate() <= 15 ? 1 : 2);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [year, month, half]);

  async function loadCategories() {
    const { data } = await supabase.from("categories").select("*").order("name");
    if (data) setCategories(data as Category[]);
  }

  async function loadExpenses() {
    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("year", year)
      .eq("month", month)
      .eq("half", half)
      .order("created_at", { ascending: true });
    if (!error && data) setExpenses(data as Expense[]);
    setLoading(false);
  }

  async function addRow(person: Person) {
    const { data, error } = await supabase
      .from("expenses")
      .insert({ person, name: "", amount: 0, category_id: null, year, month, half })
      .select()
      .single();
    if (!error && data) {
      setExpenses((prev) => [...prev, data as Expense]);
    } else if (error) {
      alert(error.message);
    }
  }

  function onChangeRow(id: string, fields: Partial<Expense>) {
    setExpenses((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...fields } : e));
      const updated = next.find((e) => e.id === id);
      if (updated) {
        clearTimeout(saveTimers.current[id]);
        saveTimers.current[id] = setTimeout(() => {
          supabase
            .from("expenses")
            .update({
              name: updated.name,
              amount: updated.amount,
              category_id: updated.category_id,
            })
            .eq("id", id)
            .then(({ error }) => {
              if (error) console.error(error);
            });
        }, 500);
      }
      return next;
    });
  }

  async function deleteRow(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) alert(error.message);
  }

  const jordanExpenses = useMemo(
    () => expenses.filter((e) => e.person === "Jordan"),
    [expenses]
  );
  const nicoleExpenses = useMemo(
    () => expenses.filter((e) => e.person === "Nicole"),
    [expenses]
  );
  const jordanTotal = useMemo(
    () => jordanExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    [jordanExpenses]
  );
  const nicoleTotal = useMemo(
    () => nicoleExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    [nicoleExpenses]
  );

  const diff = jordanTotal - nicoleTotal;
  const owedAmount = Math.abs(diff) / 2;
  let settleText = "Even — no one owes anything";
  if (diff > 0.005) settleText = `Nicole owes Jordan ${formatCurrency(owedAmount)}`;
  else if (diff < -0.005) settleText = `Jordan owes Nicole ${formatCurrency(owedAmount)}`;

  const years: number[] = [];
  for (let y = now.getFullYear() - 3; y <= now.getFullYear() + 1; y++) years.push(y);

  return (
    <div>
      <div className="page-header">
        <h1>Monthly Entry</h1>
        <p>
          Enter shared expenses for each half of the month. Totals are split 50/50
          and settled independently for each half.
        </p>
      </div>

      <div className="card">
        <div className="filters-bar">
          <div className="field">
            <label>Year</label>
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Month</label>
            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Half of month</label>
            <select
              value={half}
              onChange={(e) => setHalf(parseInt(e.target.value) as 1 | 2)}
            >
              <option value={1}>1st half (1st–15th)</option>
              <option value={2}>2nd half (16th–end)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="pills-row">
        <div className="pill">
          <span className="dot" style={{ background: PERSON_COLORS.Jordan }} />
          <span className="label">Jordan total</span>
          <span className="value">{formatCurrency(jordanTotal)}</span>
        </div>
        <div className="pill">
          <span className="dot" style={{ background: PERSON_COLORS.Nicole }} />
          <span className="label">Nicole total</span>
          <span className="value">{formatCurrency(nicoleTotal)}</span>
        </div>
        <div className={`pill ${diff === 0 ? "even" : "settle"}`}>
          <span className="label">Settle up</span>
          <span className="value">{settleText}</span>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : (
        <div className="split-grid">
          <PersonPanel
            person="Jordan"
            color={PERSON_COLORS.Jordan}
            expenses={jordanExpenses}
            categories={categories}
            total={jordanTotal}
            onAddRow={() => addRow("Jordan")}
            onChangeRow={onChangeRow}
            onDeleteRow={deleteRow}
          />
          <PersonPanel
            person="Nicole"
            color={PERSON_COLORS.Nicole}
            expenses={nicoleExpenses}
            categories={categories}
            total={nicoleTotal}
            onAddRow={() => addRow("Nicole")}
            onChangeRow={onChangeRow}
            onDeleteRow={deleteRow}
          />
        </div>
      )}
    </div>
  );
}
