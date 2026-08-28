import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ClipboardPlus, Images, Stethoscope } from "lucide-react"
import ImageUploader from "../components/ImageUploader"
import ImageResult from "../components/image/ImageResult"
import Profile from "../components/Profile"
import Role from "../components/security/Role"

function Upload() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedStudy, setUploadedStudy] = useState([])
  const [modalVisible, setModalVisible] = useState(false)
  const navigate = useNavigate()

  const closeModal = () => {
    setModalVisible(false)

    setTimeout(() => {
      setUploadedStudy([])
    }, 300)
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-100">

      <header className="flex shrink-0 items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-3 text-white shadow-sm sm:px-6 md:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 sm:h-12 sm:w-12">
            <ClipboardPlus className="h-6 w-6 text-white" />
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-50 sm:text-xs">
              ÁREA DE SUBIDA
            </p>

            <h1 className="mt-0.5 text-lg font-bold leading-tight text-white sm:text-xl">
              Subir imagen médica
            </h1>

            <p className="text-sm leading-5 text-emerald-50">
              Suba una imagen para generar su análisis por IA.
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <Profile disabled={isUploading} />
        </div>
      </header>

      <section className="flex min-h-0 flex-1 justify-center px-4 py-4 sm:px-6 md:px-8 lg:items-center lg:py-5">
        <div className="w-full max-w-5xl">

          <div className="overflow-visible rounded-3xl border border-emerald-200 bg-white shadow-sm">

            <div className="px-4 py-4 sm:px-6 sm:py-5 md:px-7 md:py-6">

              <div className="flex w-full flex-col gap-2">

                <div className="w-full">
                  <ImageUploader
                    className="w-full"
                    onLoadingChange={setIsUploading}
                    onUploaded={(study) => {
                      const safeStudy = Array.isArray(study) ? study : []

                      setUploadedStudy(safeStudy)
                      setModalVisible(safeStudy.length > 0)
                    }}
                  />
                </div>

                <div className="w-full">

                  <Link
                    to="/resultados"
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-base font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
                  >
                    <Images className="h-5 w-5 shrink-0" />
                    <span>Mis estudios</span>
                  </Link>

                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {isUploading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-6 text-center shadow-2xl">

            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <ClipboardPlus className="h-7 w-7 animate-pulse text-emerald-600" />
            </div>

            <h2 className="text-lg font-bold text-slate-900">
              Subiendo imagen médica
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Espera mientras se analiza y guarda el estudio.
            </p>

          </div>
        </div>
      )}

      {uploadedStudy.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          <button
            type="button"
            aria-label="Cerrar"
            className={`absolute inset-0 bg-slate-950/60 transition-opacity ${
              modalVisible ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeModal}
          />

          <section
            className={`relative z-50 max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl transition-all sm:p-6 ${
              modalVisible
                ? "scale-100 opacity-100"
                : "scale-95 opacity-0"
            }`}
          >

            <div className="mb-4 flex items-start justify-between gap-3">

              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-slate-800">
                  Estudio subido
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  El análisis se ha generado correctamente.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  closeModal()
                  navigate("/upload", { replace: true })
                }}
                className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                Cerrar
              </button>

            </div>

            <ImageResult
              images={uploadedStudy}
              loading={false}
              variant="default"
              imageViewMode="estudio"
            />

          </section>
        </div>
      )}

    </main>
  )
}
export default Upload
