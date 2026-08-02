import { useEffect, useMemo, useState } from "react";
import { addNutrients, formatNumber, isoDate, sameLocalDate, sumMealItems } from "./calculations";
import { deleteMeal, deleteMealTemplate, deleteWeight, getAllMeals, getAllMealTemplates, getAllWeights, getSetting, putMeal, putMealTemplate, putWeight, setSetting } from "./db";
import type { Meal, MealItem, MealTemplate, MealTemplateItem, Nutrients, WeightEntry } from "./types";

type Page = "today" | "add" | "history" | "weight" | "settings";

type DraftItem = {
  foodName: string;
  kcal: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sourceVersion: string;
};

const emptyTotals: Nutrients = { kcal: 0 };
const MANUAL_SOURCE = "Rucny zapis";

export function App() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealTemplates, setMealTemplates] = useState<MealTemplate[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [page, setPage] = useState<Page>("today");
  const [selectedDate, setSelectedDate] = useState(isoDate());
  const [editingMeal, setEditingMeal] = useState<Meal | undefined>();
  const [dailyTarget, setDailyTarget] = useState(2200);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    Promise.all([getAllMeals(), getAllMealTemplates(), getAllWeights(), getSetting<number>("dailyTarget")]).then(([storedMeals, storedMealTemplates, storedWeights, target]) => {
      setMeals(storedMeals);
      setMealTemplates(storedMealTemplates);
      setWeights(storedWeights);
      if (target) {
        setDailyTarget(target);
      }
      setIsReady(true);
    });
  }, []);

  const mealsForDate = useMemo(() => meals.filter((meal) => sameLocalDate(meal.eatenAt, selectedDate)), [meals, selectedDate]);
  const dailyTotals = useMemo(() => mealsForDate.reduce((totals, meal) => addNutrients(totals, meal.totals), emptyTotals), [mealsForDate]);
  const targetRatio = Math.min(100, Math.round((dailyTotals.kcal / dailyTarget) * 100));

  async function refreshMeals() {
    setMeals(await getAllMeals());
  }

  async function refreshMealTemplates() {
    setMealTemplates(await getAllMealTemplates());
  }

  async function refreshWeights() {
    setWeights(await getAllWeights());
  }

  async function handleSaveMeal(name: string, eatenAt: string, draftItems: DraftItem[], mealToUpdate?: Meal) {
    const now = new Date().toISOString();
    const items: MealItem[] = draftItems.map(({ foodName, kcal, protein, carbs, fat, sourceVersion }) => ({
      id: crypto.randomUUID(),
      foodName,
      kcal,
      protein,
      carbs,
      fat,
      sourceVersion,
    }));

    await putMeal({
      id: mealToUpdate?.id ?? crypto.randomUUID(),
      name: name.trim() || "Jedlo",
      eatenAt,
      items,
      totals: sumMealItems(items),
      createdAt: mealToUpdate?.createdAt ?? now,
      updatedAt: now,
    });
    await refreshMeals();
    setSelectedDate(eatenAt.slice(0, 10));
    setEditingMeal(undefined);
    setPage("today");
  }

  function handleEditMeal(meal: Meal) {
    setEditingMeal(meal);
    setSelectedDate(meal.eatenAt.slice(0, 10));
    setPage("add");
  }

  function handleAddMeal() {
    setEditingMeal(undefined);
    setPage("add");
  }

  async function handleSaveMealTemplate(name: string, draftItems: DraftItem[]) {
    if (draftItems.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    const items: MealTemplateItem[] = draftItems.map(({ foodName, kcal, protein, carbs, fat, sourceVersion }) => ({
      foodName,
      kcal,
      protein,
      carbs,
      fat,
      sourceVersion,
    }));

    await putMealTemplate({
      id: crypto.randomUUID(),
      name: name.trim() || "Caste jedlo",
      items,
      createdAt: now,
      updatedAt: now,
    });
    await refreshMealTemplates();
  }

  async function handleDeleteMeal(id: string) {
    await deleteMeal(id);
    await refreshMeals();
  }

  async function handleDeleteMealTemplate(id: string) {
    await deleteMealTemplate(id);
    await refreshMealTemplates();
  }

  async function handleSaveWeight(measuredAt: string, kg: number) {
    const now = new Date().toISOString();
    await putWeight({
      id: crypto.randomUUID(),
      measuredAt,
      kg: Math.round((kg + Number.EPSILON) * 10) / 10,
      createdAt: now,
      updatedAt: now,
    });
    await refreshWeights();
  }

  async function handleDeleteWeight(id: string) {
    await deleteWeight(id);
    await refreshWeights();
  }

  async function handleTargetChange(value: number) {
    setDailyTarget(value);
    await setSetting("dailyTarget", value);
  }

  function exportArchive() {
    const payload = {
      exportedAt: new Date().toISOString(),
      meals,
      mealTemplates,
      weights,
      settings: { dailyTarget },
    };
    downloadJson("nutricalc-archiv.json", payload);
  }

  async function importArchive(file: File) {
    const payload = JSON.parse(await file.text()) as { meals?: Meal[]; mealTemplates?: MealTemplate[]; weights?: WeightEntry[]; settings?: { dailyTarget?: number } };
    if (Array.isArray(payload.meals)) {
      await Promise.all(payload.meals.map((meal) => putMeal(meal)));
      await refreshMeals();
    }
    if (Array.isArray(payload.mealTemplates)) {
      await Promise.all(payload.mealTemplates.map((mealTemplate) => putMealTemplate(mealTemplate)));
      await refreshMealTemplates();
    }
    if (Array.isArray(payload.weights)) {
      await Promise.all(payload.weights.map((weight) => putWeight(weight)));
      await refreshWeights();
    }
    if (payload.settings?.dailyTarget) {
      await handleTargetChange(payload.settings.dailyTarget);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">N</div>
          <div>
            <strong>NutriCalc</strong>
            <span>manualny dennik</span>
          </div>
        </div>

        <nav className="nav">
          <button className={page === "today" ? "active" : ""} onClick={() => setPage("today")}>Dnes</button>
          <button className={page === "add" ? "active" : ""} onClick={handleAddMeal}>Pridat jedlo</button>
          <button className={page === "history" ? "active" : ""} onClick={() => setPage("history")}>Historia</button>
          <button className={page === "weight" ? "active" : ""} onClick={() => setPage("weight")}>Vaha</button>
          <button className={page === "settings" ? "active" : ""} onClick={() => setPage("settings")}>Nastavenia</button>
        </nav>
      </aside>

      <main className="main">
        {!isReady ? (
          <section className="empty-state">Nacitavam lokalnu databazu...</section>
        ) : (
          <>
            {page === "today" && (
              <TodayPage
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                meals={mealsForDate}
                totals={dailyTotals}
                targetRatio={targetRatio}
                dailyTarget={dailyTarget}
                onDeleteMeal={handleDeleteMeal}
                onEditMeal={handleEditMeal}
                onAddMeal={handleAddMeal}
              />
            )}
            {page === "add" && (
              <AddMealPage
                mealTemplates={mealTemplates}
                selectedDate={selectedDate}
                mealToEdit={editingMeal}
                onSave={handleSaveMeal}
                onSaveTemplate={handleSaveMealTemplate}
                onDeleteTemplate={handleDeleteMealTemplate}
              />
            )}
            {page === "history" && <HistoryPage meals={meals} onDeleteMeal={handleDeleteMeal} onEditMeal={handleEditMeal} />}
            {page === "weight" && <WeightPage weights={weights} onSave={handleSaveWeight} onDelete={handleDeleteWeight} />}
            {page === "settings" && (
              <SettingsPage
                dailyTarget={dailyTarget}
                onTargetChange={handleTargetChange}
                onExportArchive={exportArchive}
                onImportArchive={importArchive}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function TodayPage(props: {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  meals: Meal[];
  totals: Nutrients;
  targetRatio: number;
  dailyTarget: number;
  onDeleteMeal: (id: string) => void;
  onEditMeal: (meal: Meal) => void;
  onAddMeal: () => void;
}) {
  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Dennik</span>
          <h1>Prehlad dna</h1>
        </div>
        <input type="date" value={props.selectedDate} onChange={(event) => props.setSelectedDate(event.target.value)} />
      </header>

      <section className="summary-grid">
        <div className="metric primary">
          <span>Kalorie</span>
          <strong>{formatNumber(props.totals.kcal, " kcal")}</strong>
          <div className="progress"><span style={{ width: `${props.targetRatio}%` }} /></div>
          <small>{props.targetRatio}% z ciela {formatNumber(props.dailyTarget, " kcal")}</small>
        </div>
        <Metric label="Bielkoviny" value={props.totals.protein} suffix=" g" />
        <Metric label="Tuky" value={props.totals.fat} suffix=" g" />
        <Metric label="Sacharidy" value={props.totals.carbs ?? props.totals.availableCarbs} suffix=" g" />
      </section>

      <section className="section-head">
        <h2>Jedla</h2>
        <button onClick={props.onAddMeal}>Pridat</button>
      </section>
      <MealList meals={props.meals} onDeleteMeal={props.onDeleteMeal} onEditMeal={props.onEditMeal} />
    </>
  );
}

function AddMealPage(props: {
  mealTemplates: MealTemplate[];
  selectedDate: string;
  mealToEdit?: Meal;
  onSave: (name: string, eatenAt: string, items: DraftItem[], mealToUpdate?: Meal) => void;
  onSaveTemplate: (name: string, items: DraftItem[]) => void;
  onDeleteTemplate: (id: string) => void;
}) {
  const [itemName, setItemName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [mealName, setMealName] = useState("");
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));

  useEffect(() => {
    if (!props.mealToEdit) {
      return;
    }

    setMealName(props.mealToEdit.name);
    setTime(props.mealToEdit.eatenAt.slice(11, 16));
    setItems(props.mealToEdit.items.map(({ foodName, kcal, protein, carbs, fat, sourceVersion }) => ({
      foodName,
      kcal,
      protein,
      carbs,
      fat,
      sourceVersion,
    })));
  }, [props.mealToEdit]);

  const totals = useMemo(() => sumMealItems(draftItemsToMealItems(items)), [items]);

  function addItem() {
    const kcalNum = Number(kcal);
    if (!kcal || !Number.isFinite(kcalNum) || kcalNum <= 0) {
      return;
    }
    setItems((current) => [...current, {
      foodName: itemName.trim() || "Jedlo",
      kcal: kcalNum,
      protein: optionalNumber(protein),
      carbs: optionalNumber(carbs),
      fat: optionalNumber(fat),
      sourceVersion: MANUAL_SOURCE,
    }]);
    setItemName("");
    setKcal("");
    setProtein("");
    setCarbs("");
    setFat("");
  }

  function insertTemplate(mealTemplate: MealTemplate) {
    const templateItems: DraftItem[] = mealTemplate.items.map(({ foodName, kcal, protein, carbs, fat, sourceVersion }) => ({
      foodName,
      kcal,
      protein,
      carbs,
      fat,
      sourceVersion,
    }));

    setItems((current) => [...current, ...templateItems]);
    setMealName((current) => current || mealTemplate.name);
  }

  function saveMeal() {
    if (items.length === 0) {
      return;
    }
    props.onSave(mealName, `${props.selectedDate}T${time}:00`, items, props.mealToEdit);
  }

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Editor</span>
          <h1>{props.mealToEdit ? "Upravit jedlo" : "Pridat jedlo"}</h1>
        </div>
        <button disabled={items.length === 0} onClick={saveMeal}>{props.mealToEdit ? "Ulozit zmeny" : "Ulozit jedlo"}</button>
      </header>

      <section className="editor-layout">
        <div className="panel">
          {props.mealTemplates.length > 0 && (
            <div className="template-list">
              <h2>Casto pouzivane jedla</h2>
              {props.mealTemplates.map((mealTemplate) => (
                <div className="template-row" key={mealTemplate.id}>
                  <button onClick={() => insertTemplate(mealTemplate)}>
                    <strong>{mealTemplate.name}</strong>
                    <span>{formatNumber(sumMealItems(templateItemsToMealItems(mealTemplate.items)).kcal, " kcal")}</span>
                  </button>
                  <button className="danger" onClick={() => props.onDeleteTemplate(mealTemplate.id)}>Odstranit</button>
                </div>
              ))}
            </div>
          )}

          <label>
            Nazov jedla
            <input value={mealName} onChange={(event) => setMealName(event.target.value)} placeholder="Ranajky, obed..." />
          </label>
          <label>
            Cas
            <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
          </label>

          <h2>Pridat polozku</h2>
          <label>
            Nazov polozky (nepovinne)
            <input value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="napr. omeleta, jablko..." />
          </label>
          <div className="row">
            <label>
              Kalorie (kcal)
              <input inputMode="decimal" type="number" min="0" value={kcal} onChange={(event) => setKcal(event.target.value)} placeholder="0" />
            </label>
            <label>
              Bielkoviny (g)
              <input inputMode="decimal" type="number" min="0" value={protein} onChange={(event) => setProtein(event.target.value)} placeholder="0" />
            </label>
          </div>
          <div className="row">
            <label>
              Sacharidy (g)
              <input inputMode="decimal" type="number" min="0" value={carbs} onChange={(event) => setCarbs(event.target.value)} placeholder="0" />
            </label>
            <label>
              Tuky (g)
              <input inputMode="decimal" type="number" min="0" value={fat} onChange={(event) => setFat(event.target.value)} placeholder="0" />
            </label>
          </div>
          <button onClick={addItem} disabled={!kcal}>Pridat polozku</button>
        </div>

        <div className="panel">
          <h2>Aktualne jedlo</h2>
          <div className="compact-metrics">
            <Metric label="Kalorie" value={totals.kcal} suffix=" kcal" />
            <Metric label="Bielkoviny" value={totals.protein} suffix=" g" />
            <Metric label="Tuky" value={totals.fat} suffix=" g" />
            <Metric label="Sacharidy" value={totals.carbs ?? totals.availableCarbs} suffix=" g" />
          </div>
          <div className="item-list">
            {items.map((item, index) => (
              <div className="item-row" key={`${item.foodName}-${index}`}>
                <div>
                  <strong>{item.foodName}</strong>
                  <span>{item.kcal} kcal</span>
                </div>
                <button onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Odstranit</button>
              </div>
            ))}
          </div>
          <button disabled={items.length === 0} onClick={() => props.onSaveTemplate(mealName, items)}>Ulozit ako caste jedlo</button>
        </div>
      </section>
    </>
  );
}

function optionalNumber(value: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function draftItemsToMealItems(items: DraftItem[]): MealItem[] {
  return items.map((item, index) => ({
    id: `draft-${index}`,
    ...item,
  }));
}

function templateItemsToMealItems(items: MealTemplateItem[]): MealItem[] {
  return items.map((item, index) => ({
    id: `template-${index}`,
    ...item,
  }));
}

function HistoryPage({ meals, onDeleteMeal, onEditMeal }: { meals: Meal[]; onDeleteMeal: (id: string) => void; onEditMeal: (meal: Meal) => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const filtered = meals.filter((meal) => (!from || meal.eatenAt.slice(0, 10) >= from) && (!to || meal.eatenAt.slice(0, 10) <= to));
  const totals = filtered.reduce((sum, meal) => addNutrients(sum, meal.totals), emptyTotals);

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Archiv</span>
          <h1>Historia jedal</h1>
        </div>
      </header>
      <section className="filters">
        <label>Od <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label>Do <input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
      </section>
      <section className="summary-grid">
        <Metric label="Jedal" value={filtered.length} suffix="" />
        <Metric label="Kalorie spolu" value={totals.kcal} suffix=" kcal" />
        <Metric label="Bielkoviny" value={totals.protein} suffix=" g" />
        <Metric label="Tuky" value={totals.fat} suffix=" g" />
      </section>
      <MealList meals={filtered} onDeleteMeal={onDeleteMeal} onEditMeal={onEditMeal} />
    </>
  );
}

function WeightPage({ weights, onSave, onDelete }: { weights: WeightEntry[]; onSave: (measuredAt: string, kg: number) => void; onDelete: (id: string) => void }) {
  const [measuredAt, setMeasuredAt] = useState(isoDate());
  const [kg, setKg] = useState("");
  const latest = weights[0];
  const previous = weights[1];
  const delta = latest && previous ? Math.round((latest.kg - previous.kg + Number.EPSILON) * 10) / 10 : undefined;

  function saveWeight() {
    const parsed = Number(kg.replace(",", "."));
    if (!measuredAt || !Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    onSave(measuredAt, parsed);
    setKg("");
  }

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Telo</span>
          <h1>Vaha</h1>
        </div>
      </header>

      <section className="summary-grid weight-summary">
        <div className="metric primary">
          <span>Posledna vaha</span>
          <strong>{latest ? formatNumber(latest.kg, " kg") : "-"}</strong>
          <small>{latest ? new Date(latest.measuredAt).toLocaleDateString("sk-SK", { dateStyle: "medium" }) : "Zatial bez zaznamu"}</small>
        </div>
        <Metric label="Zmena" value={delta} suffix=" kg" />
      </section>

      <section className="panel narrow">
        <label>
          Datum
          <input type="date" value={measuredAt} onChange={(event) => setMeasuredAt(event.target.value)} />
        </label>
        <label>
          Vaha v kg
          <input inputMode="decimal" type="number" min="0" step="0.1" value={kg} onChange={(event) => setKg(event.target.value)} placeholder="82,4" />
        </label>
        <button onClick={saveWeight} disabled={!kg}>Ulozit vahu</button>
      </section>

      <section className="section-head">
        <h2>Historia vahy</h2>
      </section>
      <WeightList weights={weights} onDelete={onDelete} />
    </>
  );
}

function WeightList({ weights, onDelete }: { weights: WeightEntry[]; onDelete: (id: string) => void }) {
  if (weights.length === 0) {
    return <section className="empty-state">Ziadne ulozene vahy.</section>;
  }

  return (
    <div className="meal-list">
      {weights.map((entry) => (
        <article className="meal-card weight-card" key={entry.id}>
          <div>
            <h3>{formatNumber(entry.kg, " kg")}</h3>
            <time>{new Date(entry.measuredAt).toLocaleDateString("sk-SK", { dateStyle: "medium" })}</time>
          </div>
          <button onClick={() => onDelete(entry.id)}>Odstranit</button>
        </article>
      ))}
    </div>
  );
}

function SettingsPage(props: {
  dailyTarget: number;
  onTargetChange: (value: number) => void;
  onExportArchive: () => void;
  onImportArchive: (file: File) => void;
}) {
  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Lokalne data</span>
          <h1>Nastavenia</h1>
        </div>
      </header>
      <section className="panel narrow">
        <label>
          Denny kaloricky ciel
          <input type="number" min="0" value={props.dailyTarget} onChange={(event) => props.onTargetChange(Number(event.target.value))} />
        </label>
        <div className="actions">
          <button onClick={props.onExportArchive}>Exportovat archiv</button>
          <label className="button-like">
            Importovat archiv
            <input type="file" accept=".json" onChange={(event) => event.target.files?.[0] && props.onImportArchive(event.target.files[0])} />
          </label>
        </div>
      </section>
    </>
  );
}

function MealList({ meals, onDeleteMeal, onEditMeal }: { meals: Meal[]; onDeleteMeal: (id: string) => void; onEditMeal: (meal: Meal) => void }) {
  if (meals.length === 0) {
    return <section className="empty-state">Ziadne ulozene jedla.</section>;
  }

  return (
    <div className="meal-list">
      {meals.map((meal) => (
        <article className="meal-card" key={meal.id}>
          <div className="meal-top">
            <div>
              <h3>{meal.name}</h3>
              <time>{new Date(meal.eatenAt).toLocaleString("sk-SK", { dateStyle: "medium", timeStyle: "short" })}</time>
            </div>
            <strong>{formatNumber(meal.totals.kcal, " kcal")}</strong>
          </div>
          <div className="meal-items">
            {meal.items.map((item) => (
              <span key={item.id}>{item.foodName} - {item.kcal} kcal</span>
            ))}
          </div>
          <div className="meal-footer">
            <span>B {formatNumber(meal.totals.protein, " g")}</span>
            <span>T {formatNumber(meal.totals.fat, " g")}</span>
            <span>S {formatNumber(meal.totals.carbs ?? meal.totals.availableCarbs, " g")}</span>
            <button onClick={() => onEditMeal(meal)}>Upravit</button>
            <button onClick={() => onDeleteMeal(meal.id)}>Odstranit</button>
          </div>
        </article>
      ))}
    </div>
  );
}

function Metric({ label, value, suffix }: { label: string; value?: number; suffix: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{formatNumber(value, suffix)}</strong>
    </div>
  );
}

function downloadJson(fileName: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
