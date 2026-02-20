import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "goal_tracker_v2";

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(a, b) {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = new Date(ay, am - 1, ad);
  const db = new Date(by, bm - 1, bd);
  const diff = db.getTime() - da.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export default function App() {
  // ✅ Load from localStorage
  const [goals, setGoals] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // ✅ Vision board view
  const [view, setView] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + "_view");
      return saved ? saved : "list";
    } catch {
      return "list";
    }
  });

  // ✅ Labs toggles
  const [labs, setLabs] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + "_labs");
      return saved
        ? JSON.parse(saved)
        : {
            streak: true,
          };
    } catch {
      return { streak: true };
    }
  });

  // ✅ Dark mode toggle
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + "_theme");
      return saved ? saved : "light";
    } catch {
      return "light";
    }
  });

  // ✅ edit state
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  // form states
  const [title, setTitle] = useState("");
  const [type, setType] = useState("counter");
  const [target, setTarget] = useState(100);
  const [tasksCount, setTasksCount] = useState(5);

  // ✅ Auto-save
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
    } catch {}
  }, [goals]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY + "_view", view);
    } catch {}
  }, [view]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY + "_labs", JSON.stringify(labs));
    } catch {}
  }, [labs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY + "_theme", theme);
    } catch {}
  }, [theme]);

  function addGoal() {
    if (title.trim() === "") return;

    const base = {
      id: Date.now(),
      title: title.trim(),
      type,
      priority: false,
      createdAt: Date.now(),
      streak: 0,
      lastDone: null,
    };

    let newGoal = base;

    if (type === "counter") {
      newGoal = { ...base, count: 0, target: 1000 };
    }

    if (type === "progress") {
      const safeTarget = Number(target) > 0 ? Number(target) : 100;
      newGoal = { ...base, value: 0, target: safeTarget };
    }

    if (type === "checklist") {
      const n = Number(tasksCount);
      const safeN = n > 0 ? n : 5;
      newGoal = {
        ...base,
        tasks: Array.from({ length: safeN }, (_, i) => ({
          id: i + 1,
          label: `Task ${i + 1}`,
          done: false,
        })),
      };
    }

    setGoals((prev) => [newGoal, ...prev]);
    setTitle("");
  }

  function togglePriority(id) {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, priority: !g.priority } : g))
    );
  }

  // ✅ Delete goal
  function deleteGoal(id) {
    if (!confirm("Delete this goal?")) return;
    setGoals((prev) => prev.filter((g) => g.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditTitle("");
    }
  }

  // ✅ Start edit
  function startEdit(goal) {
    setEditingId(goal.id);
    setEditTitle(goal.title);
  }

  // ✅ Save edit
  function saveEdit(id) {
    const newName = editTitle.trim();
    if (!newName) return;
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, title: newName } : g)));
    setEditingId(null);
    setEditTitle("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
  }

  // 🔥 streak updater (only if labs.streak ON)
  function markDoneForToday(goal) {
    if (!labs.streak) return goal;

    const t = todayKey();
    const last = goal.lastDone;

    if (last === t) return goal;

    if (!last) {
      return { ...goal, lastDone: t, streak: 1 };
    }

    const diff = daysBetween(last, t);

    if (diff === 1) {
      return { ...goal, lastDone: t, streak: (goal.streak || 0) + 1 };
    }

    if (diff > 1) {
      return { ...goal, lastDone: t, streak: 1 };
    }

    return { ...goal, lastDone: t, streak: Math.max(1, goal.streak || 1) };
  }

  function incCounter(id) {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const updated = { ...g, count: g.count + 1 };
        return markDoneForToday(updated);
      })
    );
  }

  function setProgressValue(id, v) {
    const num = Number(v);
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const updated = { ...g, value: Number.isFinite(num) ? num : 0 };
        return markDoneForToday(updated);
      })
    );
  }

  function toggleTask(goalId, taskId) {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const updated = {
          ...g,
          tasks: g.tasks.map((t) =>
            t.id === taskId ? { ...t, done: !t.done } : t
          ),
        };
        return markDoneForToday(updated);
      })
    );
  }

  function resetAll() {
    if (!confirm("Delete ALL goals?")) return;
    setGoals([]);
    setEditingId(null);
    setEditTitle("");
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY + "_view");
      localStorage.removeItem(STORAGE_KEY + "_labs");
      localStorage.removeItem(STORAGE_KEY + "_theme");
    } catch {}
  }

  const sortedGoals = useMemo(() => {
    const copy = [...goals];
    copy.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority ? -1 : 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return copy;
  }, [goals]);

  const isDark = theme === "dark";

  const styles = useMemo(
    () => {
      const C = {
        bg: isDark ? "#0b0f14" : "#ffffff",
        text: isDark ? "#e6eef7" : "#0b0f14",
        subText: isDark ? "#a9b6c6" : "#444",
        card: isDark ? "#111826" : "#ffffff",
        border: isDark ? "#263246" : "#ddd",
        inputBg: isDark ? "#0f1724" : "#fff",
        inputBorder: isDark ? "#334155" : "#ccc",
        btnBg: isDark ? "#e6eef7" : "#111",
        btnText: isDark ? "#0b0f14" : "#fff",
        ghostBg: isDark ? "#0f1724" : "#fff",
        ghostBorder: isDark ? "#334155" : "#ddd",
        green: "#22c55e",
        barBg: isDark ? "#1f2937" : "#eee",
        danger: "#ef4444",
        star: "#ffd54a",
      };

      return {
        page: {
          padding: 18,
          fontFamily: "Arial",
          maxWidth: 520,
          margin: "0 auto",
          background: C.bg,
          color: C.text,
          minHeight: "100vh",
        },
        headerRow: {
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
          marginBottom: 12,
          flexWrap: "wrap",
        },
        headerBtns: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
        formRow: {
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 10,
        },
        input: {
          padding: 10,
          borderRadius: 8,
          border: `1px solid ${C.inputBorder}`,
          background: C.inputBg,
          color: C.text,
        },
        select: {
          padding: 10,
          borderRadius: 8,
          border: `1px solid ${C.inputBorder}`,
          background: C.inputBg,
          color: C.text,
        },
        btn: {
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid #222",
          background: C.btnBg,
          color: C.btnText,
          fontWeight: 700,
        },
        btnGhost: (active) => ({
          padding: "10px 12px",
          borderRadius: 8,
          border: `1px solid ${C.ghostBorder}`,
          background: active ? C.btnBg : C.ghostBg,
          color: active ? C.btnText : C.text,
          fontWeight: 700,
        }),
        card: {
          border: `1px solid ${C.border}`,
          background: C.card,
          borderRadius: 12,
          padding: 12,
        },
        listWrap: { display: "flex", flexDirection: "column", gap: 12 },
        gridWrap: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        },
        titleRow: {
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          alignItems: "center",
        },
        tag: {
          fontSize: 12,
          padding: "3px 8px",
          borderRadius: 999,
          border: `1px solid ${C.border}`,
          display: "inline-block",
          marginRight: 6,
          marginTop: 4,
          color: C.subText,
        },
        starBtn: (active) => ({
          border: `1px solid ${C.border}`,
          background: active ? C.star : "transparent",
          borderRadius: 10,
          padding: "6px 10px",
          fontSize: 16,
          color: active ? "#000" : C.text,
        }),
        iconBtn: {
          border: `1px solid ${C.border}`,
          background: "transparent",
          borderRadius: 10,
          padding: "6px 10px",
          fontSize: 16,
          color: C.text,
        },
        dangerBtn: {
          border: `1px solid ${C.border}`,
          background: C.danger,
          borderRadius: 10,
          padding: "6px 10px",
          fontSize: 16,
          color: "white",
          fontWeight: 700,
        },
        barWrap: {
          height: 10,
          background: C.barBg,
          borderRadius: 999,
          overflow: "hidden",
          marginTop: 6,
        },
        barFill: (pct) => ({
          height: "100%",
          width: `${pct}%`,
          background: C.green,
        }),
        small: { fontSize: 12, color: C.subText },
        hr: { border: "none", borderTop: `1px solid ${C.border}`, margin: "10px 0" },
        labsBox: {
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 10,
          marginBottom: 12,
          background: isDark ? "#0f1724" : "#fff",
        },
        toggleRow: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        },
      };
    },
    [isDark]
  );

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={{ margin: 0 }}>My Goal Tracker</h1>
          <div style={styles.small}>
            Priority ⭐ + Auto Save 💾 + Vision Board 🧩 + Streak 🔥 (toggle)
          </div>
        </div>

        <div style={styles.headerBtns}>
          <button
            style={styles.btnGhost(view === "list")}
            onClick={() => setView("list")}
          >
            List
          </button>
          <button
            style={styles.btnGhost(view === "grid")}
            onClick={() => setView("grid")}
          >
            Grid
          </button>

          {/* 🌙 Dark Mode */}
          <button
            style={styles.btnGhost(isDark)}
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            title="Dark Mode"
          >
            {isDark ? "🌙 Dark" : "☀️ Light"}
          </button>

          <button style={styles.btnGhost(false)} onClick={resetAll}>
            Reset
          </button>
        </div>
      </div>

      {/* ✅ LABS */}
      <div style={styles.labsBox}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>The Labs ⚙️</div>
        <div style={styles.toggleRow}>
          <div>
            <div style={{ fontWeight: 600 }}>Chain / Streak System 🔥</div>
            <div style={styles.small}>
              When ON, updating a goal daily will increase the streak.
            </div>
          </div>
          <button
            style={styles.btnGhost(!!labs.streak)}
            onClick={() => setLabs((p) => ({ ...p, streak: !p.streak }))}
          >
            {labs.streak ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* ADD FORM */}
      <div style={styles.formRow}>
        <input
          style={{ ...styles.input, flex: "1 1 220px" }}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Goal name (e.g., 1000 Salat)"
        />

        <select
          style={styles.select}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="counter">Counter</option>
          <option value="progress">Progress/Value</option>
          <option value="checklist">Checklist</option>
        </select>

        {type === "progress" && (
          <input
            style={{ ...styles.input, width: 110 }}
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Target"
          />
        )}

        {type === "checklist" && (
          <input
            style={{ ...styles.input, width: 140 }}
            type="number"
            value={tasksCount}
            onChange={(e) => setTasksCount(e.target.value)}
            placeholder="Tasks count"
          />
        )}

        <button style={styles.btn} onClick={addGoal}>
          + Add Goal
        </button>
      </div>

      {sortedGoals.length === 0 ? (
        <p style={styles.small}>No goals yet. Add one above.</p>
      ) : null}

      <div style={view === "grid" ? styles.gridWrap : styles.listWrap}>
        {sortedGoals.map((g) => {
          let pct = 0;

          if (g.type === "progress") {
            const safeTarget = g.target > 0 ? g.target : 1;
            pct = Math.max(
              0,
              Math.min(100, Math.round((Number(g.value) / safeTarget) * 100))
            );
          }

          let doneCount = 0;
          if (g.type === "checklist") {
            doneCount = g.tasks.filter((t) => t.done).length;
            pct =
              g.tasks.length > 0
                ? Math.round((doneCount / g.tasks.length) * 100)
                : 0;
          }

          const isEditing = editingId === g.id;

          return (
            <div key={g.id} style={styles.card}>
              <div style={styles.titleRow}>
                <div style={{ flex: 1 }}>
                  {/* ✏️ Edit goal name */}
                  {!isEditing ? (
                    <h3 style={{ margin: 0 }}>{g.title}</h3>
                  ) : (
                    <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                      <input
                        style={{ ...styles.input, flex: 1 }}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Edit goal name"
                      />
                      <button
                        style={styles.btn}
                        onClick={() => saveEdit(g.id)}
                        title="Save"
                      >
                        Save
                      </button>
                      <button style={styles.iconBtn} onClick={cancelEdit}>
                        ✖
                      </button>
                    </div>
                  )}

                  <div style={styles.small}>
                    <span style={styles.tag}>{g.type}</span>
                    {g.priority ? <span style={styles.tag}>Priority</span> : null}
                    {labs.streak ? (
                      <span style={styles.tag}>🔥 Streak: {g.streak || 0}</span>
                    ) : null}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    style={styles.starBtn(g.priority)}
                    onClick={() => togglePriority(g.id)}
                    title="Toggle Priority"
                  >
                    {g.priority ? "⭐" : "☆"}
                  </button>

                  {/* ✏️ edit button */}
                  <button
                    style={styles.iconBtn}
                    onClick={() => startEdit(g)}
                    title="Edit goal name"
                  >
                    ✏️
                  </button>

                  {/* 🗑️ delete button */}
                  <button
                    style={styles.dangerBtn}
                    onClick={() => deleteGoal(g.id)}
                    title="Delete goal"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {g.type === "counter" && (
                <div style={{ marginTop: 8 }}>
                  <div style={styles.small}>
                    Count: <b>{g.count}</b>
                  </div>
                  <button
                    style={{ ...styles.btn, marginTop: 8 }}
                    onClick={() => incCounter(g.id)}
                  >
                    +
                  </button>
                </div>
              )}

              {g.type === "progress" && (
                <div style={{ marginTop: 8 }}>
                  <div style={styles.small}>
                    Value: <b>{g.value}</b> / Target: <b>{g.target}</b>
                  </div>

                  <input
                    style={{ ...styles.input, marginTop: 8, width: "100%" }}
                    type="number"
                    value={g.value}
                    onChange={(e) => setProgressValue(g.id, e.target.value)}
                    placeholder="Enter current value"
                  />

                  <div style={styles.barWrap}>
                    <div style={styles.barFill(pct)} />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 6,
                    }}
                  >
                    <span style={styles.small}>{pct}% completed</span>
                    <span style={styles.small}>
                      Remaining:{" "}
                      <b>{Math.max(0, g.target - Number(g.value || 0))}</b>
                    </span>
                  </div>
                </div>
              )}

              {g.type === "checklist" && (
                <div style={{ marginTop: 8 }}>
                  <div style={styles.small}>
                    Done: <b>{doneCount}</b> / <b>{g.tasks.length}</b> ({pct}%)
                  </div>

                  <div style={styles.barWrap}>
                    <div style={styles.barFill(pct)} />
                  </div>

                  <div style={styles.hr} />

                  {g.tasks.map((t) => (
                    <label
                      key={t.id}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={() => toggleTask(g.id, t.id)}
                      />
                      <span
                        style={{
                          textDecoration: t.done ? "line-through" : "none",
                        }}
                      >
                        {t.label}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}