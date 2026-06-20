import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { enumOptions, type EnumMap } from "@/lib/enums";

// RHF-controlled shadcn Select for integer enum fields (stored as numbers in the form).
type Props<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  map: EnumMap;
  id?: string;
};

export function EnumSelect<T extends FieldValues>({ control, name, map, id }: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
          <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {enumOptions(map).map((o) => (
              <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}
