"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Category } from "@/lib/types";
import { SECTORS, SECTOR_COLORS } from "@/lib/types";

const RANDOM_COLORS = [
  "#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4",
  "#46f0f0", "#f032e6", "#bcf60c", "#008080", "#9a6324",
];

function randomColor() {
  return RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)];
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(randomColor());
  const [newSector, setNewSector] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });
    if (!error && data) setCategories(data as Category[]);
    setLoading(false);
  }

  async function addCategory() {
    const name = newName.trim();
    if (!name) return;
    const color = newSector ? (SECTOR_COLORS[newSector] ?? newColor) : newColor;
    const { data, error } = await supabase
      .from("categories")
      .insert({ name, color, sector: newSector || null })
      .select()
      .single();
    if (!error && data) {
      setCategories((prev) =>
        [...prev, data as Category].sort((a, b) => a.name.localeCompare(b.name))
      );
      setNewName("");
      setNewColor(randomColor());
      setNewSector("");
    } else if (error) {
      alert(error.message);
    }
  }

  async function updateCategory(id: string, fields: Partial<Category>) {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...fields } : c))
    );
    setSavingId(id);
    const { error } = await supabase
      .from("categories")
      .update(fields)
      .eq("id", id);
    setSavingId(null);
    if (error) alert(error.message);
  }

  async function deleteCategory(id: string) {
    if (!confirm("Delete this category? Expenses using it will become uncategorized.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { alert(error.message); return; }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div>
      <div className="page-header">
        <h1>Categories</h1>
        <p>Add expense categories, assign a color, and group them into a sector.</p>
      </div>

      <div className="card">
        <h2>Add a category</h2>
        <div className="row">
          <div className="field">
            <label>Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Groceries"
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
            />
          </div>
          <div className="field">
            <label>Sector</label>
            <select
              value={newSector}
              onChange={(e) => {
                setNewSector(e.target.value);
                if (e.target.value && SECTOR_COLORS[e.target.value]) {
                  setNewColor(SECTOR_COLORS[e.target.value]);
                }
              }}
            >
              <option value="">— None —</option>
              {SECTORS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Color</label>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={addCategory}>
            Add category
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card"><div className="empty-state">Loading…</div></div>
      ) : categories.length === 0 ? (
        <div className="card"><div className="empty-state">No categories yet. Add one above.</div></div>
      ) : (
        <>
          {[...SECTORS, null].map((sector) => {
            const cats = categories.filter((c) =>
              sector === null ? !c.sector : c.sector === sector
            );
            if (cats.length === 0) return null;
            const sectorLabel = sector ?? "No Sector";
            const sectorCol = sector ? SECTOR_COLORS[sector] : "#9ca3af";
            return (
              <div className="card" key={sectorLabel}>
                <h2 style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: sectorCol,
                      flexShrink: 0,
                    }}
                  />
                  {sectorLabel}
                  <span style={{ fontSize: 13, fontFamily: "var(--sans)", fontWeight: 500, color: "var(--text-muted)" }}>
                    ({cats.length})
                  </span>
                </h2>
                <div className="category-list">
                  {cats.map((cat) => (
                    <div className="category-row" key={cat.id}>
                      <input
                        type="color"
                        value={cat.color}
                        onChange={(e) => updateCategory(cat.id, { color: e.target.value })}
                      />
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) =>
                          setCategories((prev) =>
                            prev.map((c) => c.id === cat.id ? { ...c, name: e.target.value } : c)
                          )
                        }
                        onBlur={(e) => updateCategory(cat.id, { name: e.target.value })}
                      />
                      <select
                        value={cat.sector ?? ""}
                        onChange={(e) => {
                          const s = e.target.value || null;
                          const updates: Partial<Category> = { sector: s };
                          if (s && SECTOR_COLORS[s]) updates.color = SECTOR_COLORS[s];
                          updateCategory(cat.id, updates);
                        }}
                      >
                        <option value="">— No sector —</option>
                        {SECTORS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <span
                        className="category-swatch"
                        style={{ background: cat.color, justifySelf: "start" }}
                      >
                        {savingId === cat.id ? "Saving…" : "Preview"}
                      </span>
                      <button className="btn-danger" onClick={() => deleteCategory(cat.id)}>
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
