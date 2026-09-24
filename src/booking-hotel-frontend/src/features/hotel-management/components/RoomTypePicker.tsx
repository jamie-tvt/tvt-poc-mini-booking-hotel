"use client";

import { SelectField } from "@/components/ui/Field";
import type { RoomTypeDto } from "@/types/domain";

export function RoomTypePicker({
  id,
  roomTypes,
  value,
  onChange,
}: {
  id: string;
  roomTypes: RoomTypeDto[];
  value: number | null;
  onChange: (id: number) => void;
}) {
  return (
    <SelectField id={id} label="Loại phòng" value={value ?? ""} onChange={(e) => onChange(Number(e.target.value))} containerClassName="sm:max-w-sm">
      {roomTypes.map((rt) => (
        <option key={rt.id} value={rt.id}>
          {rt.name}
        </option>
      ))}
    </SelectField>
  );
}
