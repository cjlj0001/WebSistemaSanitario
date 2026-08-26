import React from "react";
import { Link } from "react-router-dom";
import fondo from "../assets/fondoHome.jpg";

export default function Home() {
  return (
    <div className="relative h-screen flex flex-col overflow-hidden">

      <div
        className="absolute inset-0 bg-cover bg-center blur-sm brightness-75 saturate-40 scale-105"
        style={{ backgroundImage: `url(${fondo})` }}
      />

      <header className="relative z-10 bg-green-700 text-white py-4 text-center">
        <h1 className="text-xl md:text-2xl font-bold">
          SISTEMA DE ANÁLISIS DE IMÁGENES MÉDICAS
        </h1>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-3xl bg-gray-200/80 backdrop-blur-sm rounded-xl p-6 md:p-10 shadow-xl">

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-black">
            Bienvenido/a, inicie sesión para acceder
          </h2>

          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-6">

            <Link to="/login" className="w-full sm:w-auto">
              <button className="w-full sm:w-64 bg-green-700 text-white text-lg md:text-xl py-3 rounded-lg hover:bg-green-500 transition">
                Iniciar sesión
              </button>
            </Link>

            <Link to="/register" className="w-full sm:w-auto">
              <button className="w-full sm:w-64 bg-green-700 text-white text-lg md:text-xl py-3 rounded-lg hover:bg-green-500 transition">
                Registrarse
              </button>
            </Link>

          </div>
        </div>
      </main>

      <footer className="relative z-10 bg-gray-900 text-white py-4 text-center">
        <p>Sistema sanitario CJLJ UJA 2026</p>
      </footer>

    </div>
  );
}