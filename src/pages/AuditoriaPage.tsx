import { PageHeader } from '../components/ui/PageHeader';

export function AuditoriaPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Auditoría"
        title="Trazas de escritura"
        description="El middleware del API guarda POST, PUT y DELETE en logs_auditoria: usuario responsable, acción, datos enviados y el estado HTTP."
      />
      <section className="rounded-2xl border border-slate-200/80 bg-white px-5 py-8 shadow-card">
        <p className="text-sm leading-6 text-slate-600">
          FastAPI no publica un GET para leer esa tabla. El panel no consulta una ruta inventada. Cuando el backend exponga el listado, esta vista podrá paginarlo con el mismo cliente y el encabezado Bearer.
        </p>
      </section>
    </div>
  );
}
