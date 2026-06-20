import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { enumOptions, type EnumMap } from "@/lib/enums";

// RHF-controlled shadcn Select for integer enum fields (stored as numbers in the form).
type Props<T extends FieldValues> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<T, any, any>;
  name: Path<T>;
  map?: EnumMap;
  /** Explicit options list; takes precedence over `map` when provided. */
  options?: { value: number; label: string }[];
  label?: string;
  id?: string;
};

export function EnumSelect<T extends FieldValues>({ control, name, map, options, label, id }: Props<T>) {
  const items = options ?? (map ? enumOptions(map) : []);
  const select = (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
          <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {items.map((o) => (
              <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
  if (!label) return select;
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {select}
    </label>
  );
}
