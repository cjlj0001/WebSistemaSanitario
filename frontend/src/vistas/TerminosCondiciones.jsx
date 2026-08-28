import React from "react"
import {
  ArrowRight,
  BrainCircuit,
  FileText,
  Mail,
  ShieldCheck,
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { useGoogleTerms } from "../useGoogleTerms"

const sections = [
  {
    id: "objeto",
    title: "1. Objeto y ámbito de aplicación",
    content: (
      <p>
        Estos términos regulan el acceso y uso de WebSistemaSanitario, una plataforma para la gestión de usuarios, estudios e imágenes médicas. Se aplican a toda persona que cree una cuenta, inicie sesión o utilice las funciones disponibles en la plataforma.
      </p>
    ),
  },
  {
    id: "servicio",
    title: "2. Descripción del servicio",
    content: (
      <p>
        La plataforma permite cargar imágenes médicas, consultar estudios, visualizar previsualizaciones, descargar imágenes en formatos disponibles y gestionar resultados asociados. Las imágenes pueden conservarse como estudios DICOM y organizarse junto con su información técnica y de usuario. Según el rol asignado, también se habilitan herramientas de búsqueda, administración y revisión de estudios.
      </p>
    ),
  },
  {
    id: "cuentas",
    title: "3. Registro y cuentas de usuario",
    content: (
      <>
        <p>
          Para usar las áreas autenticadas debes proporcionar información veraz y mantenerla actualizada. Eres responsable de la confidencialidad de tus credenciales y de las acciones realizadas con tu cuenta.
        </p>
        <p>
          La plataforma dispone de perfiles de usuario, especialista y administración con distintos permisos. Debes utilizar exclusivamente las funciones autorizadas para tu perfil y comunicar al equipo administrador cualquier sospecha de acceso no autorizado.
        </p>
      </>
    ),
  },
  {
    id: "google-oauth",
    title: "4. Autenticación mediante Google",
    content: (
      <p>
        Cuando el acceso con Google esté habilitado, la autenticación se realiza mediante Google Identity Services y el token recibido se valida en el servidor de la plataforma. El uso de esta opción también queda sujeto a las condiciones y políticas de Google. En el primer acceso, o cuando conste que no se han aceptado estos términos, se solicitará su aceptación antes de continuar.
      </p>
    ),
  },
  {
    id: "uso-permitido",
    title: "5. Uso permitido de la plataforma",
    content: (
      <>
        <p>
          Debes usar la plataforma de forma lícita, diligente y conforme a su finalidad sanitaria, asistencial, académica o de gestión autorizada. Queda prohibido, entre otros comportamientos:
        </p>
        <ul>
          <li>Acceder a cuentas, imágenes, estudios o resultados sin autorización.</li>
          <li>Compartir credenciales, suplantar identidades o eludir controles de acceso.</li>
          <li>Introducir archivos maliciosos, información falsa o contenidos que vulneren derechos de terceros.</li>
          <li>Alterar, extraer o eliminar información fuera de las funciones y permisos concedidos.</li>
        </ul>
      </>
    ),
  },
  {
    id: "imagenes-datos",
    title: "6. Imágenes médicas y datos sanitarios",
    content: (
      <>
        <p>
          La plataforma admite imágenes en formatos habituales y DICOM. Durante la carga, una imagen puede convertirse a DICOM y almacenarse junto con identificadores del estudio, serie, paciente e instancia necesarios para su gestión técnica. WebSistemaSanitario utiliza Orthanc para el almacenamiento y consulta de estudios DICOM.
        </p>
        <p>
          Solo debes incorporar imágenes e información sanitaria cuando tengas una base legítima y las autorizaciones necesarias para ello. Debes minimizar los datos introducidos, comprobar que pertenecen al paciente o estudio correcto y preservar su confidencialidad. La información sanitaria requiere una especial diligencia por su sensibilidad.
        </p>
      </>
    ),
  },
  {
    id: "ia",
    title: "7. Funcionalidades de inteligencia artificial",
    content: (
      <p>
        Al cargar una imagen, la plataforma puede ejecutar un modelo de inteligencia artificial que genera probabilidades, un hallazgo principal y una visualización Grad-CAM asociada. La administración puede seleccionar el modelo de IA activo entre los modelos disponibles. Estas funciones se ofrecen como apoyo al análisis y a la revisión de imágenes.
      </p>
    ),
  },
  {
    id: "limitaciones-ia",
    title: "8. Limitaciones del análisis automatizado",
    content: (
      <>
        <p>
          Las salidas automatizadas dependen de la calidad de la imagen, el formato, el contexto clínico, los datos de entrenamiento y las limitaciones propias del modelo. Pueden contener errores, omisiones, resultados no concluyentes o asociaciones que no sean adecuadas para un caso concreto.
        </p>
        <p>
          Ningún resultado de IA, porcentaje, etiqueta o mapa de activación constituye por sí mismo un diagnóstico médico definitivo. La plataforma no sustituye la valoración, el criterio ni la decisión de un profesional sanitario cualificado.
        </p>
      </>
    ),
  },
  {
    id: "resultados",
    title: "9. Resultados generados por la plataforma",
    content: (
      <p>
        Los resultados pueden incluir probabilidades, observaciones, imágenes generadas por IA y, cuando un perfil autorizado las incorpore, anotaciones o imágenes de resultado manual. Deben revisarse en su contexto clínico y técnico antes de usarse para cualquier finalidad asistencial. La validación disponible en la plataforma no elimina la responsabilidad de quien revisa o utiliza la información.
      </p>
    ),
  },
  {
    id: "responsabilidades",
    title: "10. Responsabilidades de la persona usuaria",
    content: (
      <p>
        Eres responsable de la exactitud y licitud de la información que aportes, de verificar que el estudio seleccionado es el correcto y de interpretar cualquier resultado con prudencia. Si actúas en nombre de una organización o de pacientes, debes contar con la autorización que corresponda. No debes tomar decisiones clínicas basándote exclusivamente en resultados automatizados.
      </p>
    ),
  },
  {
    id: "disponibilidad",
    title: "11. Disponibilidad y funcionamiento del servicio",
    content: (
      <p>
        El servicio puede verse afectado por mantenimiento, actualizaciones, incidencias de red, disponibilidad de los servicios de almacenamiento de imágenes o medidas de seguridad. Se procurará restablecer el funcionamiento cuando sea razonablemente posible, sin que ello suponga una garantía de disponibilidad ininterrumpida ni de conservación indefinida de la información.
      </p>
    ),
  },
  {
    id: "terceros",
    title: "12. Servicios y sistemas de terceros",
    content: (
      <p>
        Algunas funciones dependen de servicios externos o integrados: Google para el inicio de sesión, un servicio SMTP para el envío de códigos de recuperación de contraseña y Orthanc para la gestión de estudios DICOM. Su disponibilidad y sus condiciones pueden afectar a las funciones relacionadas. No se incorporan servicios de terceros distintos de los que sean necesarios para estas capacidades configuradas.
      </p>
    ),
  },
  {
    id: "propiedad-intelectual",
    title: "13. Propiedad intelectual",
    content: (
      <p>
        El software, la interfaz, los elementos visuales y la documentación de la plataforma están protegidos por la normativa aplicable. El acceso al servicio no te concede derechos de propiedad sobre ellos. Conservas los derechos que te correspondan sobre la información que aportes, sin perjuicio de la autorización técnica necesaria para que la plataforma la procese y muestre dentro de sus funciones.
      </p>
    ),
  },
  {
    id: "seguridad",
    title: "14. Seguridad",
    content: (
      <p>
        La plataforma aplica los controles técnicos y organizativos que estén configurados en cada despliegue, incluidos mecanismos de autenticación, permisos por rol y comunicación con sus servicios integrados. Ningún sistema puede garantizar seguridad absoluta. Debes proteger tu dispositivo, cerrar sesión al terminar y notificar cualquier incidente o vulnerabilidad detectada al equipo administrador.
      </p>
    ),
  },
  {
    id: "privacidad",
    title: "15. Protección de datos y privacidad",
    content: (
      <>
        <p>
          Estos términos regulan el uso de la plataforma y no sustituyen una política de privacidad. La aplicación puede tratar datos de cuenta, contacto, identificación, fecha de nacimiento, imágenes médicas, metadatos DICOM, resultados y datos técnicos asociados para prestar sus funcionalidades.
        </p>
        <p>
          Antes de una puesta en producción real debe completarse y ponerse a disposición una política de privacidad que identifique, entre otros extremos, a la entidad responsable del tratamiento, los canales de contacto, las finalidades, la base jurídica, los plazos de conservación, los destinatarios y los derechos de las personas interesadas. No debe asumirse ningún cumplimiento normativo, certificación o condición legal que no se haya documentado expresamente.
        </p>
      </>
    ),
  },
  {
    id: "modificaciones",
    title: "16. Modificaciones de los términos",
    content: (
      <p>
        Estos términos pueden actualizarse para reflejar cambios funcionales, técnicos, organizativos o normativos. La fecha de actualización indica la versión publicada. Cuando resulte necesario, se solicitará una nueva aceptación antes de continuar utilizando funciones que la requieran.
      </p>
    ),
  },
  {
    id: "suspension",
    title: "17. Suspensión o cancelación de cuentas",
    content: (
      <p>
        El equipo administrador podrá restringir, suspender o cancelar una cuenta cuando existan motivos razonables de seguridad, uso no autorizado, incumplimiento de estos términos o necesidad de proteger la información y el funcionamiento del sistema. Las consecuencias sobre la información asociada deberán definirse en la política de privacidad y los procedimientos operativos aplicables.
      </p>
    ),
  },
  {
    id: "legislacion",
    title: "18. Legislación aplicable y jurisdicción",
    content: (
      <p>
        La legislación aplicable y el órgano jurisdiccional competente deben ser definidos por la entidad responsable antes de publicar el servicio para uso real. Esta sección no establece una jurisdicción concreta ni limita los derechos irrenunciables que pudieran corresponder a las personas usuarias conforme a la normativa aplicable.
      </p>
    ),
  },
  {
    id: "contacto",
    title: "19. Contacto",
    content: (
      <p>
        Para consultas sobre estos términos, tu cuenta, un incidente de seguridad o el tratamiento de información, utiliza los canales internos habilitados por la administración de la plataforma. Antes de la puesta en producción debe añadirse un canal de contacto público y la identificación de la entidad responsable en la política de privacidad.
      </p>
    ),
  },
]

export default function TerminosCondiciones() {
  const location = useLocation()
  const { pendingGoogleToken } = useGoogleTerms()
  const origin = location.state?.origin
  const cameFromGoogle = origin === "google"
  const cameFromRegistration = origin === "register"
  const hasPendingGoogleAcceptance = cameFromGoogle && Boolean(pendingGoogleToken)
  const returnPath = cameFromRegistration ? "/register" : "/login"
  const returnText = cameFromRegistration ? "Volver al registro" : "Volver al inicio de sesión"
  const returnState = cameFromRegistration
    ? { registrationDraft: location.state?.registrationDraft || {} }
    : undefined

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-700 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-7xl">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <header className="bg-gradient-to-r from-emerald-700 to-teal-600 px-6 py-8 text-white sm:px-10 sm:py-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-3xl">
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  WebSistemaSanitario
                </p>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Términos y condiciones de uso
                </h1>
                <p className="mt-4 text-sm leading-6 text-emerald-50 sm:text-base">
                  Condiciones de uso para una plataforma de gestión y análisis de imágenes médicas.
                </p>
              </div>
              <p className="shrink-0 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-emerald-50">
                Última actualización: 27 de agosto de 2026
              </p>
            </div>
          </header>

          <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-6 lg:self-start">
              <nav aria-label="Índice de términos" className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FileText className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  Índice
                </div>
                <ol className="max-h-64 space-y-1 overflow-y-auto pr-1 text-sm lg:max-h-[calc(100vh-11rem)]">
                  {sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="block rounded-md px-2 py-1.5 leading-5 text-slate-600 transition hover:bg-white hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>

              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-5 text-amber-900">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <BrainCircuit className="h-4 w-4" aria-hidden="true" />
                  Aviso clínico
                </div>
                La IA es una herramienta de apoyo. Sus resultados requieren revisión profesional y no constituyen un diagnóstico definitivo.
              </div>
            </aside>

            <section className="min-w-0 space-y-8" aria-label="Contenido de los términos">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5 text-sm leading-6 text-emerald-950">
                <p className="font-semibold">Lectura importante</p>
                <p className="mt-1">
                  Al crear una cuenta o continuar con el acceso mediante Google, confirmas haber leído y aceptado estas condiciones de uso.
                </p>
              </div>

              {sections.map((section) => (
                <article key={section.id} id={section.id} className="scroll-mt-6 border-b border-slate-200 pb-8 last:border-b-0 last:pb-0">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    {section.title}
                  </h2>
                  <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
                    {section.content}
                  </div>
                </article>
              ))}

              <footer className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    Las consultas se canalizan mediante la administración de la plataforma.
                  </div>
                  <a href="#objeto" className="w-fit font-semibold text-emerald-700 hover:text-emerald-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
                    Volver al inicio
                  </a>
                </div>

                <div className="mt-5 border-t border-slate-200 pt-5">
                  <p className="font-semibold text-slate-900">Has llegado al final de los términos y condiciones.</p>
                  <p className="mt-1">
                    {cameFromRegistration
                      ? "Vuelva al registro para confirmar la aceptación y crear su cuenta."
                      : cameFromGoogle
                      ? hasPendingGoogleAcceptance
                        ? "Vuelve al inicio de sesión para marcar la aceptación y continuar con Google."
                        : "Vuelve al inicio de sesión e inicia de nuevo el acceso con Google."
                      : "Vuelva al inicio de sesión para continuar."}
                  </p>
                  <Link
                    to={returnPath}
                    state={returnState}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:w-auto"
                  >
                    {returnText}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </footer>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
