import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import React from "react";

export default function Register() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A1628] px-5 text-[#E2E8F0]">
      <section className="w-full max-w-md rounded-[20px] border border-[#243356] bg-[#111E35] p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4F8EF7] to-[#7C3AED] text-3xl">🎓</div>
          <h1 className="font-display text-3xl font-extrabold text-white">WijiEdu</h1>
          <p className="mt-1 text-sm text-[#8898AA]">Tu espacio académico en un solo lugar</p>
        </div>
        <p className="mb-6 text-center text-sm leading-6 text-[#B8C4D6]">Regístrate para acceder a materias, calificaciones, actividades y entregas.</p>
        <Button onClick={() => startLogin()} className="w-full bg-[#4F8EF7] py-5 font-semibold hover:bg-[#3A7AE8]">Regístrate gratis</Button>
        <button onClick={() => startLogin()} className="mt-4 w-full text-sm font-semibold text-[#75A7FF] transition hover:text-white">¿Ya tienes una cuenta? Acceder</button>
      </section>
    </main>
  );
}
