"use client";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Mendaftarkan User ke Auth Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    // 2. Jika sukses, masukkan nama lengkap ke tabel 'profiles'
    if (data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([{ 
            id: data.user.id, 
            full_name: fullName, 
            role: "EMPLOYEE" 
        }]);

      if (profileError) {
        alert("Gagal membuat profil: " + profileError.message);
      } else {
        alert("Registrasi Berhasil! Silakan cek email Anda untuk verifikasi (jika diaktifkan) atau langsung login.");
        router.push("/login");
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <form onSubmit={handleRegister} className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Daftar Akun Karyawan</h1>
        
        <div className="space-y-4">
          <input 
            type="text" placeholder="Nama Lengkap" required
            className="w-full p-3 border rounded-xl text-black"
            onChange={(e) => setFullName(e.target.value)}
          />
          <input 
            type="email" placeholder="Email Kantor" required
            className="w-full p-3 border rounded-xl text-black"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" placeholder="Password (min 6 karakter)" required
            className="w-full p-3 border rounded-xl text-black"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button 
            disabled={loading}
            className="w-full bg-indigo-600 text-white p-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {loading ? "Mendaftarkan..." : "Daftar Sekarang"}
          </button>
        </div>
      </form>
    </div>
  );
}