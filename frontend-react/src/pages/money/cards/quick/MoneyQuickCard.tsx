import { useMemo, useRef, useState, type FormEvent } from "react";

import type { PlannerStore, PlannerStoreWrite } from "../../../../api/planner-store";
import {
  buildMoneyQuick,
  buildMoneyTransactionUpdate,
  DEFAULT_MONEY_IMPACT,
  moneyImpactMessage,
  parseAmountToCents,
  suggestMoneyCategory
} from "./money-quick";

interface MoneyQuickCardProps {
  onPersist: (writes: readonly PlannerStoreWrite[]) => void;
  store: PlannerStore;
  today: Date;
}

function randomId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

interface OptimisticValue {
  baseValue: string | undefined;
  value: string;
}

type OptimisticWrites = Readonly<Record<string, OptimisticValue>>;

function applyOptimisticWrites(store: PlannerStore, writes: OptimisticWrites): PlannerStore {
  return Object.entries(writes).reduce<PlannerStore>((current, [key, write]) => {
    const incomingValue = store[key];
    return incomingValue === write.baseValue || incomingValue === write.value
      ? { ...current, [key]: write.value }
      : current;
  }, store);
}

export function MoneyQuickCard({ onPersist, store, today }: MoneyQuickCardProps) {
  const [optimisticWrites, setOptimisticWrites] = useState<OptimisticWrites>({});
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [vendor, setVendor] = useState("");
  const [impact, setImpact] = useState(DEFAULT_MONEY_IMPACT);
  const amountRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const localStore = useMemo(
    () => applyOptimisticWrites(store, optimisticWrites),
    [optimisticWrites, store]
  );
  const model = useMemo(() => buildMoneyQuick(localStore, today), [localStore, today]);
  const selectedCategoryId = model.categories.some((category) => category.id === categoryId)
    ? categoryId
    : model.categories[0]?.id ?? "";

  function applyVendorSuggestion(): void {
    const suggestedCategory = suggestMoneyCategory(localStore, vendor);
    if (suggestedCategory) {
      setCategoryId(suggestedCategory);
    }
  }

  function selectShortcut(id: string): void {
    setCategoryId(id);
    amountRef.current?.focus();
  }

  function saveTransaction(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const amountCents = parseAmountToCents(amount);
    if (!amountCents || amountCents <= 0) {
      setImpact("Add a valid amount before saving.");
      amountRef.current?.focus();
      return;
    }
    if (!selectedCategoryId) {
      setImpact("Choose a category before saving.");
      categoryRef.current?.focus();
      return;
    }

    const timestamp = new Date().toISOString();
    const update = buildMoneyTransactionUpdate(localStore, {
      amountCents,
      categoryId: selectedCategoryId,
      vendor
    }, today, {
      activityId: randomId("activity"),
      timestamp,
      transactionId: randomId("txn"),
      vendorRuleId: randomId("vendor")
    });
    const nextModel = buildMoneyQuick(update.nextStore, today);
    setOptimisticWrites((current) => update.writes.reduce<OptimisticWrites>(
      (next, write) => ({
        ...next,
        [write.key]: {
          baseValue: current[write.key]?.baseValue ?? store[write.key],
          value: write.value
        }
      }),
      current
    ));
    setImpact(moneyImpactMessage(model, nextModel, update.transaction));
    setAmount("");
    setVendor("");
    onPersist(update.writes);
    amountRef.current?.focus();
  }

  return (
    <>
      <div className="section-head">
        <div>
          <h2>Money quick log</h2>
          <p className="small-note">Fast spending check-in with the remaining money shown first.</p>
        </div>
        <span className="progress-pill money-soft-pill" id="moneyPaceBadge">{model.paceBadge}</span>
      </div>
      <div className="money-quick-grid">
        <div className="money-remaining-strip" id="moneyQuickSummary">
          {model.summary.map((item) => (
            <div className={item.className} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.formattedValue}</strong>
            </div>
          ))}
        </div>
        <form className="money-quick-form" id="moneyQuickForm" onSubmit={saveTransaction}>
          <label className="form-row" htmlFor="moneyQuickAmount">
            <span>Amount</span>
            <input
              autoComplete="off"
              id="moneyQuickAmount"
              inputMode="decimal"
              onChange={(event) => setAmount(event.currentTarget.value)}
              placeholder="12.50"
              ref={amountRef}
              value={amount}
            />
          </label>
          <label className="form-row" htmlFor="moneyQuickCategory">
            <span>Category</span>
            <select
              aria-label="Money category"
              id="moneyQuickCategory"
              onChange={(event) => setCategoryId(event.currentTarget.value)}
              ref={categoryRef}
              value={selectedCategoryId}
            >
              {model.categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <label className="form-row" htmlFor="moneyQuickVendor">
            <span>Vendor (optional)</span>
            <input
              autoComplete="off"
              id="moneyQuickVendor"
              maxLength={80}
              onBlur={applyVendorSuggestion}
              onChange={(event) => setVendor(event.currentTarget.value)}
              placeholder="Lidl, K-Market, HSL..."
              value={vendor}
            />
          </label>
          <button className="primary-button" type="submit">Save spend</button>
        </form>
        <div className="money-shortcuts" id="moneyQuickShortcuts" aria-label="Money shortcuts">
          {model.shortcuts.map((shortcut) => (
            <button
              className="money-shortcut"
              key={shortcut.id}
              onClick={() => selectShortcut(shortcut.id)}
              type="button"
            >
              <strong>{shortcut.name}</strong>
              <span>{shortcut.formattedWeeklyBudget} / week</span>
            </button>
          ))}
        </div>
        <p className="hint" id="moneyQuickImpact">{impact}</p>
      </div>
    </>
  );
}
