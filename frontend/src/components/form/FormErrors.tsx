export function FormErrors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <ul className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
      {errors.map((m) => <li key={m}>{m}</li>)}
    </ul>
  );
}
