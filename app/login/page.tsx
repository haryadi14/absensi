"use client";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Login Gagal: " + error.message);
    } else {
      router.push("/attendance"); // Langsung ke halaman absen
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <form onSubmit={handleLogin} className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Login GoAbsen</h1>
        
        <div className="space-y-4">
          <input 
            type="email" placeholder="Email" required
            className="w-full p-3 border rounded-xl text-black"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" placeholder="Password" required
            className="w-full p-3 border rounded-xl text-black"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button 
            disabled={loading}
            className="w-full bg-green-600 text-white p-3 rounded-xl font-semibold hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? "Mengecek..." : "Masuk"}
          </button>
        </div>
        <p className="mt-4 text-center text-sm text-gray-600">
          Belum punya akun? <a href="/register" className="text-indigo-600 underline">Daftar di sini</a>
        </p>
      </form>
    </div>
  );
}