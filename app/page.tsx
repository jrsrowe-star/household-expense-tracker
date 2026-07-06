"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { supabase } from "@/lib/supabaseClient";
import type { Category, Expense } from "@/lib/types";
import { MONTH_NAMES, SECTOR_COLORS, SECTORS, formatCurrency } from "@/lib/types";

const UNCATEGORIZED_COLOR = "#9ca3af";

// ─── Multi-select category dropdown ─────────────────────────────────────────

type MultiSelectProps = {
  categories: Category[];
  excludedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
};

function CategoryMultiSelect({ categories, excludedIds, onToggle, onToggleAll }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const allSelected = excludedIds.size === 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const label = allSelected
    ? "All categories"
    : `${categories.length - excludedIds.size} of ${categories.length} selected`;

  const bySector = useMemo(() => {
    const map = new Map<string, Category[]>();
    categories.forEach((c) => {
      const s = c.sector ?? "Uncategorized";
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(c);
    });
    return map;
  }, [categories]);

  const sectorOrder = [...SECTORS, "Uncategorized"];

  return (
    <div className="multiselect-wrapper" ref={ref}>
      <button
        className={`multiselect-trigger${open ? " open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <span>{label}</span>
        <span className="chevron">▼</span>
      </button>

      {open && (
        <div className="multiselect-menu">
          <label className="multiselect-option">
            <input type="checkbox" checked={allSelected} onChange={onToggleAll} />
            <strong>All categories</strong>
          </label>
          <hr className="multiselect-divider" />
          {sectorOrder.map((sector) => {
            const cats = bySector.get(sector);
            if (!cats?.length) return null;
            return (
              <div key={sector}>
                <div className="multiselect-group-label">{sector}</div>
                {cats.map((cat) => (
                  <label key={cat.id} className="multiselect-option">
                    <input
                      type="checkbox"
                      checked={!excludedIds.has(cat.id)}
                      onChange={() => onToggle(cat.id)}
                    />
                    <span
                      className="category-swatch"
                      style={{ background: cat.color, fontSize: 11, padding: "2px 8px" }}
                    >
                      {cat.name}
                    </span>
                  </label>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Dashboard page ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [yearFilter, setYearFilter] = useState<string>("all");
  const [personFilter, setPersonFilter] = useState<string>("all");
  const [halfFilter, setHalfFilter] = useState<string>("all");
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<Set<string>>(new Set());

  useEffect(() => { loadData(); }, []);

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

  function sectorOf(e: Expense): string {
    const cat = e.category_id ? categoryById.get(e.category_id) : null;
    return cat?.sector ?? "Uncategorized";
  }

  function sectorColor(sector: string): string {
    return SECTOR_COLORS[sector] ?? UNCATEGORIZED_COLOR;
  }

  function categoryLabel(id: string | null) {
    if (!id) return "Uncategorized";
    return categoryById.get(id)?.name ?? "Uncategorized";
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
      if (e.category_id && excludedCategoryIds.has(e.category_id)) return false;
      return true;
    });
  }, [expenses, yearFilter, personFilter, halfFilter, excludedCategoryIds]);

  const totalSpend = useMemo(
    () => filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0),
    [filteredExpenses]
  );

  const activeSectors = useMemo(() => {
    const present = new Set<string>();
    filteredExpenses.forEach((e) => present.add(sectorOf(e)));
    const ordered = [...SECTORS].filter((s) => present.has(s));
    if (present.has("Uncategorized")) ordered.push("Uncategorized");
    return ordered;
  }, [filteredExpenses, categoryById]);

  const monthlyChartData = useMemo(() => {
    const rows = MONTH_NAMES.map((name) => ({ month: name } as Record<string, unknown>));
    filteredExpenses.forEach((e) => {
      const row = rows[e.month - 1];
      const sector = sectorOf(e);
      row[sector] = ((row[sector] as number) || 0) + e.amount;
    });
    return rows;
  }, [filteredExpenses, categoryById]);

  const sectorPieData = useMemo(() => {
    const totals = new Map<string, number>();
    filteredExpenses.forEach((e) => {
      const sector = sectorOf(e);
      totals.set(sector, (totals.get(sector) || 0) + e.amount);
    });
    return Array.from(totals.entries())
      .map(([name, value]) => ({ name, value, color: sectorColor(name) }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses, categoryById]);

  const trendData = useMemo(() => {
    const totals = new Map<string, number>();
    expenses
      .filter((e) => {
        if (personFilter !== "all" && e.person !== personFilter) return false;
        if (halfFilter !== "all" && String(e.half) !== halfFilter) return false;
        if (e.category_id && excludedCategoryIds.has(e.category_id)) return false;
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

  function toggleCategory(id: string) {
    setExcludedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllCategories() {
    setExcludedCategoryIds((prev) =>
      prev.size === 0 ? new Set(categories.map((c) => c.id)) : new Set()
    );
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
        <h1>Dashboard</h1>
        <p>Shared expenses over time — filter by year, person, half, and category.</p>
      </div>

      <div className="card">
        <div className="filters-bar">
          <div className="field">
            <label>Year</label>
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
              <option value="all">All years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
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
          <div className="field">
            <label>Categories</label>
            <CategoryMultiSelect
              categories={categories}
              excludedIds={excludedCategoryIds}
              onToggle={toggleCategory}
              onToggleAll={toggleAllCategories}
            />
          </div>
        </div>
      </div>

      <div className="pills-row">
        <div className="pill">
          <span className="label">Total (filtered)</span>
          <span className="value">{formatCurrency(totalSpend)}</span>
        </div>
        <div className="pill">
          <span className="label">Entries</span>
          <span className="value">{filteredExpenses.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : (
        <>
          <div className="chart-grid">
            <div className="card">
              <h2>
                Monthly spend by sector
                {yearFilter !== "all" ? ` — ${yearFilter}` : " (all years combined)"}
              </h2>
              {filteredExpenses.length === 0 ? (
                <div className="empty-state">No data for these filters.</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickFormatter={(m) => m.slice(0, 3)} fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    {activeSectors.map((sector) => (
                      <Bar
                        key={sector}
                        dataKey={sector}
                        stackId="a"
                        fill={sectorColor(sector)}
                        name={sector}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h2>Spend by sector</h2>
              {sectorPieData.length === 0 ? (
                <div className="empty-state">No data for these filters.</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sectorPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(d) => d.name}
                      labelLine={false}
                    >
                      {sectorPieData.map((entry, i) => (
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
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    dot={false}
                  />
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
                    <th>Sector</th>
                    <th>Category</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTable.map((e) => (
                    <tr key={e.id}>
                      <td>
                        {MONTH_NAMES[e.month - 1]} {e.year} · {e.half === 1 ? "1st" : "2nd"} half
                      </td>
                      <td>{e.person}</td>
                      <td>{e.name || <span style={{ color: "#9ca3af" }}>(unnamed)</span>}</td>
                      <td>
                        <span
                          className="category-swatch"
                          style={{ background: sectorColor(sectorOf(e)) }}
                        >
                          {sectorOf(e)}
                        </span>
                      </td>
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
