"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { supabase } from "@/lib/supabaseClient";
import type { Category, Expense, Person } from "@/lib/types";
import { MONTH_NAMES, formatCurrency } from "@/lib/types";

const UNCATEGORIZED = "Uncategorized";
const UNCATEGORIZED_COLOR = "#9ca3af";
const PERSON_COLORS: Record<string, string> = { Jordan: "#2f6f6b", Nicole: "#c1573f" };

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [yearFilter, setYearFilter] = useState<string>("all");
  const [personFilter, setPersonFilter] = useState<string>("all");
  const [halfFilter, setHalfFilter] = useState<string>("all");
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: expenseData }, { data: categoryData }] = await Promise.all([
      supabase.from("expenses").select("*"),
      supabase.from("categories").select("*").order("name"),
    ]);
    if (expenseData) setExpenses(expenseData as Expense[]);
    if (categoryData) setCategories(categoryData as Category[]);
    setLoading(false);
  }

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  function categoryLabel(id: string | null) {
    if (!id) return UNCATEGORIZED;
    return categoryById.get(id)?.name ?? UNCATEGORIZED;
  }

  function categoryColor(id: string | null) {
    if (!id) return UNCATEGORIZED_COLOR;
    return categoryById.get(id)?.color ?? UNCATEGORIZED_COLOR;
  }

  const availableYears = useMemo(() => {
    const years = new Set(expenses.map((e) => e.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (yearFilter !== "all" && String(e.year) !== yearFilter) return false;
      if (personFilter !== "all" && e.person !== personFilter) return false;
      if (halfFilter !== "all" && String(e.half) !== halfFilter) return false;
      const catKey = e.category_id ?? "uncategorized";
      if (excludedCategoryIds.has(catKey)) return false;
      return true;
    });
  }, [expenses, yearFilter, personFilter, halfFilter, excludedCategoryIds]);

  const totalSpend = useMemo(
    () => filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0),
    [filteredExpenses]
  );

  const jordanTotal = useMemo(
    () =>
      filteredExpenses
        .filter((e) => e.person === "Jordan")
        .reduce((s, e) => s + (e.amount || 0), 0),
    [filteredExpenses]
  );
  const nicoleTotal = useMemo(
    () =>
      filteredExpenses
        .filter((e) => e.person === "Nicole")
        .reduce((s, e) => s + (e.amount || 0), 0),
    [filteredExpenses]
  );
  const settleDiff = jordanTotal - nicoleTotal;
  const settleOwed = Math.abs(settleDiff) / 2;
  let settleWho = "You're all square";
  if (settleDiff > 0.005) settleWho = "Nicole owes Jordan";
  else if (settleDiff < -0.005) settleWho = "Jordan owes Nicole";

  // Category names present in the filtered set, used as stacked bar keys.
  const activeCategoryNames = useMemo(() => {
    const names = new Set<string>();
    filteredExpenses.forEach((e) => names.add(categoryLabel(e.category_id)));
    return Array.from(names);
  }, [filteredExpenses, categoryById]);

  const categoryColorByName = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.name, c.color));
    map.set(UNCATEGORIZED, UNCATEGORIZED_COLOR);
    return map;
  }, [categories]);

  // Monthly breakdown (stacked by category) — respects the year filter when set,
  // otherwise aggregates by calendar month across all years.
  const monthlyChartData = useMemo(() => {
    const rows = MONTH_NAMES.map((name) => ({ month: name } as Record<string, any>));
    filteredExpenses.forEach((e) => {
      const row = rows[e.month - 1];
      const catName = categoryLabel(e.category_id);
      row[catName] = (row[catName] || 0) + e.amount;
    });
    return rows;
  }, [filteredExpenses, categoryById]);

  // Category breakdown pie.
  const categoryPieData = useMemo(() => {
    const totals = new Map<string, number>();
    filteredExpenses.forEach((e) => {
      const name = categoryLabel(e.category_id);
      totals.set(name, (totals.get(name) || 0) + e.amount);
    });
    return Array.from(totals.entries())
      .map(([name, value]) => ({ name, value, color: categoryColorByName.get(name) ?? UNCATEGORIZED_COLOR }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses, categoryById, categoryColorByName]);

  // Trend over time across all years/months (independent of year filter), respects
  // person/category/half filters.
  const trendData = useMemo(() => {
    const totals = new Map<string, number>();
    expenses
      .filter((e) => {
        if (personFilter !== "all" && e.person !== personFilter) return false;
        if (halfFilter !== "all" && String(e.half) !== halfFilter) return false;
        const catKey = e.category_id ?? "uncategorized";
        if (excludedCategoryIds.has(catKey)) return false;
        return true;
      })
      .forEach((e) => {
        const key = `${e.year}-${String(e.month).padStart(2, "0")}`;
        totals.set(key, (totals.get(key) || 0) + e.amount);
      });
    return Array.from(totals.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, total]) => {
        const [y, m] = key.split("-");
        return { label: `${MONTH_NAMES[parseInt(m) - 1].slice(0, 3)} ${y}`, total };
      });
  }, [expenses, personFilter, halfFilter, excludedCategoryIds]);

  function toggleCategory(catKey: string) {
    setExcludedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(catKey)) next.delete(catKey);
      else next.add(catKey);
      return next;
    });
  }

  const sortedTable = useMemo(
    () =>
      [...filteredExpenses].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        if (a.month !== b.month) return b.month - a.month;
        if (a.half !== b.half) return b.half - a.half;
        return 0;
      }),
    [filteredExpenses]
  );

  return (
    <div>
      <div className="page-header">
        <h1>Good evening, Jordan &amp; Nicole.</h1>
        <p>
          Here&apos;s how your shared spending looks
          {yearFilter !== "all" ? ` in ${yearFilter}` : " across every year"}.
        </p>
      </div>

      <div className="card">
        <div className="filters-bar">
          <div className="field">
            <label>Year</label>
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
              <option value="all">All years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Person</label>
            <select value={personFilter} onChange={(e) => setPersonFilter(e.target.value)}>
              <option value="all">Both</option>
              <option value="Jordan">Jordan</option>
              <option value="Nicole">Nicole</option>
            </select>
          </div>
          <div className="field">
            <label>Half of month</label>
            <select value={halfFilter} onChange={(e) => setHalfFilter(e.target.value)}>
              <option value="all">Both halves</option>
              <option value="1">1st half</option>
              <option value="2">2nd half</option>
            </select>
          </div>
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <label>Categories (click to toggle off)</label>
          <div className="row" style={{ marginTop: 6 }}>
            {categories.map((cat) => {
              const isOff = excludedCategoryIds.has(cat.id);
              return (
                <span
                  key={cat.id}
                  className="category-swatch"
                  style={{
                    background: isOff ? "#d1d5db" : cat.color,
                    cursor: "pointer",
                    opacity: isOff ? 0.6 : 1,
                  }}
                  onClick={() => toggleCategory(cat.id)}
                >
                  {cat.name}
                </span>
              );
            })}
            <span
              className="category-swatch"
              style={{
                background: excludedCategoryIds.has("uncategorized") ? "#d1d5db" : UNCATEGORIZED_COLOR,
                cursor: "pointer",
                opacity: excludedCategoryIds.has("uncategorized") ? 0.6 : 1,
              }}
              onClick={() => toggleCategory("uncategorized")}
            >
              Uncategorized
            </span>
          </div>
        </div>
      </div>

      <div className="hero-grid">
        <div className="hero-card settle">
          <div className="hero-label">Settle up</div>
          <div className="hero-value">{settleWho}</div>
          {settleOwed > 0.005 && (
            <div className="hero-value hero-accent">{formatCurrency(settleOwed)}</div>
          )}
        </div>
        <div className="hero-card">
          <div className="hero-label">Total spent</div>
          <div className="hero-value">{formatCurrency(totalSpend)}</div>
          <div className="hero-sub">{filteredExpenses.length} entries</div>
        </div>
        <div className="hero-card">
          <div className="hero-person-row">
            <span className="dot" style={{ background: PERSON_COLORS.Jordan }} />
            Jordan
            <span className="amt">{formatCurrency(jordanTotal)}</span>
          </div>
          <div className="hero-person-row">
            <span className="dot" style={{ background: PERSON_COLORS.Nicole }} />
            Nicole
            <span className="amt">{formatCurrency(nicoleTotal)}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : (
        <>
          <div className="chart-grid">
            <div className="card">
              <h2>Monthly spend by category{yearFilter !== "all" ? ` — ${yearFilter}` : " (all years combined)"}</h2>
              {filteredExpenses.length === 0 ? (
                <div className="empty-state">No data for these filters.</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickFormatter={(m) => m.slice(0, 3)} fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    {activeCategoryNames.map((name) => (
                      <Bar
                        key={name}
                        dataKey={name}
                        stackId="a"
                        fill={categoryColorByName.get(name) ?? UNCATEGORIZED_COLOR}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h2>Spend by category</h2>
              {categoryPieData.length === 0 ? (
                <div className="empty-state">No data for these filters.</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={104}
                      paddingAngle={2}
                      label={(d) => d.name}
                      labelLine={false}
                    >
                      {categoryPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="card">
            <h2>Trend over time</h2>
            {trendData.length === 0 ? (
              <div className="empty-state">No data for these filters.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Line type="monotone" dataKey="total" stroke="#3f7d5e" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card">
            <h2>Expense detail ({sortedTable.length})</h2>
            {sortedTable.length === 0 ? (
              <div className="empty-state">No data for these filters.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Person</th>
                    <th>Expense</th>
                    <th>Category</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTable.map((e) => (
                    <tr key={e.id}>
                      <td>
                        {MONTH_NAMES[e.month - 1]} {e.year} · {e.half === 1 ? "1st half" : "2nd half"}
                      </td>
                      <td>{e.person}</td>
                      <td>{e.name || <span style={{ color: "#9ca3af" }}>(unnamed)</span>}</td>
                      <td>
                        <span
                          className="category-swatch"
                          style={{ background: categoryColor(e.category_id) }}
                        >
                          {categoryLabel(e.category_id)}
                        </span>
                      </td>
                      <td>{formatCurrency(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
