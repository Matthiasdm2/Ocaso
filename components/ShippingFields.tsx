"use client";
import { useEffect, useState } from "react";

type ShipState = {
  length: string;
  width: string;
  height: string;
  weight: string;
};

type Props = {
  /** optioneel: beginwaarden (bv. bij edit) */
  value?: Partial<ShipState>;
  /** optioneel: bubbelt wijzigingen omhoog */
  onChange?: (v: ShipState) => void;
};

export default function ShippingFields({ value, onChange }: Props) {
  const [state, setState] = useState<ShipState>({
    length: value?.length ?? "",
    width: value?.width ?? "",
    height: value?.height ?? "",
    weight: value?.weight ?? "",
  });

  useEffect(() => {
    onChange?.(state);
  }, [state, onChange]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="space-y-2">
        <label className="text-sm">Lengte (cm)</label>
        <input
          inputMode="numeric"
          value={state.length}
          onChange={(e) => setState((s) => ({ ...s, length: e.target.value }))}
          className="w-full rounded-xl border border-gray-200 px-3 py-2"
          placeholder="0"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm">Breedte (cm)</label>
        <input
          inputMode="numeric"
          value={state.width}
          onChange={(e) => setState((s) => ({ ...s, width: e.target.value }))}
          className="w-full rounded-xl border border-gray-200 px-3 py-2"
          placeholder="0"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm">Hoogte (cm)</label>
        <input
          inputMode="numeric"
          value={state.height}
          onChange={(e) => setState((s) => ({ ...s, height: e.target.value }))}
          className="w-full rounded-xl border border-gray-200 px-3 py-2"
          placeholder="0"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm">Gewicht (kg)</label>
        <input
          inputMode="decimal"
          value={state.weight}
          onChange={(e) => setState((s) => ({ ...s, weight: e.target.value }))}
          className="w-full rounded-xl border border-gray-200 px-3 py-2"
          placeholder="0.00"
        />
      </div>
    </div>
  );
}
