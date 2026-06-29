"use client";

import type { Category, Expense, Person } from "@/lib/types";
import { formatCurrency } from "@/lib/types";

type Props = {
  person: Person;
  color: string;
  expenses: Expense[];
  categories: Category[];
  total: number;
  onAddRow: () => void;
  onChangeRow: (id: string, fields: Partial<Expense>) => void;
  onDeleteRow: (id: string) => void;
};

export default function PersonPanel({
  person,
  color,
  expenses,
  categories,
  total,
  onAddRow,
  onChangeRow,
  onDeleteRow,
}: Props) {
  return (
    <div className="card">
      <div className="person-panel-head">
        <h2>
          <span className="dot" style={{ background: color }} />
          {person}'s expenses
        </h2>
        <span className="pill even" style={{ padding: "6px 14px" }}>
          <span className="value">{formatCurrency(total)}</span>
        </span>
      </div>

      {expenses.length === 0 ? (
        <div className="empty-state">No expenses yet for this period.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th style={{ width: "38%" }}>Expense</th>
              <th style={{ width: "22%" }}>Amount</th>
              <th style={{ width: "32%" }}>Category</th>
              <th style={{ width: "8%" }}></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp) => (
              <tr key={exp.id}>
                <td>
                  <input
                    type="text"
                    value={exp.name}
                    placeholder="e.g. Groceries run"
                    onChange={(e) => onChangeRow(exp.id, { name: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={exp.amount === 0 ? "" : exp.amount}
                    placeholder="0.00"
                    onChange={(e) =>
                      onChangeRow(exp.id, { amount: parseFloat(e.target.value) || 0 })
                    }
                  />
                </td>
                <td>
                  <select
                    value={exp.category_id ?? ""}
                    onChange={(e) =>
                      onChangeRow(exp.id, { category_id: e.target.value || null })
                    }
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button className="btn-danger" onClick={() => onDeleteRow(exp.id)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 12 }}>
        <button className="btn btn-small" onClick={onAddRow}>
          + Add expense
        </button>
      </div>
    </div>
  );
}
