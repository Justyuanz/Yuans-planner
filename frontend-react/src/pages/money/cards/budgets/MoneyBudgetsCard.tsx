import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import type { PlannerStore, PlannerStoreWrite } from "@/api/planner-store";
import { MONEY_SETTINGS_KEY, parseAmountToCents } from "../quick/money-quick";
import {
  buildMoneyBudgets,
  buildMoneyCategoryUpdate,
  buildMoneyTransferAddition,
  buildMoneyTransferDeletion,
  type MoneyBudgetField
} from "./money-budgets";

interface MoneyBudgetsCardProps {
  onPersist: (writes: readonly PlannerStoreWrite[]) => void;
  store: PlannerStore;
  today: Date;
}

interface OptimisticSettings {
  baseValue: string | undefined;
  value: string;
}

function randomId(): string {
  return `transfer-${Math.random().toString(36).slice(2, 10)}`;
}

function applyOptimisticSettings(
  store: PlannerStore,
  optimistic: OptimisticSettings | null
): PlannerStore {
  if (optimistic === null) {
    return store;
  }
  const incomingValue = store[MONEY_SETTINGS_KEY];
  return incomingValue === optimistic.baseValue || incomingValue === optimistic.value
    ? { ...store, [MONEY_SETTINGS_KEY]: optimistic.value }
    : store;
}

interface MoneyBudgetInputProps {
  ariaLabel: string;
  label: string;
  onCommit: (value: string) => void;
  value: string;
}

function MoneyBudgetInput({
  ariaLabel,
  label,
  onCommit,
  value
}: MoneyBudgetInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (input === null) {
      return;
    }
    const activeInput = input;
    // Legacy commits on native change (normally blur), not on every typed character.
    function commit(): void {
      const settings = activeInput.closest<HTMLDetailsElement>(".money-settings-panel");
      if (settings !== null) {
        settings.open = false;
      }
      onCommit(activeInput.value);
    }
    activeInput.onchange = commit;
    return () => {
      activeInput.onchange = null;
    };
  }, [onCommit]);

  return (
    <label className="money-budget-field">
      <span>{label}</span>
      <input
        aria-label={ariaLabel}
        defaultValue={value}
        inputMode="decimal"
        placeholder={label}
        ref={inputRef}
        title={label}
      />
    </label>
  );
}

