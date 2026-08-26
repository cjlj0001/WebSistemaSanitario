import React from "react"
import { useNavigate } from "react-router-dom"

export default function TerminosCondiciones() {
  const navigate = useNavigate()

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate("/login")
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-700">
      <div className="mx-auto w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <button
          type="button"
          onClick={goBack}
          className="mb-8 inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <span aria-hidden="true">←</span> Volver
        </button>

        <header className="mb-10 border-b border-slate-200 pb-6">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-green-700">Plataforma sanitaria</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Términos y condiciones de uso</h1>
          <p className="mt-3 text-sm text-slate-500">Última actualización: 26 de abril de 2026</p>
        </header>

        <section className="space-y-7 leading-7">
          <article>
            <h2 className="mb-2 text-xl font-semibold text-slate-900">1. Objeto de la plataforma</h2>
            <p>
              Esta plataforma permite la gestión de estudios de imagen médica y ofrece herramientas de apoyo al análisis de resultados. Sus funcionalidades están diseñadas para facilitar el trabajo de usuarios autorizados y no sustituyen el criterio clínico, el diagnóstico ni la decisión de un profesional sanitario cualificado.
            </p>
          </article>

          <article>
            <h2 className="mb-2 text-xl font-semibold text-slate-900">2. Acceso y uso profesional</h2>
            <p>
              Debes utilizar el servicio de forma lícita, diligente y conforme a su finalidad asistencial, académica o de gestión autorizada. Quedan prohibidos el acceso no autorizado, la suplantación de identidad, la alteración de información y cualquier actuación que afecte a la seguridad, disponibilidad o integridad del sistema.
            </p>
          </article>

          <article>
            <h2 className="mb-2 text-xl font-semibold text-slate-900">3. Información clínica y responsabilidad</h2>
            <p>
              La persona usuaria es responsable de comprobar la exactitud de la información incorporada y de interpretar los resultados en su contexto clínico. Las salidas generadas mediante herramientas de inteligencia artificial o análisis automatizado son orientativas y deben ser revisadas por personal competente antes de adoptar decisiones asistenciales.
            </p>
          </article>

          <article>
            <h2 className="mb-2 text-xl font-semibold text-slate-900">4. Protección de datos y confidencialidad</h2>
            <p>
              Los datos personales y la información sanitaria se tratarán únicamente para prestar las funcionalidades de la plataforma, aplicando las medidas técnicas y organizativas disponibles. Debes preservar la confidencialidad de la información a la que accedas y utilizar exclusivamente datos para los que dispongas de la debida autorización.
            </p>
          </article>

          <article>
            <h2 className="mb-2 text-xl font-semibold text-slate-900">5. Cuenta y credenciales</h2>
            <p>
              Eres responsable de custodiar tus credenciales y de comunicar sin demora cualquier sospecha de acceso no autorizado. Las actividades realizadas con tu cuenta se atribuirán a su titular, salvo que se haya notificado previamente un uso indebido.
            </p>
          </article>

          <article>
            <h2 className="mb-2 text-xl font-semibold text-slate-900">6. Disponibilidad y mantenimiento</h2>
            <p>
              El servicio puede verse afectado temporalmente por tareas de mantenimiento, actualizaciones, incidencias técnicas o medidas de seguridad. Se realizarán esfuerzos razonables para mantener la continuidad del servicio y restablecerlo cuando sea necesario.
            </p>
          </article>

          <article>
            <h2 className="mb-2 text-xl font-semibold text-slate-900">7. Actualización de las condiciones</h2>
            <p>
              Estas condiciones podrán actualizarse cuando sea necesario para adaptar la plataforma a cambios funcionales, técnicos o normativos. La aceptación registrada corresponde a la versión vigente en el momento de crear la cuenta o de completar el primer acceso con Google.
            </p>
          </article>

          <article>
            <h2 className="mb-2 text-xl font-semibold text-slate-900">8. Contacto</h2>
            <p>
              Para consultas sobre estas condiciones, la gestión de tu cuenta o el tratamiento de la información, contacta con el equipo administrador a través de los canales internos habilitados.
            </p>
          </article>
        </section>
      </div>
    </main>
  )
}
