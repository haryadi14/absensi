"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function LandingPage() {
  const [session, setSession] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, [supabase]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-8 py-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-black text-blue-600 tracking-tighter">GO ABESN</h1>
        <div className="space-x-6 flex items-center">
          {session ? (
            <Link href="/attendance" className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold hover:bg-blue-700 transition-all">
              Masuk ke Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="font-bold text-slate-600 hover:text-blue-600">Login</Link>
              <Link href="/register" className="bg-slate-900 text-white px-6 py-2 rounded-full font-bold hover:bg-slate-800 transition-all">
                Daftar Karyawan
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 pt-20 pb-32 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="bg-blue-50 text-blue-600 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
            Sistem Presensi GPS v1.0
          </span>
          <h2 className="text-6xl font-black text-slate-900 leading-[1.1] mt-6">
            Kelola Absensi Lapangan <br /> 
            <span className="text-blue-600">Tanpa Manipulasi.</span>
          </h2>
          <p className="mt-8 text-slate-500 text-lg leading-relaxed max-w-md">
            Pantau kehadiran karyawan secara real-time dengan akurasi lokasi berbasis GPS. Efisien, transparan, dan terpercaya.
          </p>
          
          <div className="mt-10 flex gap-4">
            <Link href="/register" className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-200 hover:scale-105 transition-all">
              Mulai Sekarang
            </Link>
            <div className="flex items-center gap-3 px-6">
               <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white"></div>
                  <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white"></div>
                  <div className="w-8 h-8 rounded-full bg-slate-400 border-2 border-white"></div>
               </div>
               <p className="text-xs text-slate-400 font-medium">Dipercaya oleh <br/> 10+ Perusahaan</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="bg-blue-600/5 absolute inset-0 rounded-3xl -rotate-3"></div>
          <div className="relative bg-white border border-slate-100 p-8 rounded-3xl shadow-2xl">
            <div className="space-y-4">
              <div className="h-4 w-1/2 bg-slate-100 rounded"></div>
              <div className="h-20 w-full bg-blue-50 rounded-2xl"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-12 bg-slate-50 rounded-xl"></div>
                <div className="h-12 bg-slate-50 rounded-xl"></div>
              </div>
              <div className="h-12 w-full bg-blue-600 rounded-xl"></div>
            </div>
          </div>
        </div>
      </main>

      {/* Stats Section */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div>
            <h4 className="text-4xl font-black text-slate-900">99.9%</h4>
            <p className="text-slate-500 mt-2 font-medium">Akurasi GPS</p>
          </div>
          <div>
            <h4 className="text-4xl font-black text-slate-900">Real-time</h4>
            <p className="text-slate-500 mt-2 font-medium">Laporan Langsung</p>
          </div>
          <div>
            <h4 className="text-4xl font-black text-slate-900">Zero</h4>
            <p className="text-slate-500 mt-2 font-medium">Manipulasi Data</p>
          </div>
        </div>
      </section>
    </div>
  );
}