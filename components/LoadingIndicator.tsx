type LoadingIndicatorProps = {
  text?: string;
};

export function LoadingIndicator({ text = "Consultando documentación..." }: LoadingIndicatorProps) {
  return (
    <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">
      {text}
    </p>
  );
}
