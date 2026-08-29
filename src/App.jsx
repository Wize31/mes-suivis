import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Droplets,
  FileJson,
  GripVertical,
  Heart,
  Pencil,
  Plus,
  Settings2,
  Sparkles,
  Star,
  Trash2,
  Undo2,
  Wine,
  X,
} from "lucide-react";

const palette = [
  "#e98585",
  "#e7b75c",
  "#72b99a",
  "#72a9cf",
  "#9f8bd0",
  "#d98eaf",
  "#e39c68",
];
const uid = (prefix = "id") =>
  `${prefix}-${crypto.randomUUID?.() || Date.now() + Math.random()}`;
const pad = (n) => String(n).padStart(2, "0");
const keyFor = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const readableDate = (date) =>
  new Intl.DateTimeFormat("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
const monthName = (date) =>
  new Intl.DateTimeFormat("fr-CA", { month: "long", year: "numeric" }).format(
    date,
  );
const clone = (value) => JSON.parse(JSON.stringify(value));

const starterModules = [
  {
    id: uid("m"),
    title: "Note de la journée",
    subtitle: "Une impression globale",
    type: "rating",
    color: "#e7b75c",
    shape: "star",
    max: 5,
    levels: [
      { value: 1, label: "Difficile", color: "#d57474" },
      { value: 2, label: "", color: "#e39c68" },
      { value: 3, label: "Moyenne", color: "#e7b75c" },
      { value: 4, label: "", color: "#9cc98a" },
      { value: 5, label: "Super", color: "#72b99a" },
    ],
  },
  {
    id: uid("m"),
    title: "Travail",
    subtitle: "Minutes, pourboires et rémunération",
    type: "number",
    color: "#e39c68",
    fields: [
      { id: "minutes", label: "Minutes travaillées", unit: "min", color: palette[0] },
      { id: "points", label: "Points de pourboire", unit: "pts", color: palette[1] },
    ],
    computed: [
      {
        id: "salaire",
        label: "Salaire à 13,30 $/h",
        visible: false,
        formula: "minutes / 60 * 13.30",
        unit: "$",
      },
      {
        id: "pourboires",
        label: "Total pourboires",
        visible: false,
        formula: "points * 4",
        unit: "$",
      },
      {
        id: "total",
        label: "Totale",
        visible: true,
        formula: "minutes / 60 * 13.30 + points * 4",
        unit: "$",
      },
    ],
  },
];

const starterProject = {
  id: "premier-projet",
  name: "Premier projet",
  emoji: "🌷",
  color: "#d98eaf",
  modules: starterModules,
};
const normalizeState = (raw) => {
  const next = raw || { projects: [starterProject], entries: {}, savedDays: {} };
  next.savedDays = next.savedDays || {};
  next.projects = (next.projects || []).map((project) => ({
    ...project,
    modules: (project.modules || []).map((module) => {
      if (module.title !== "Travail" || module.type !== "number") return module;
      return {
        ...module,
        subtitle: "Minutes, pourboires et rémunération",
        fields: [
          { id: "minutes", label: "Minutes travaillées", unit: "min", color: palette[0] },
          { id: "points", label: "Points de pourboire", unit: "pts", color: palette[1] },
        ],
        computed: [
          {
            id: "salaire",
            label: "Salaire à 13,30 $/h",
            visible: false,
            formula: "minutes / 60 * 13.30",
            unit: "$",
          },
          {
            id: "pourboires",
            label: "Total pourboires",
            visible: false,
            formula: "points * 4",
            unit: "$",
          },
          {
            id: "total",
            label: "Totale",
            visible: true,
            formula: "minutes / 60 * 13.30 + points * 4",
            unit: "$",
          },
        ],
      };
    }),
  }));
  Object.entries(next.entries || {}).forEach(([key, entry]) => {
    const work = next.projects
      .flatMap((project) => project.modules)
      .find((module) => module.title === "Travail");
    if (
      work &&
      entry[work.id] &&
      entry[work.id].heures !== undefined &&
      entry[work.id].minutes === undefined
    )
      entry[work.id].minutes = Number(entry[work.id].heures) * 60;
  });
  return next;
};
const migrateFlexibleNumbers = (state) => {
  const workModules = state.projects
    .flatMap((project) => project.modules)
    .filter((module) => module.title === "Travail" && module.type === "number");
  workModules.forEach((module) => {
    module.fields = [
      { id: "heures", label: "Heures", unit: "h", color: palette[0] },
      { id: "minutes", label: "Minutes", unit: "min", color: palette[1] },
      { id: "points", label: "Points de pourboire", unit: "pts", color: palette[2] },
    ];
    module.computed = [
      {
        id: "salaire",
        label: "Salaire à 13,30 $/h",
        visible: false,
        formula: "(heures + minutes / 60) * 13.30",
        unit: "$",
      },
      {
        id: "pourboires",
        label: "Total pourboires",
        visible: false,
        formula: "points * 4",
        unit: "$",
      },
      {
        id: "total",
        label: "Totale",
        visible: true,
        formula: "(heures + minutes / 60) * 13.30 + points * 4",
        unit: "$",
      },
    ];
  });
  Object.values(state.entries || {}).forEach((entry) =>
    workModules.forEach((module) => {
      const value = entry[module.id];
      if (!value) return;
      if (value.minutes === undefined && value.heures !== undefined) {
        value.minutes = 0;
      }
      if (value.heures === undefined && value.minutes !== undefined) {
        value.heures = Math.floor(Number(value.minutes) / 60);
        value.minutes = Number(value.minutes) % 60;
      }
    }),
  );
  return state;
};
const loadState = () => {
  try {
    return migrateFlexibleNumbers(
      normalizeState(JSON.parse(localStorage.getItem("mes-suivis"))),
    );
  } catch {
    return migrateFlexibleNumbers(normalizeState());
  }
};
const persistState = (next) => {
  try {
    localStorage.setItem("mes-suivis", JSON.stringify(next));
  } catch {
  }
};
const loadUserName = () => {
  try {
    return localStorage.getItem("mes-suivis-name") || "";
  } catch {
    return "";
  }
};
const persistUserName = (name) => {
  try {
    localStorage.setItem("mes-suivis-name", name);
  } catch {
  }
};

function App() {
  const [state, setState] = useState(loadState);
  const [projectId, setProjectId] = useState(null);
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState("today");
  const [userName, setUserName] = useState(loadUserName);
  useEffect(() => {
    persistState(state);
    const flush = () => persistState(state);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, [state]);
  const saveAll = () =>
    setState((s) => {
      const dayKey = `${projectId}:${keyFor(date)}`;
      const next = {
        ...s,
        savedDays: { ...s.savedDays, [dayKey]: true },
      };
      persistState(next);
      return next;
    });
  const project = state.projects.find((item) => item.id === projectId);
  const updateProject = (patch) =>
    setState((s) => {
      const next = {
        ...s,
        projects: s.projects.map((p) =>
          p.id === projectId ? { ...p, ...patch } : p,
        ),
      };
      persistState(next);
      return next;
    });
  const updateEntry = (moduleId, value) =>
    setState((s) => {
      const next = {
        ...s,
        entries: {
          ...s.entries,
          [`${projectId}:${keyFor(date)}`]: {
            ...(s.entries[`${projectId}:${keyFor(date)}`] || {}),
            [moduleId]: value,
          },
        },
      };
      persistState(next);
      return next;
    });
  if (!project)
    return (
      <>
        {!userName && (
          <NamePrompt
            onSave={(name) => {
              persistUserName(name);
              setUserName(name);
            }}
          />
        )}
        <Home
          userName={userName}
          projects={state.projects}
          onOpen={setProjectId}
        onCreate={(p) => {
          const next = { ...p, id: uid("project"), modules: [] };
          setState((s) => ({ ...s, projects: [...s.projects, next] }));
        }}
        onDelete={(id) =>
          setState((s) => ({
            ...s,
            projects: s.projects.filter((p) => p.id !== id),
          }))
        }
        />
      </>
    );
  const entry = state.entries[`${projectId}:${keyFor(date)}`] || {};
  return (
    <Project
      project={project}
      date={date}
      setDate={setDate}
      view={view}
      setView={setView}
      entry={entry}
      entries={state.entries}
      savedDays={state.savedDays}
      onEntry={updateEntry}
      onSave={saveAll}
      onBack={() => setProjectId(null)}
      onProject={updateProject}
      onDelete={() => {
        setState((s) => ({
          ...s,
          projects: s.projects.filter((p) => p.id !== projectId),
        }));
        setProjectId(null);
      }}
    />
  );
}

function Home({ userName, projects, onOpen, onCreate, onDelete }) {
  const [modal, setModal] = useState(false);
  return (
    <main className="home page-width">
      <div className="brand-mark">
        <Sparkles size={18} /> mes suivis
      </div>
      <header className="home-head">
        <div>
          <h1>
            Qu'est-ce qu'on suit{userName ? ` « ${userName} »` : ""}
            <br />
            <em>aujourd'hui ?</em>
          </h1>
          <p className="intro">
            Un endroit doux et simple pour te souvenir.
          </p>
        </div>
        <div className="sun-note">
          {new Date().toLocaleDateString("fr-CA", {
            day: "numeric",
            month: "long",
          })}
          <span>une journée à la fois</span>
        </div>
      </header>
      <section className="project-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">tes espaces</p>
            <h2>Choisir un projet</h2>
          </div>
          <span>
            {projects.length} projet{projects.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="project-grid">
          {projects.map((p) => (
            <article
              className="project-tile"
              style={{ "--accent": p.color }}
              key={p.id}
            >
              <button className="tile-main" onClick={() => onOpen(p.id)}>
                <span className="tile-emoji">{p.emoji}</span>
                <strong>{p.name}</strong>
                <small>{p.modules.length} suivis configurés</small>
              </button>
              <button
                className="tile-delete"
                aria-label={`Supprimer ${p.name}`}
                onClick={() => {
                  if (confirm(`Supprimer le projet « ${p.name} » ?`))
                    onDelete(p.id);
                }}
              >
                <Trash2 size={15} />
              </button>
            </article>
          ))}
          <button className="new-project" onClick={() => setModal(true)}>
            <span>
              <Plus />
            </span>
            <strong>Nouveau projet</strong>
            <small>Créer un espace sur mesure</small>
          </button>
        </div>
      </section>
      {modal && (
        <ProjectModal
          onClose={() => setModal(false)}
          onSave={(p) => {
            onCreate(p);
            setModal(false);
          }}
        />
      )}
    </main>
  );
}

function Project({
  project,
  date,
  setDate,
  view,
  setView,
  entry,
  entries,
  savedDays,
  onEntry,
  onSave,
  onBack,
  onProject,
  onDelete,
}) {
  const [editing, setEditing] = useState(null);
  const [settings, setSettings] = useState(false);
  const [saved, setSaved] = useState(false);
  const moveDate = (amount) =>
    setDate(
      (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + amount),
    );
  return (
    <main className="app-shell">
      <header className="app-header page-width">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={17} /> Projets
        </button>
        <div className="project-title">
          <span>{project.emoji}</span>
          <strong>{project.name}</strong>
        </div>
        <button
          className="icon-button"
          onClick={() => setSettings(true)}
          aria-label="Réglages"
        >
          <Settings2 size={19} />
        </button>
      </header>
      <nav className="top-nav page-width">
        <button
          className={view === "today" ? "active" : ""}
          onClick={() => setView("today")}
        >
          Aujourd'hui
        </button>
        <button
          className={view === "history" ? "active" : ""}
          onClick={() => setView("history")}
        >
          <CalendarDays size={15} /> Historique
        </button>
        <button
          className={view === "stats" ? "active" : ""}
          onClick={() => setView("stats")}
        >
          <BarChart3 size={15} /> Statistiques
        </button>
      </nav>
      {view === "today" ? (
        <section className="today-view page-width">
          <div className="date-bar">
            <button className="icon-button" onClick={() => moveDate(-1)}>
              <ChevronLeft />
            </button>
            <div>
              <span className="date-label">
                {savedDays?.[`${project.id}:${keyFor(date)}`] && (
                  <Check
                    className="date-saved-check"
                    size={21}
                    strokeWidth={3.5}
                    aria-label="Journée enregistrée"
                    title="Journée enregistrée"
                  />
                )}
                {readableDate(date)}
              </span>
              {keyFor(date) === keyFor(new Date()) ? (
                <small>on est ici</small>
              ) : (
                <button
                  className="today-link"
                  onClick={() => setDate(new Date())}
                >
                  revenir à aujourd'hui
                </button>
              )}
            </div>
            <button className="icon-button" onClick={() => moveDate(1)}>
              <ChevronRight />
            </button>
          </div>
          <div className="module-list">
            {project.modules.length ? (
              project.modules.map((m) => (
                <TrackerCard
                  key={m.id}
                  module={m}
                  value={entry[m.id]}
                  open={editing === m.id}
                  onToggle={() => setEditing(editing === m.id ? null : m.id)}
                  onChange={(v) => onEntry(m.id, v)}
                />
              ))
            ) : (
              <EmptySettings />
            )}
          </div>
          <button
            className={`save-tracking ${saved ? "is-saved" : ""}`}
            onClick={() => {
              onSave();
              setSaved(true);
              window.setTimeout(() => setSaved(false), 2200);
            }}
          >
            {saved ? <><Check size={17} /> Enregistré</> : "Enregistrer"}
          </button>
        </section>
      ) : view === "history" ? (
        <History
          project={project}
          entries={entries}
          onPick={(d) => {
            setDate(d);
            setView("today");
          }}
        />
      ) : (
        <Stats project={project} entries={entries} savedDays={savedDays} />
      )}
      {settings && (
        <Settings
          project={project}
          onProject={onProject}
          onClose={() => setSettings(false)}
          onDelete={onDelete}
        />
      )}
    </main>
  );
}

const hasNumberValue = (module, value) =>
  Boolean(
    value &&
      (module.fields || []).some(
        (field) => value[field.id] !== undefined && value[field.id] !== "" && value[field.id] !== null,
      ),
  );
const numberSummary = (module, value) =>
  module.computed?.length
    ? module.computed
        .filter((computed) => computed.visible !== false)
        .map(
          (computed) =>
            `${computed.label}: ${calculate(computed.formula, value, module.fields, module.computed)}${computed.unit || ""}`,
        )
        .join(" · ") || "vide"
    : (module.fields || [])
        .filter((field) => value?.[field.id] !== undefined && value?.[field.id] !== "" && value?.[field.id] !== null)
        .map((field) => `${field.label}: ${value[field.id]}${field.unit || ""}`)
        .join(" · ");

function TrackerCard({ module, value, open, onToggle, onChange }) {
  const summary =
    module.type === "scale" && typeof value === "number"
      ? `${value}/10`
      : module.type === "rating"
        ? typeof value === "number" && value > 0
          ? `${value}/${module.max || 5}`
          : "vide"
        : module.type === "text"
        ? value
          ? `${value.slice(0, 45)}${value.length > 45 ? "…" : ""}`
          : "vide"
        : module.type === "number"
          ? hasNumberValue(module, value)
            ? numberSummary(module, value)
            : "vide"
          : module.type === "check"
            ? Array.isArray(value)
              ? module.options
                  ?.filter((o) => value.includes(o.id))
                  .map((o) => o.label)
                  .join(", ")
              : value
                ? "coché"
                : "vide"
            : module.options
                ?.filter((o) =>
                  module.type === "multi"
                    ? value?.includes(o.id)
                    : value === o.id,
                )
                .map((o) => o.label)
                .join(", ") || "vide";
  return (
    <article
      className={`tracker-card ${open ? "expanded" : ""}`}
      style={{ "--accent": module.color }}
    >
      <button className="tracker-head" onClick={onToggle}>
        <span className="tracker-dot" />
        <span className="tracker-copy">
          <strong>{module.title}</strong>
          <small>{module.subtitle}</small>
        </span>
        <span className="summary">{summary}</span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && (
        <div className="tracker-body">
          <ValueEditor module={module} value={value} onChange={onChange} />
        </div>
      )}
    </article>
  );
}

function ValueEditor({ module, value, onChange }) {
  if (module.type === "text")
    return (
      <textarea
        autoFocus
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Écris ce que tu veux garder en tête..."
      />
    );
  if (module.type === "rating") {
    const max = module.max || 5;
    const n = typeof value === "number" ? value : 0;
    const RatingIcon = module.shape === "heart" ? Heart : module.shape === "wine" ? Wine : Star;
    const activeLevel = module.levels?.find((level) => level.value === n);
    const activeColor = activeLevel?.color || module.color;
    return (
      <div className="rating-editor">
        {Array.from({ length: max }, (_, i) => i + 1).map((level) => (
          <button
            key={level}
            className={`rating-icon ${level <= n ? "filled" : ""}`}
            style={{ "--rating-color": level <= n ? module.levels?.[level - 1]?.color || activeColor : undefined }}
            onClick={() => onChange(n === level ? 0 : level)}
            aria-label={`${level}/${max}`}
          >
            <RatingIcon size={26} fill={level <= n ? "currentColor" : "none"} />
          </button>
        ))}
        <span className="rating-value">
          {n}/{max}
          {activeLevel?.label && ` · ${activeLevel.label}`}
        </span>
      </div>
    );
  }
  if (module.type === "scale") {
    const n = typeof value === "number" ? value : 5;
    const scaleAnchors = sortAnchors(module.anchors || []);
    const scaleGradient = scaleAnchors.length
      ? `linear-gradient(to right, ${scaleAnchors.map((anchor) => `${anchor.color} ${anchor.value * 10}%`).join(", ")})`
      : module.color;
    const scaleColor = nearestAnchor(scaleAnchors, n)?.color || module.color;
    return (
      <div className="scale-editor">
        <input
          type="range"
          min="0"
          max="10"
          value={n}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ "--scale-gradient": scaleGradient, "--scale-color": scaleColor }}
        />
        <div className="scale-value">
          <b style={{ color: scaleColor }}>
            {n}/10
          </b>
          <span>{nearestAnchor(module.anchors, n)?.label}</span>
        </div>
        <div className="anchor-labels">
          <span>{scaleAnchors[0]?.label}</span>
          <span>{scaleAnchors.at(-1)?.label}</span>
        </div>
      </div>
    );
  }
  if (module.type === "number")
    return (
      <div className="number-fields">
        {module.fields?.map((f) => (
          <label key={f.id}>
            {f.label}
            <span>
              <input
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                value={value?.[f.id] ?? ""}
                onChange={(e) =>
                  onChange({ ...(value || {}), [f.id]: e.target.value })
                }
                placeholder="0"
              />
              {f.unit}
            </span>
          </label>
        ))}
        {module.computed
          ?.filter((c) => module.title !== "Travail" || c.id === "total")
          .map((c) => (
          <div className="calculated" key={c.id}>
            <span>{c.label}</span>
            <b>
              {calculate(c.formula, value, module.fields, module.computed)}
              {c.unit}
            </b>
          </div>
        ))}
      </div>
    );
  if (module.type === "check" && module.options) {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="option-list">
        {module.options.map((o) => {
          const active = selected.includes(o.id);
          return (
            <button
              className={active ? "selected" : ""}
              style={{ "--option": o.color }}
              key={o.id}
              onClick={() =>
                onChange(
                  active
                    ? selected.filter((id) => id !== o.id)
                    : [...selected, o.id],
                )
              }
            >
              <span />
              <Check size={13} /> {o.label}
            </button>
          );
        })}
      </div>
    );
  }
  if (module.type === "check")
    return (
      <label className="check-editor">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          <Check size={15} />
        </span>{" "}
        Marquer comme fait
      </label>
    );
  const selected =
    module.type === "multi" ? (Array.isArray(value) ? value : []) : value;
  return (
    <div className="option-list">
      {module.options?.map((o) => {
        const active =
          module.type === "multi" ? selected.includes(o.id) : selected === o.id;
        return (
          <button
            className={active ? "selected" : ""}
            style={{ "--option": o.color }}
            key={o.id}
            onClick={() =>
              onChange(
                module.type === "multi"
                  ? active
                    ? selected.filter((id) => id !== o.id)
                    : [...selected, o.id]
                  : active
                    ? null
                    : o.id,
              )
            }
          >
            <span />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
const nearestAnchor = (anchors = [], n) =>
  [...anchors].sort(
    (a, b) => Math.abs(a.value - n) - Math.abs(b.value - n),
  )[0] || { label: "" };
const sortAnchors = (anchors) =>
  [...anchors].sort((first, second) => first.value - second.value);
const formulaName = (name) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_$]/g, "_")
    .replace(/^\d/, "_$&");
const escapeFormulaText = (text) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const calculate = (formula, value = {}, fields = [], computed = [], resolving = []) => {
  try {
    const variables = {};
    const aliases = [];
    const addVariable = (label, name, variableValue) => {
      variables[name] = variableValue;
      if (label) aliases.push([label, name]);
    };
    fields.forEach((field) => {
      const variableName = formulaName(field.id);
      addVariable(field.id, variableName, Number(value[field.id] || 0));
      addVariable(field.label, variableName, variables[variableName]);
    });
    computed.forEach((item) => {
      const variableName = formulaName(item.id);
      const variableValue = resolving.includes(item.id)
        ? 0
        : Number(calculate(item.formula, value, fields, computed, [...resolving, item.id]));
      addVariable(item.id, variableName, variableValue);
      addVariable(item.label, variableName, variableValue);
    });
    const expression = aliases
      .sort(([a], [b]) => b.length - a.length)
      .reduce((result, [label, name]) =>
        result.replace(new RegExp(escapeFormulaText(label), "gi"), name), formula);
    return (
      Math.round(
        Function(
          ...Object.keys(variables),
          `return ${expression}`,
        )(...Object.values(variables)) * 100,
      ) / 100
    );
  } catch {
    return "—";
  }
};
function EmptySettings() {
  return (
    <div className="empty-state">
      <Droplets size={25} />
      <strong>Ton espace est prêt à être rempli</strong>
      <span>Ajoute un suivi dans les réglages pour commencer.</span>
    </div>
  );
}

function CalendarHistory({ project, entries, selectedModules, onPick }) {
  const [period, setPeriod] = useState("month");
  const [cursor, setCursor] = useState(new Date());
  const days =
    period === "week"
      ? Array.from(
          { length: 7 },
          (_, i) =>
            new Date(
              cursor.getFullYear(),
              cursor.getMonth(),
              cursor.getDate() - cursor.getDay() + i + 1,
            ),
        )
      : Array.from(
          {
            length: new Date(
              cursor.getFullYear(),
              cursor.getMonth() + 1,
              0,
            ).getDate(),
          },
          (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1),
        );
  const change = (n) =>
    setCursor(
      (d) =>
        new Date(
          d.getFullYear(),
          d.getMonth() + (period === "month" ? n : 0),
          d.getDate() + (period === "week" ? n * 7 : 0),
        ),
    );
  return (
    <section className="history page-width">
      <div className="history-top">
        <div>
          <p className="eyebrow">vue d'ensemble</p>
          <h1>{period === "week" ? "Cette semaine" : monthName(cursor)}</h1>
        </div>
        <div className="period-tabs">
          {[
            ["week", "Semaine"],
            ["month", "Mois"],
          ].map(([id, label]) => (
            <button
              className={period === id ? "active" : ""}
              onClick={() => setPeriod(id)}
              key={id}
            >
              {label}
            </button>
          ))}
          <button
            className={period === "year" ? "active" : ""}
            onClick={() => setPeriod("year")}
          >
            Année
          </button>
        </div>
      </div>
      <div className="history-nav">
        <button className="icon-button" onClick={() => change(-1)}>
          <ChevronLeft />
        </button>
        <span>
          {period === "week"
            ? `${days[0].getDate()} - ${days[6].getDate()} ${monthName(days[6])}`
            : monthName(cursor)}
        </span>
        <button className="icon-button" onClick={() => change(1)}>
          <ChevronRight />
        </button>
      </div>
      {period === "year" ? (
        <YearView
          project={project}
          entries={entries}
          selectedModules={selectedModules}
          year={cursor.getFullYear()}
          onPick={onPick}
        />
      ) : (
        <div className={`calendar ${period}`}>
          <div className="weekdays">
            {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          {days.map((d) => {
            const dayEntry = entries?.[`${project.id}:${keyFor(d)}`] || {};
            const results = project.modules
              .map((module) => valueLabel(module, dayEntry[module.id]))
              .filter(Boolean);
            return (
              <button
                key={keyFor(d)}
                onClick={() => onPick(d)}
                className={keyFor(d) === keyFor(new Date()) ? "today" : ""}
              >
                <b>{d.getDate()}</b>
                <span className="day-results">
                  {results.slice(0, 3).map((result, index) => (
                    <small key={index}>{result}</small>
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

const valueLabel = (module, value) => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && !value.length) ||
    (module.type === "rating" && !value)
  )
    return "";
  if (module.type === "rating") {
    const level = module.levels?.find((l) => l.value === value);
    return `${value}/${module.max || 5}${level?.label ? ` (${level.label})` : ""}`;
  }
  if (module.type === "scale")
    return `${value}/10 (${nearestAnchor(module.anchors, value).label})`;
  if (
    module.type === "choice" ||
    module.type === "multi" ||
    module.type === "check"
  )
    return (Array.isArray(value) ? value : [value])
      .map(
        (id) =>
          module.options?.find((o) => o.id === id)?.label ||
          (id === true ? "Coché" : id),
      )
      .join(", ");
  if (module.type === "number")
    return [
      ...(module.fields || [])
        .filter((f) => value[f.id] !== undefined && value[f.id] !== "")
        .map((f) => `${f.label}: ${value[f.id]}${f.unit}`),
      ...(module.computed || []).map(
        (c) => `${c.label}: ${calculate(c.formula, value, module.fields, module.computed)}${c.unit}`,
      ),
    ].join(" · ");
  return String(value);
};
const historyValueLabel = (module, value) => {
  if (module.title === "Travail" && module.type === "number") {
    if (!value || !Object.values(value).some((item) => item !== "" && item !== undefined)) return "";
    return (module.computed || [])
      .filter((computed) => ["salaire", "pourboires", "total"].includes(computed.id))
      .map((computed) => `${computed.id === "salaire" ? "Salaire" : computed.label}: ${calculate(computed.formula, value, module.fields, module.computed)}${computed.unit}`)
      .join(" · ");
  }
  return valueLabel(module, value);
};
const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
function downloadTracking(project, entries, scope = "all") {
  const rows = Object.entries(entries || {})
    .filter(
      ([key, value]) =>
        key.startsWith(`${project.id}:`) && Object.keys(value).length,
    )
    .filter(([key]) => scope === "all" || key.split(":")[1].startsWith(scope))
    .sort(([a], [b]) => a.localeCompare(b));
  const lines = [
    ["Date", "Suivi", "Résultat"],
    ...rows.flatMap(([key, values]) =>
      project.modules
        .map((module) => {
          const result = valueLabel(module, values[module.id]);
          return result ? [key.split(":")[1], module.title, result] : null;
        })
        .filter(Boolean),
    ),
  ].map((line) => line.map(csvCell).join(";"));
  const blob = new Blob([`\uFEFF${lines.join("\n")}`], {
    type: "text/csv;charset=utf-8",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${scope === "all" ? "tous-les-suivis" : scope}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
function downloadJson(project, entries) {
  const blob = new Blob(
    [
      JSON.stringify(
        { exportedAt: new Date().toISOString(), project, entries },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-sauvegarde.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}
function ExportTools({ project, entries }) {
  const month = new Date().toISOString().slice(0, 7);
  return (
    <div className="export-tools">
      <span>
        <Download size={15} /> Sauvegarder
      </span>
      <button onClick={() => downloadTracking(project, entries, month)}>
        CSV du mois
      </button>
      <button onClick={() => downloadTracking(project, entries)}>
        CSV complet
      </button>
      <button onClick={() => downloadJson(project, entries)}>
        <FileJson size={14} /> JSON
      </button>
    </div>
  );
}
function historyDays(period, cursor) {
  if (period === "week") {
    const mondayOffset = (cursor.getDay() + 6) % 7;
    const monday = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - mondayOffset);
    return Array.from({ length: 7 }, (_, index) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index));
  }
  if (period === "month") {
    const count = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    return Array.from({ length: count }, (_, index) => new Date(cursor.getFullYear(), cursor.getMonth(), index + 1));
  }
  const count = Math.round((new Date(cursor.getFullYear() + 1, 0, 1) - new Date(cursor.getFullYear(), 0, 1)) / 86400000);
  return Array.from({ length: count }, (_, index) => new Date(cursor.getFullYear(), 0, index + 1));
}

function History({ project, entries, onPick }) {
  const [period, setPeriod] = useState("month");
  const [cursor, setCursor] = useState(new Date());
  const trackableModules = project.modules.filter((module) => module.type !== "text");
  const [selectedModules, setSelectedModules] = useState(
    () => new Set(trackableModules.map((module) => module.id)),
  );
  const days = historyDays(period, cursor);
  const shift = period === "week" ? 7 : period === "month" ? 1 : 12;
  const title = period === "week" ? "Semaine" : period === "month" ? monthName(cursor) : `Année ${cursor.getFullYear()}`;
  const move = (amount) => setCursor((date) => new Date(date.getFullYear(), date.getMonth() + (period === "year" ? amount * 12 : period === "month" ? amount : 0), date.getDate() + (period === "week" ? amount * shift : 0)));
  const visibleModules = trackableModules.filter((module) => selectedModules.has(module.id));
  return (
    <section className="summary-history page-width">
      <div className="summary-history-head">
        <div><p className="eyebrow">vue tableau</p><h1>Historique</h1><span>{title}</span></div>
        <div className="period-tabs">{[["week", "Semaine"], ["month", "Mois"], ["year", "Année"]].map(([id, label]) => <button className={period === id ? "active" : ""} onClick={() => setPeriod(id)} key={id}>{label}</button>)}</div>
      </div>
      <div className="history-filters compact-filters">
        <div><strong>Suivis visibles</strong><div className="filter-actions"><button onClick={() => setSelectedModules(new Set(trackableModules.map((module) => module.id)))}>Tout</button><button onClick={() => setSelectedModules(new Set())}>Aucun</button></div></div>
        <div className="filter-options">{trackableModules.map((module) => <label key={module.id}><input type="checkbox" checked={selectedModules.has(module.id)} onChange={() => setSelectedModules((current) => { const next = new Set(current); next.has(module.id) ? next.delete(module.id) : next.add(module.id); return next; })} /><span style={{ background: module.color }} />{module.title}</label>)}</div>
      </div>
      <div className="history-nav"><button className="icon-button" onClick={() => move(-1)}><ChevronLeft /></button><strong>{period === "week" ? `${days[0].getDate()} - ${days[6].getDate()} ${monthName(days[6])}` : title}</strong><button className="icon-button" onClick={() => move(1)}><ChevronRight /></button></div>
      <div className="summary-table-wrap"><table className="summary-table"><thead><tr><th>Date</th>{visibleModules.map((module) => <th key={module.id}><span style={{ background: module.color }} />{module.title}</th>)}</tr></thead><tbody>{days.map((day) => { const values = entries?.[`${project.id}:${keyFor(day)}`] || {}; return <tr key={keyFor(day)}><th><button onClick={() => onPick(day)}>{new Intl.DateTimeFormat("fr-CA", { day: "2-digit", month: "short" }).format(day)}</button></th>{visibleModules.map((module) => <td key={module.id}>{historyValueLabel(module, values[module.id])}</td>)}</tr>; })}</tbody></table></div>
      {!visibleModules.length && <div className="empty-state">Sélectionne au moins un suivi à afficher.</div>}
      <ExportTools project={project} entries={entries} />
    </section>
  );
}

function LegacyHistory({ project, entries, onPick }) {
  const [selectedModules, setSelectedModules] = useState(
    () => new Set(project.modules.map((module) => module.id)),
  );
  const rows = Object.entries(entries || {})
    .filter(
      ([key, value]) =>
        key.startsWith(`${project.id}:`) && Object.keys(value).length,
    )
    .sort((a, b) => b[0].localeCompare(a[0]));
  return (
    <>
      <section className="history-filters page-width">
        <div>
          <p className="eyebrow">afficher dans l'historique</p>
          <strong>Suivis sélectionnés</strong>
        </div>
        <div className="filter-actions">
          <button
            onClick={() =>
              setSelectedModules(new Set(project.modules.map((module) => module.id)))
            }
          >
            Tout
          </button>
          <button onClick={() => setSelectedModules(new Set())}>Aucun</button>
        </div>
        <div className="filter-options">
          {project.modules.map((module) => (
            <label key={module.id}>
              <input
                type="checkbox"
                checked={selectedModules.has(module.id)}
                onChange={() =>
                  setSelectedModules((current) => {
                    const next = new Set(current);
                    if (next.has(module.id)) next.delete(module.id);
                    else next.add(module.id);
                    return next;
                  })
                }
              />
              <span style={{ background: module.color }} />
              {module.title}
            </label>
          ))}
        </div>
      </section>
      <CalendarHistory
        project={project}
        entries={entries}
        selectedModules={selectedModules}
        onPick={onPick}
      />
      <section className="history-details page-width">
        <div className="section-heading">
          <div>
            <p className="eyebrow">données enregistrées</p>
            <h2>Résultats précis</h2>
          </div>
          <span>
            {rows.length} journée{rows.length > 1 ? "s" : ""}
          </span>
        </div>
        <ExportTools project={project} entries={entries} />
        {rows.length ? (
          rows.map(([key, values]) => (
            <article className="history-day" key={key}>
              <button
                onClick={() =>
                  onPick(new Date(`${key.split(":")[1]}T12:00:00`))
                }
              >
                <strong>
                  {new Intl.DateTimeFormat("fr-CA", {
                    dateStyle: "full",
                  }).format(new Date(`${key.split(":")[1]}T12:00:00`))}
                </strong>
                <ChevronRight size={15} />
              </button>
              <div>
                {project.modules.filter((m) => selectedModules.has(m.id)).map((m) => {
                  const label = valueLabel(m, values[m.id]);
                  return label ? (
                    <p key={m.id}>
                      <i style={{ background: m.color }} />{" "}
                      <span>{m.title}</span>
                      <b>{label}</b>
                    </p>
                  ) : null;
                })}
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">
            Aucun résultat enregistré pour le moment.
          </div>
        )}
      </section>
    </>
  );
}

function Stats({ project, entries, savedDays }) {
  const [period, setPeriod] = useState("year");
  const [cursor, setCursor] = useState(new Date());
  const [chartMode, setChartMode] = useState("bars");
  const trackableModules = project.modules.filter((module) => module.type !== "text");
  const [selectedModules, setSelectedModules] = useState(
    () => new Set(trackableModules.map((module) => module.id)),
  );
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const start =
    period === "week"
      ? new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - ((cursor.getDay() + 6) % 7))
      : period === "month"
        ? new Date(cursor.getFullYear(), cursor.getMonth(), 1)
        : new Date(cursor.getFullYear(), 0, 1);
  const end =
    period === "week"
      ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
      : period === "month"
        ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
        : new Date(cursor.getFullYear() + 1, 0, 1);
  const totalDays = Math.round((end - start) / 86400000);
  const boundedEnd = end < todayEnd ? end : todayEnd;
  const trackedDays = Array.from({ length: totalDays }, (_, index) => {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return day < boundedEnd && savedDays?.[`${project.id}:${keyFor(day)}`];
  }).filter(Boolean).length;
  const rows = Object.entries(entries || {})
    .filter(([key, value]) => {
      if (!key.startsWith(`${project.id}:`)) return false;
      const d = new Date(`${key.split(":")[1]}T12:00:00`);
      return d >= start && d < boundedEnd && Object.keys(value).length;
    })
    .map(([, value]) => value);
  const moveCursor = (amount) =>
    setCursor((date) =>
      period === "week"
        ? new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount * 7)
        : period === "month"
          ? new Date(date.getFullYear(), date.getMonth() + amount, 1)
          : new Date(date.getFullYear() + amount, 0, 1),
    );
  const weekEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  const periodLabel =
    period === "week"
      ? `${new Intl.DateTimeFormat("fr-CA", { weekday: "long", day: "numeric" }).format(start)} au ${new Intl.DateTimeFormat("fr-CA", { weekday: "long", day: "numeric", month: "long" }).format(weekEnd)}`
      : period === "month"
        ? monthName(cursor)
        : `Année ${cursor.getFullYear()}`;
  const isCurrentPeriod = now >= start && now < end;
  return (
    <section className="stats page-width">
      <div className="history-top">
        <div>
          <p className="eyebrow">mes tendances</p>
          <h1>Statistiques</h1>
        </div>
        <div className="period-tabs">
          {[
            ["week", "Semaine"],
            ["month", "Mois"],
            ["year", "Année"],
          ].map(([id, label]) => (
            <button
              className={period === id ? "active" : ""}
              onClick={() => setPeriod(id)}
              key={id}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="history-nav">
        <button className="icon-button" onClick={() => moveCursor(-1)}>
          <ChevronLeft />
        </button>
        <strong>{periodLabel}</strong>
        {isCurrentPeriod ? (
          <button className="icon-button" disabled>
            <ChevronRight />
          </button>
        ) : (
          <button className="icon-button" onClick={() => moveCursor(1)}>
            <ChevronRight />
          </button>
        )}
      </div>
      {!isCurrentPeriod && (
        <button className="today-link" onClick={() => setCursor(new Date())}>
          revenir à la période actuelle
        </button>
      )}
      <p className="stats-caption">
        Pourcentages calculés sur les {totalDays} jours de la période, remplis
        ou non.
      </p>
      <div className="history-filters compact-filters stats-filters">
        <div>
          <strong>Suivis visibles</strong>
          <div className="filter-actions">
            <button onClick={() => setSelectedModules(new Set(trackableModules.map((module) => module.id)))}>Tout</button>
            <button onClick={() => setSelectedModules(new Set())}>Aucun</button>
          </div>
        </div>
        <div className="filter-options">
          {trackableModules.map((module) => (
            <label key={module.id}>
              <input type="checkbox" checked={selectedModules.has(module.id)} onChange={() => setSelectedModules((current) => { const next = new Set(current); next.has(module.id) ? next.delete(module.id) : next.add(module.id); return next; })} />
              <span style={{ background: module.color }} />
              {module.title}
            </label>
          ))}
        </div>
      </div>
      <div className="chart-switcher">
        <span>Affichage</span>
        <button className={chartMode === "bars" ? "active" : ""} onClick={() => setChartMode("bars")}>Barres</button>
        <button className={chartMode === "pie" ? "active" : ""} onClick={() => setChartMode("pie")}>Graphique rond</button>
        <button className={chartMode === "bands" ? "active" : ""} onClick={() => setChartMode("bands")}>Bandes</button>
      </div>
      <div className="stats-grid">
        {trackableModules.filter((m) => selectedModules.has(m.id)).map((m) => (
          <StatCard key={m.id} module={m} rows={rows} totalDays={totalDays} trackedDays={trackedDays} chartMode={chartMode} />
        ))}
      </div>
      {!selectedModules.size && <div className="empty-state">Sélectionne au moins un suivi à afficher.</div>}
    </section>
  );
}
const chartColor = (module, label) => {
  if (module.type === "rating") {
    const level = Number.parseInt(label, 10);
    return module.levels?.find((l) => l.value === level)?.color || module.color;
  }
  if (module.options) return module.options.find((option) => option.label === label)?.color || module.color;
  if (module.type === "scale") return nearestAnchor(module.anchors, Number.parseInt(label, 10))?.color || module.color;
  return module.color;
};
const pieGradient = (module, buckets, totalDays) => {
  let cursor = 0;
  const segments = buckets.filter((bucket) => bucket.count).map((bucket) => {
    const start = cursor / totalDays * 100;
    cursor += bucket.count;
    return `${chartColor(module, bucket.label)} ${start}% ${cursor / totalDays * 100}%`;
  });
  if (cursor < totalDays) segments.push(`#eee4df ${cursor / totalDays * 100}% 100%`);
  return `conic-gradient(${segments.join(", ")})`;
};
const formatStatNumber = (value) =>
  value.toLocaleString("fr-CA", { maximumFractionDigits: 2 });
const workTotals = (module, values) => {
  const totalComputed = module.computed?.find((computed) => computed.id === "total");
  return values.reduce(
    (totals, value) => {
      const hours = Number(value?.heures || 0) + Number(value?.minutes || 0) / 60;
      const tips = Number(value?.points || 0) * 4;
      const total = Number(calculate(totalComputed?.formula || "0", value, module.fields, module.computed));
      return {
        hours: totals.hours + hours,
        tips: totals.tips + tips,
        total: totals.total + (Number.isNaN(total) ? 0 : total),
      };
    },
    { hours: 0, tips: 0, total: 0 },
  );
};
const numberFieldTotals = (module, values) =>
  (module.fields || []).map((field, index) => ({
    label: field.label,
    unit: field.unit || "",
    color: field.color || palette[index % palette.length],
    total: values.reduce((sum, value) => sum + Number(value?.[field.id] || 0), 0),
  }));
const numberPieGradient = (totals) => {
  const total = totals.reduce((sum, item) => sum + item.total, 0);
  if (!total) return "#eee4df";
  let cursor = 0;
  return `conic-gradient(${totals
    .filter((item) => item.total > 0)
    .map((item) => {
      const start = (cursor / total) * 100;
      cursor += item.total;
      return `${item.color} ${start}% ${(cursor / total) * 100}%`;
    })
    .join(", ")})`;
};
const workDaysPieGradient = (workedDays, totalDays) => {
  const workedPercent = totalDays ? (workedDays / totalDays) * 100 : 0;
  return `conic-gradient(${palette[0]} 0% ${workedPercent}%, #eee4df ${workedPercent}% 100%)`;
};
function StatCard({ module, rows, totalDays, trackedDays, chartMode }) {
  const values = rows
    .map((row) => row[module.id])
    .filter(
      (value) =>
        value !== undefined &&
        value !== null &&
        value !== "" &&
        (!Array.isArray(value) || value.length),
    );
  if (!values.length && !trackedDays)
    return (
      <article className="stat-card">
        <h3>{module.title}</h3>
        <p>Aucune donnée pour cette période.</p>
      </article>
    );
  if (module.type === "number") {
    const fieldTotals = numberFieldTotals(module, values);
    if (chartMode === "pie") {
      const daysWithData = values.filter((value) => hasNumberValue(module, value)).length;
      const daysWithoutData = Math.max(totalDays - daysWithData, 0);
      const dataLabel = module.title === "Travail"
        ? "Jours travaillés"
        : module.fields?.length === 1
          ? `Jours avec ${module.fields[0].label.toLowerCase()}`
          : "Jours avec données";
      return (
        <article className="stat-card" style={{ "--accent": module.color }}>
          <h3>
            <i />
            {module.title}
          </h3>
          <small>{totalDays} jours dans la période</small>
          <div
            className="stat-pie"
            style={{ background: workDaysPieGradient(daysWithData, totalDays) }}
            aria-label={`${dataLabel} et jours sans données`}
          />
          <div className="number-stat-legend">
            <span><i style={{ background: palette[0] }} />{dataLabel}</span>
            <span><i style={{ background: "#eee4df" }} />Jours sans données</span>
          </div>
          <div className="work-stat-summary">
            <div><span>{dataLabel}</span><strong>{daysWithData}/{totalDays}</strong></div>
            <div><span>Jours sans données</span><strong>{daysWithoutData}/{totalDays}</strong></div>
          </div>
        </article>
      );
    }
    const workSummary = module.title === "Travail" ? workTotals(module, values) : null;
    const totals = module.title === "Travail"
      ? [
          { label: "Heures", unit: "h", total: workSummary.hours, color: palette[0] },
          { label: "Pourboires", unit: "$", total: workSummary.tips, color: palette[1] },
          { label: "Totale", unit: "$", total: workSummary.total, color: module.color },
        ]
      : fieldTotals;
    return (
      <article className="stat-card" style={{ "--accent": module.color }}>
        <h3>
          <i />
          {module.title}
        </h3>
        <small>
          {trackedDays} jour{trackedDays > 1 ? "s" : ""} comptabilisé
          {trackedDays > 1 ? "s" : ""} sur {totalDays}
        </small>
        {chartMode === "pie" && (
          <>
            <div
              className="stat-pie"
              style={{ background: numberPieGradient(fieldTotals) }}
              aria-label={`Graphique de ${module.title}`}
            />
            <div className="number-stat-legend">
              {fieldTotals.map((item) => (
                <span key={item.label}>
                  <i style={{ background: item.color }} />
                  {item.label}
                </span>
              ))}
            </div>
          </>
        )}
        {chartMode === "bars" && (
          <div className="numeric-bar-list" aria-label={`Barres de ${module.title}`}>
            {totals.map((item) => {
              const maximum = Math.max(...totals.map((entry) => entry.total), 1);
              return (
                <div className="stat-row" key={item.label}>
                  <span className="stat-label">{item.label}</span>
                  <strong>{formatStatNumber(item.total)}{item.unit ? ` ${item.unit}` : ""}</strong>
                  <div className="stat-bar">
                    <i style={{ width: `${Math.min((item.total / maximum) * 100, 100)}%`, background: item.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {chartMode === "bands" && (
          <div className="numeric-comparison" aria-label={`Comparaison de ${module.title}`}>
            {totals.map((item) => {
              const maximum = Math.max(...totals.map((entry) => entry.total), 1);
              const height = item.total > 0 ? Math.max((item.total / maximum) * 100, 8) : 0;
              return (
                <div className="numeric-comparison-item" key={item.label}>
                  <strong>{formatStatNumber(item.total)}{item.unit ? ` ${item.unit}` : ""}</strong>
                  <div className="numeric-comparison-track">
                    <i style={{ height: `${height}%`, background: item.color }} />
                  </div>
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </article>
    );
  }
  const buckets =
    module.type === "scale"
      ? Array.from({ length: 11 }, (_, i) => ({
          label: `${i}/10`,
          definition: nearestAnchor(module.anchors, i).label,
          count: values.filter((v) => v === i).length,
        }))
      : module.type === "rating"
        ? Array.from({ length: module.max || 5 }, (_, i) => ({
            label: `${i + 1}/${module.max || 5}`,
            definition: module.levels?.[i]?.label || "",
            count: values.filter((v) => v === i + 1).length,
          }))
      : module.options
        ? module.options.map((o) => ({
            label: o.label,
            count: values.filter((v) =>
              Array.isArray(v) ? v.includes(o.id) : v === o.id,
            ).length,
          }))
        : module.fields
          ? module.fields.map((field) => ({
              label: field.label,
              count: values.filter(
                (value) =>
                  value?.[field.id] !== undefined &&
                  value?.[field.id] !== "" &&
                  value?.[field.id] !== null,
              ).length,
            }))
        : module.type === "check"
          ? [{ label: "Coché", count: values.filter(Boolean).length }]
          : [
              {
                label: `${values.length} jour${values.length > 1 ? "s" : ""} rempli${values.length > 1 ? "s" : ""}`,
                count: values.length,
              },
            ];
  if (chartMode === "bands") {
    const visibleBuckets = buckets.filter((bucket) => bucket.count);
    const maximum = Math.max(...visibleBuckets.map((bucket) => bucket.count), 1);
    return (
      <article className="stat-card" style={{ "--accent": module.color }}>
        <h3><i />{module.title}</h3>
        <small>
          {trackedDays} jour{trackedDays > 1 ? "s" : ""} comptabilisé
          {trackedDays > 1 ? "s" : ""} sur {totalDays}
        </small>
        {visibleBuckets.length ? (
          <div className="category-comparison" aria-label={`Bandes de ${module.title}`}>
            {visibleBuckets.map((bucket) => (
              <div className="category-comparison-item" key={bucket.label}>
                <strong>{bucket.count}</strong>
                <div className="category-comparison-track">
                  <i
                    style={{
                      height: `${Math.max((bucket.count / maximum) * 100, 8)}%`,
                      background: chartColor(module, bucket.label),
                    }}
                  />
                </div>
                <span>{bucket.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <p>Aucune donnée pour cette période.</p>
        )}
      </article>
    );
  }
  return (
    <article className="stat-card" style={{ "--accent": module.color }}>
      <h3>
        <i />
        {module.title}
      </h3>
      <small>
        {trackedDays} jour{trackedDays > 1 ? "s" : ""} comptabilisé
        {trackedDays > 1 ? "s" : ""} sur {totalDays}
      </small>
      {!values.length && <p>Aucune sélection pour cette période.</p>}
      {chartMode === "pie" && <div className="stat-pie" style={{ background: pieGradient(module, buckets, totalDays) }} aria-label={`Graphique de ${module.title}`} />}
      {buckets
        .filter((b) => b.count)
        .map((bucket) => (
          <div className="stat-row" key={bucket.label}>
            <span className="stat-label">
              {chartMode === "pie" && (
                <i
                  className="stat-color-key"
                  style={{ background: chartColor(module, bucket.label) }}
                  title={`Couleur : ${chartColor(module, bucket.label)}`}
                  aria-label={`Couleur ${chartColor(module, bucket.label)}`}
                />
              )}
              {bucket.label}
              {bucket.definition && (
                <small className="stat-definition">{bucket.definition}</small>
              )}
            </span>
            <strong>
              {bucket.count}/{totalDays} ·{" "}
              {((bucket.count / totalDays) * 100).toFixed(2).replace(".", ",")}%
            </strong>
            <div className={chartMode === "pie" ? "stat-bar hidden-bar" : "stat-bar"}>
              <i
                style={{
                  width: `${Math.min((bucket.count / totalDays) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
    </article>
  );
}
function YearView({ project, year, entries, selectedModules, onPick }) {
  const annualRows = Object.entries(entries || {})
    .filter(([key, values]) => {
      const date = key.split(":")[1];
      return (
        key.startsWith(`${project.id}:`) &&
        date.startsWith(`${year}-`) &&
        Object.keys(values).some((moduleId) => selectedModules?.has(moduleId))
      );
    })
    .sort(([a], [b]) => b.localeCompare(a));
  return (
    <div className="year-view-details">
      <div className="year-grid">
      {Array.from({ length: 12 }, (_, month) => (
        <button key={month} onClick={() => onPick(new Date(year, month, 1))}>
          <strong>
            {new Intl.DateTimeFormat("fr-CA", { month: "short" }).format(
              new Date(year, month, 1),
            )}
          </strong>
          <div>
            {Array.from(
              { length: new Date(year, month + 1, 0).getDate() },
              (_, day) => (
                <i
                  key={day}
                  style={{
                    background:
                      project.modules[day % Math.max(project.modules.length, 1)]
                        ?.color || "#eadfd7",
                  }}
                />
              ),
            )}
          </div>
        </button>
      ))}
      </div>
      <div className="annual-results">
        <div className="annual-results-head"><strong>Résultats de {year}</strong><span>{annualRows.length} journée{annualRows.length > 1 ? "s" : ""}</span></div>
        {annualRows.length ? annualRows.map(([key, values]) => <div className="annual-row" key={key}>
          <button onClick={() => onPick(new Date(`${key.split(":")[1]}T12:00:00`))}>{key.split(":")[1]}</button>
          <div>{project.modules.filter((module) => selectedModules?.has(module.id)).map((module) => { const result = valueLabel(module, values[module.id]); return result ? <span key={module.id}><i style={{ background: module.color }} />{module.title}: {result}</span> : null; })}</div>
        </div>) : <p className="annual-empty">Aucun résultat enregistré pour cette année.</p>}
      </div>
    </div>
  );
}

function Settings({ project, onProject, onClose, onDelete }) {
  const [editing, setEditing] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const pressTimer = useRef(null);
  const patchModule = (m) =>
    onProject({ modules: project.modules.map((x) => (x.id === m.id ? m : x)) });
  const stopDragging = () => {
    clearTimeout(pressTimer.current);
    pressTimer.current = null;
    setDraggingId(null);
  };
  const startDragging = (event, id) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => setDraggingId(id), 250);
  };
  const moveDraggedModule = (event) => {
    if (!draggingId) return;
    event.preventDefault();
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest(".module-setting[data-module-id]");
    const targetId = target?.dataset.moduleId;
    if (!targetId || targetId === draggingId) return;
    const fromIndex = project.modules.findIndex((module) => module.id === draggingId);
    const toIndex = project.modules.findIndex((module) => module.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const modules = [...project.modules];
    const [moved] = modules.splice(fromIndex, 1);
    modules.splice(toIndex, 0, moved);
    onProject({ modules });
  };
  const add = (type) => {
    const m =
      type === "choice" || type === "multi"
        ? {
            id: uid("m"),
            title:
              type === "multi" ? "Nouveau choix multiple" : "Nouveau choix",
            subtitle: "",
            type,
            color: palette[0],
            options: [{ id: uid("o"), label: "Option 1", color: palette[0] }],
          }
        : {
            id: uid("m"),
            title:
              type === "scale"
                ? "Nouvelle échelle"
                : type === "rating"
                  ? "Nouvelle note"
                  : type === "text"
                  ? "Nouvelles notes"
                  : type === "check"
                    ? "Nouvelle case"
                    : "Nouveau suivi",
            subtitle: "",
            type,
            color: palette[1],
            ...(type === "scale"
              ? {
                  anchors: [
                    { value: 0, label: "Bas", color: palette[0] },
                    { value: 10, label: "Haut", color: palette[2] },
                  ],
                }
              : type === "rating"
                ? {
                    shape: "star",
                    max: 5,
                    levels: Array.from({ length: 5 }, (_, i) => ({
                      value: i + 1,
                      label: "",
                      color: palette[i % palette.length],
                    })),
                  }
              : type === "number"
                ? {
                    fields: [{ id: "valeur", label: "Valeur", unit: "", color: palette[0] }],
                    computed: [],
                  }
                : type === "check"
                  ? {
                      options: [
                        { id: uid("o"), label: "Option 1", color: palette[0] },
                      ],
                    }
                  : {}),
          };
    if (type === "hour" || type === "money") {
      m.type = "number";
      m.title = type === "hour" ? "Nouveau suivi d'heure" : "Nouveau suivi en dollars";
      m.fields = [{ id: uid("field"), label: type === "hour" ? "Durée" : "Montant", unit: type === "hour" ? "h" : "$", color: palette[0] }];
      m.computed = [];
    }
    onProject({ modules: [...project.modules, m] });
    setEditing(m.id);
  };
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="settings-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <p className="eyebrow">personnaliser</p>
            <h2>Réglages</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>
        <label className="project-edit">
          <span>Projet</span>
          <input
            value={project.name}
            onChange={(e) => onProject({ name: e.target.value })}
          />
          <input
            className="emoji-input"
            value={project.emoji}
            onChange={(e) => onProject({ emoji: e.target.value })}
            maxLength="2"
          />
        </label>
        <div className="settings-label">Tes suivis</div>
        {project.modules.map((m) => (
          <div
            className="module-setting"
            data-module-id={m.id}
            style={{ "--accent": m.color }}
            key={m.id}
          >
            {editing === m.id ? (
              <ModuleEditor
                module={m}
                onChange={patchModule}
                onClose={() => setEditing(null)}
                onDelete={() => {
                  onProject({
                    modules: project.modules.filter((x) => x.id !== m.id),
                  });
                  setEditing(null);
                }}
              />
            ) : (
              <div
                className={`module-setting-row ${draggingId === m.id ? "is-dragging" : ""}`}
              >
                <span
                  className="module-drag-handle"
                  onPointerDown={(event) => startDragging(event, m.id)}
                  onPointerMove={moveDraggedModule}
                  onPointerUp={stopDragging}
                  onPointerCancel={stopDragging}
                  aria-label={`Déplacer ${m.title}`}
                  title="Maintenir et faire glisser"
                >
                  <GripVertical size={16} aria-hidden="true" />
                </span>
                <button className="module-setting-main" onClick={() => setEditing(m.id)}>
                  <span className="tracker-dot" />
                  <strong>{m.title}</strong>
                  <small>
                    {m.type === "choice" ||
                    m.type === "multi" ||
                    m.type === "check"
                      ? `${m.options?.length || 0} options`
                      : m.type === "rating"
                        ? `note sur ${m.max || 5}`
                        : m.type}
                  </small>
                  <Pencil size={15} />
                </button>
              </div>
            )}
          </div>
        ))}
        <div className="add-buttons">
          <button onClick={() => add("choice")}>
            <Plus size={16} /> choix unique
          </button>
          <button onClick={() => add("multi")}>
            <Plus size={16} /> choix multiple
          </button>
          <button onClick={() => add("scale")}>
            <Plus size={16} /> échelle
          </button>
          <button onClick={() => add("rating")}>
            <Plus size={16} /> note
          </button>
          <button onClick={() => add("number")}>
            <Plus size={16} /> chiffres
          </button>
          <button onClick={() => add("hour")}>
            <Plus size={16} /> heure
          </button>
          <button onClick={() => add("money")}>
            <Plus size={16} /> dollar
          </button>
          <button onClick={() => add("check")}>
            <Plus size={16} /> cases à cocher
          </button>
          <button onClick={() => add("text")}>
            <Plus size={16} /> texte
          </button>
        </div>
        <button
          className="delete-project"
          onClick={() => {
            if (confirm("Supprimer ce projet ?")) onDelete();
          }}
        >
          <Trash2 size={15} /> Supprimer le projet
        </button>
      </aside>
    </div>
  );
}

function ModuleEditor({ module, onChange, onClose, onDelete }) {
  const [draggingOptionId, setDraggingOptionId] = useState(null);
  const optionPressTimer = useRef(null);
  const moduleHistory = useRef([]);
  const patch = (p) => {
    moduleHistory.current.push(module);
    onChange({ ...module, ...p });
  };
  const undoLastChange = () => {
    if (!moduleHistory.current.length) return;
    const previous = moduleHistory.current.pop();
    onChange(previous);
  };
  const patchOption = (id, p) =>
    patch({
      options: module.options.map((o) => (o.id === id ? { ...o, ...p } : o)),
    });
  const patchAnchor = (index, p) =>
    patch({
      anchors: sortAnchors(
        module.anchors.map((a, i) => (i === index ? { ...a, ...p } : a)),
      ),
    });
  const patchField = (id, p) =>
    patch({
      fields: module.fields.map((f) => (f.id === id ? { ...f, ...p } : f)),
    });
  const stopDraggingOption = () => {
    clearTimeout(optionPressTimer.current);
    optionPressTimer.current = null;
    setDraggingOptionId(null);
  };
  const startDraggingOption = (event, id) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    clearTimeout(optionPressTimer.current);
    optionPressTimer.current = setTimeout(() => setDraggingOptionId(id), 250);
  };
  const moveDraggedOption = (event) => {
    if (!draggingOptionId) return;
    event.preventDefault();
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest(".module-option-row[data-option-id]");
    const targetId = target?.dataset.optionId;
    if (!targetId || targetId === draggingOptionId) return;
    const fromIndex = module.options.findIndex(
      (option) => option.id === draggingOptionId,
    );
    const toIndex = module.options.findIndex((option) => option.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const options = [...module.options];
    const [moved] = options.splice(fromIndex, 1);
    options.splice(toIndex, 0, moved);
    patch({ options });
  };
  return (
    <div className="module-editor">
      <div className="editor-title">
        <input
          value={module.title}
          onChange={(e) => patch({ title: e.target.value })}
        />
        <input
          value={module.subtitle || ""}
          onChange={(e) => patch({ subtitle: e.target.value })}
          placeholder="Sous-titre"
        />
      </div>
      <label className="color-line">
        Couleur{" "}
        <input
          type="color"
          value={module.color}
          onChange={(e) => patch({ color: e.target.value })}
        />
      </label>
      {module.type === "rating" && (
        <div className="edit-options">
          <div className="settings-label">Forme de la note</div>
          <div className="rating-shape-picker">
            {[
              ["star", "Étoile", Star],
              ["heart", "Cœur", Heart],
              ["wine", "Verre de vin", Wine],
            ].map(([shape, label, Icon]) => (
              <button
                key={shape}
                className={module.shape === shape || (!module.shape && shape === "star") ? "active" : ""}
                onClick={() => patch({ shape })}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
          <label className="rating-max-picker">
            Nombre de repères
            <input
              type="number"
              min="2"
              max="10"
              value={module.max || 5}
              onChange={(e) => {
                const max = Math.min(10, Math.max(2, Number(e.target.value) || 5));
                const levels = Array.from({ length: max }, (_, i) => ({
                  value: i + 1,
                  label: module.levels?.[i]?.label || "",
                  color: module.levels?.[i]?.color || palette[i % palette.length],
                }));
                patch({ max, levels });
              }}
            />
          </label>
          <div className="settings-label">Chaque repère</div>
          {(module.levels || []).map((level, i) => (
            <div key={level.value}>
              <input
                type="color"
                value={level.color}
                onChange={(e) =>
                  patch({
                    levels: module.levels.map((l, idx) =>
                      idx === i ? { ...l, color: e.target.value } : l,
                    ),
                  })
                }
                aria-label={`Couleur du repère ${level.value}`}
              />
              <span className="rating-level-name">{level.value}/{module.max || 5}</span>
              <input
                value={level.label || ""}
                onChange={(e) =>
                  patch({
                    levels: module.levels.map((l, idx) =>
                      idx === i ? { ...l, label: e.target.value } : l,
                    ),
                  })
                }
                placeholder="Mauvais, incroyable..."
              />
            </div>
          ))}
        </div>
      )}
      {module.fields && (
        <div className="edit-options">
          <div className="settings-label">Sous-champs</div>
          {module.fields.map((f, index) => (
            <div key={f.id}>
              <input
                type="color"
                value={f.color || palette[index % palette.length]}
                onChange={(e) => patchField(f.id, { color: e.target.value })}
                aria-label={`Couleur de ${f.label}`}
              />
              <input
                value={f.label}
                onChange={(e) => patchField(f.id, { label: e.target.value })}
                placeholder="Nom (ex. maki végé)"
              />
              <input
                value={f.unit}
                onChange={(e) => patchField(f.id, { unit: e.target.value })}
                placeholder="unité"
              />
              <button
                onClick={() =>
                  patch({ fields: module.fields.filter((x) => x.id !== f.id) })
                }
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button
            className="add-option"
            onClick={() =>
              patch({
                fields: [
                  ...module.fields,
                  { id: uid("field"), label: "Nouveau sous-champ", unit: "", color: palette[module.fields.length % palette.length] },
                ],
              })
            }
          >
            <Plus size={14} /> Ajouter un sous-champ
          </button>
        </div>
      )}
      {module.options && (
        <div className="edit-options">
          {module.options.map((o) => (
            <div
              className={`module-option-row ${draggingOptionId === o.id ? "is-dragging" : ""}`}
              data-option-id={o.id}
              key={o.id}
            >
              <span
                className="module-option-drag-handle"
                onPointerDown={(event) => startDraggingOption(event, o.id)}
                onPointerMove={moveDraggedOption}
                onPointerUp={stopDraggingOption}
                onPointerCancel={stopDraggingOption}
                aria-label={`Déplacer ${o.label}`}
                title="Maintenir et faire glisser"
              >
                <GripVertical size={15} aria-hidden="true" />
              </span>
              <input
                type="color"
                value={o.color}
                onChange={(e) => patchOption(o.id, { color: e.target.value })}
              />
              <input
                value={o.label}
                onChange={(e) => patchOption(o.id, { label: e.target.value })}
              />
              <button
                onClick={() =>
                  patch({
                    options: module.options.filter((x) => x.id !== o.id),
                  })
                }
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button
            className="add-option"
            onClick={() =>
              patch({
                options: [
                  ...module.options,
                  {
                    id: uid("o"),
                    label: "Nouvelle option",
                    color: palette[module.options.length % palette.length],
                  },
                ],
              })
            }
          >
            <Plus size={14} /> Ajouter une option
          </button>
        </div>
      )}
      {module.anchors && (
        <div className="edit-options">
          <div className="settings-label">Repères de l'échelle</div>
          {module.anchors.map((a, i) => (
            <div key={i}>
              <input
                type="number"
                min="0"
                max="10"
                value={a.value}
                onChange={(e) =>
                  patchAnchor(i, { value: Number(e.target.value) })
                }
              />
              <input
                value={a.label}
                onChange={(e) => patchAnchor(i, { label: e.target.value })}
                placeholder="Bas, faible..."
              />
              <input
                type="color"
                value={a.color}
                onChange={(e) => patchAnchor(i, { color: e.target.value })}
              />
              <button
                onClick={() =>
                  patch({
                    anchors: module.anchors.filter((_, index) => index !== i),
                  })
                }
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button
            className="add-option"
            onClick={() =>
              patch({
                anchors: sortAnchors([
                  ...module.anchors,
                  { value: 5, label: "Repère", color: palette[1] },
                ]),
              })
            }
          >
            <Plus size={14} /> Ajouter un repère
          </button>
        </div>
      )}
      {module.computed && (
        <div className="formula-list">
          {module.computed.map((c) => (
            <label key={c.id}>
              <span className="formula-visibility">
                <input
                  type="checkbox"
                  checked={c.visible !== false}
                  onChange={(e) =>
                    patch({
                      computed: module.computed.map((x) =>
                        x.id === c.id ? { ...x, visible: e.target.checked } : x,
                      ),
                    })
                  }
                />
                afficher
              </span>
              <input
                value={c.label}
                onChange={(e) =>
                  patch({
                    computed: module.computed.map((x) =>
                      x.id === c.id ? { ...x, label: e.target.value } : x,
                    ),
                  })
                }
                placeholder="Nom de la formule"
              />
              <input
                value={c.formula}
                onChange={(e) =>
                  patch({
                    computed: module.computed.map((x) =>
                      x.id === c.id ? { ...x, formula: e.target.value } : x,
                    ),
                  })
                }
              />
            </label>
          ))}
          <button
            className="add-option"
            onClick={() =>
              patch({
                computed: [
                  ...module.computed,
                  {
                    id: uid("c"),
                    label: "Nouveau calcul",
                    formula: "minutes * 1",
                    unit: "$",
                  },
                ],
              })
            }
          >
            <Plus size={14} /> Ajouter une formule
          </button>
        </div>
      )}
      <div className="editor-actions">
        <button className="delete-small" onClick={onDelete}>
          <Trash2 size={14} /> Supprimer
        </button>
        <button
          className="undo-small"
          onClick={undoLastChange}
          disabled={!moduleHistory.current.length}
          aria-label="Revenir à la modification précédente"
          title="Annuler la dernière modification"
        >
          <Undo2 size={16} />
        </button>
        <button className="done" onClick={onClose}>
          Terminé
        </button>
      </div>
    </div>
  );
}

function NamePrompt({ onSave }) {
  const [name, setName] = useState("");
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <p className="eyebrow">bienvenue</p>
        <h2>Comment devons-nous t'appeler ?</h2>
        <div className="modal-fields">
          <input
            className="name-input"
            autoFocus
            placeholder="Ton prénom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) onSave(name.trim());
            }}
          />
        </div>
        <div className="modal-actions">
          <button
            className="done"
            disabled={!name.trim()}
            onClick={() => onSave(name.trim())}
          >
            Continuer
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("✨");
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <p className="eyebrow">un nouvel espace</p>
        <h2>Créer un projet</h2>
        <div className="modal-fields">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength="2"
          />
          <input
            autoFocus
            placeholder="Nom du projet"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>Annuler</button>
          <button
            className="done"
            disabled={!name.trim()}
            onClick={() =>
              onSave({ name: name.trim(), emoji, color: palette[4] })
            }
          >
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;