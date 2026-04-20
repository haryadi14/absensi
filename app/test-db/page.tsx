"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function TestDBPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Menghubungkan ke Supabase...");
  const [tables, setTables] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    async function testConnection() {
      try {
        // Kita mencoba mengambil data dari tabel 'profiles' 
        // (meskipun kosong, jika tabel ada maka koneksi berhasil)
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .limit(1);

        if (error) {
          throw error;
        }

        setStatus("success");
        setMessage("Koneksi Berhasil! Aplikasi sudah terhubung ke Supabase.");
        setTables(data || []);
      } catch (err: any) {
        console.error(err);
        setStatus("error");
        setMessage(`Koneksi Gagal: ${err.message || "Pastikan URL dan API Key benar."}`);
      }
    }

    testConnection();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Database Connection Test</h1>
        
        <div className={`p-4 rounded-lg mb-4 ${
          status === "loading" ? "bg-blue-100 text-blue-700" :
          status === "success" ? "bg-green-100 text-green-700" :
          "bg-red-100 text-red-700"
        }`}>
          {message}
        </div>

        {status === "success" && (
          <div className="text-left text-sm text-gray-600 bg-gray-50 p-4 rounded border">
            <p>✅ URL terdeteksi</p>
            <p>✅ Anon Key terdeteksi</p>
            <p>✅ Tabel 'profiles' ditemukan</p>
          </div>
        )}

        {status === "error" && (
          <div className="text-left text-xs text-red-500 bg-red-50 p-4 rounded border mt-2">
            <p>Tips Perbaikan:</p>
            <ul className="list-disc ml-4">
              <li>Cek apakah file <b>.env</b> sudah di-save.</li>
              <li>Pastikan sudah menjalankan SQL script di dashboard Supabase.</li>
              <li>Restart terminal (npm run dev).</li>
            </ul>
          </div>
        )}
        
        <a href="/" className="inline-block mt-6 text-blue-600 hover:underline"> Kembali ke Home</a>
      </div>
    </div>
  );
}