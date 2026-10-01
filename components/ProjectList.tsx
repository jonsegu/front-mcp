type ProjectListProps = {
  projects: string[];
};

export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No hay proyectos disponibles.</p>;
  }

  return (
    <ul className="space-y-2">
      {projects.map((project) => (
        <li
          key={project}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600"
        >
          {project}
        </li>
      ))}
    </ul>
  );
}