export function MoneyBudgetsCard({ onPersist, store, today }: MoneyBudgetsCardProps) {
  const [optimistic, setOptimistic] = useState<OptimisticSettings | null>(null);
  const [inputVersion, setInputVersion] = useState(0);
  const [fromCategoryId, setFromCategoryId] = useState("");
  const [toCategoryId, setToCategoryId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const settingsRef = useRef<HTMLDetailsElement>(null);
  const currentStore = useMemo(
    () => applyOptimisticSettings(store, optimistic),
    [optimistic, store]
  );
  const model = useMemo(() => buildMoneyBudgets(currentStore, today), [currentStore, today]);
  const defaultCategoryId = model.flexCategories[0]?.id ?? "";
  const selectedFromId = model.flexCategories.some((category) => category.id === fromCategoryId)
    ? fromCategoryId
    : defaultCategoryId;
  const selectedToId = model.flexCategories.some((category) => category.id === toCategoryId)
    ? toCategoryId
    : defaultCategoryId;

  function closeSettings(): void {
    if (settingsRef.current !== null) {
      settingsRef.current.open = false;
    }
  }

  function persist(write: PlannerStoreWrite): void {
    setOptimistic((current) => ({
      baseValue: current?.baseValue ?? store[write.key],
      value: write.value
    }));
    closeSettings();
    onPersist([write]);
  }

  function saveBudget(categoryId: string, field: MoneyBudgetField, value: string): void {
    const valueCents = parseAmountToCents(value);
    if (valueCents === null) {
      closeSettings();
      setInputVersion((current) => current + 1);
      return;
    }
    persist(buildMoneyCategoryUpdate(currentStore, categoryId, field, valueCents, today));
  }

  function addTransfer(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const amountCents = parseAmountToCents(transferAmount);
    if (!amountCents || amountCents <= 0 || !selectedFromId || !selectedToId
      || selectedFromId === selectedToId) {
      return;
    }
    persist(buildMoneyTransferAddition(currentStore, {
      amountCents,
      fromCategoryId: selectedFromId,
      toCategoryId: selectedToId
    }, {
      id: randomId(),
      timestamp: new Date().toISOString()
    }));
    setTransferAmount("");
  }

  function deleteTransfer(transferId: string): void {
    persist(buildMoneyTransferDeletion(currentStore, transferId));
  }

  return (
    <>
      <div className="section-head">
        <div>
          <h3>Budgets and categories</h3>
          <p className="small-note">Protect the fixed money, then give every flexible euro a job.</p>
        </div>
      </div>
      <details className="money-settings-panel" data-react-budget-settings="true" ref={settingsRef}>
        <summary className="money-settings-toggle">
          <span>Budget settings</span>
          <span className="hint">Open when you want to adjust monthly setup.</span>
        </summary>
        <div className="money-settings-body">
          <label className="form-row money-target-row" htmlFor="moneyMonthlyTarget">
            <span>Total monthly budget</span>
            <input
              autoComplete="off"
              id="moneyMonthlyTarget"
              inputMode="decimal"
              placeholder="1300"
              readOnly
              value={model.formattedTarget}
            />
          </label>
          <div id="moneyCategoryBudgetList">
            <div className="money-budget-list">
              {model.sections.map((section) => (
                <details className="money-budget-section" key={section.key}>
                  <summary className="money-budget-section-head">
                    <strong>{section.title}</strong>
                    <span>{section.note}</span>
                  </summary>
                  <div className="money-budget-grid">
                    {section.rows.map((row) => (
                      <div className={row.className} key={row.id}>
                        <div className="money-budget-head">
                          <div className="money-budget-title-block">
                            <strong>{row.name}</strong>
                            <span className="money-budget-kind">{row.kind}</span>
                          </div>
                          <div className="money-budget-summary">
                            <span>{row.spent}</span>
                            <strong>{row.remaining}</strong>
                          </div>
                        </div>
                        <div className="money-budget-inputs">
                          <MoneyBudgetInput
                            ariaLabel={`${row.name} month`}
                            key={`${row.id}-month-${row.monthValue}-${inputVersion}`}
                            label="Month"
                            onCommit={(value) => saveBudget(row.id, "budgetCents", value)}
                            value={row.monthValue}
                          />
                          <MoneyBudgetInput
                            ariaLabel={`${row.name} week`}
                            key={`${row.id}-week-${row.weekValue}-${inputVersion}`}
                            label="Week"
                            onCommit={(value) => saveBudget(row.id, "weeklyBudgetCents", value)}
                            value={row.weekValue}
                          />
                        </div>
                        <div className="money-budget-metrics">
                          <span className="money-budget-pace">{row.guide}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
          <details className="money-transfer-panel">
            <summary className="money-settings-toggle money-settings-subtoggle">
              <span>Move budget between categories</span>
              <span className="hint">Only when one category needs cover.</span>
            </summary>
            <form className="money-transfer-form" id="moneyTransferForm" onSubmit={addTransfer}>
              <div className="money-transfer-grid">
                <select
                  aria-label="Move budget from"
                  id="moneyTransferFrom"
                  onChange={(event) => setFromCategoryId(event.currentTarget.value)}
                  value={selectedFromId}
                >
                  {model.flexCategories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <select
                  aria-label="Move budget to"
                  id="moneyTransferTo"
                  onChange={(event) => setToCategoryId(event.currentTarget.value)}
                  value={selectedToId}
                >
                  {model.flexCategories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <input
                  autoComplete="off"
                  id="moneyTransferAmount"
                  inputMode="decimal"
                  onChange={(event) => setTransferAmount(event.currentTarget.value)}
                  placeholder="10"
                  value={transferAmount}
                />
                <button className="secondary-button" type="submit">Move</button>
              </div>
              <div className="money-transfer-list" id="moneyTransferList">
                {model.transfers.map((transfer) => (
                  <div className="money-transfer-row" key={transfer.id}>
                    <strong>{transfer.toCategoryName}</strong>
                    <span>{transfer.amount}</span>
                    <button
                      className="secondary-button"
                      onClick={() => deleteTransfer(transfer.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </form>
          </details>
        </div>
      </details>
    </>
  );
}
