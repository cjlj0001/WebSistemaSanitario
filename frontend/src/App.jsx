import React from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"

import Home from "./vistas/Home"
import Upload from "./vistas/SubidaImg"
import Resultados from "./vistas/Resultados"
import Login from "./vistas/Login"
import Registro from "./vistas/Registro"
import Admin from "./vistas/Admin"
import Specialist from "./vistas/Specialist"
import DataUser from "./vistas/DataUser"
import TerminosCondiciones from "./vistas/TerminosCondiciones"
import { GoogleTermsProvider } from "./GoogleTermsContext.jsx"

function App() {

  return (
    <BrowserRouter>

      <GoogleTermsProvider>
        <Routes>

          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Registro />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/resultados" element={<Resultados />} />
          <Route path="/profile" element={<DataUser />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/specialist" element={<Specialist />} />
          <Route path="/terminos-y-condiciones" element={<TerminosCondiciones />} />
        </Routes>
      </GoogleTermsProvider>

    </BrowserRouter>
  )
}

export default App
