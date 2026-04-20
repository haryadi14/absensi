"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const [attendances, setAttendances] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, hadir: 0, luarArea: 0 });
  
  const supabase = createClient();
  const router = useRouter();

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    
    // 1. Cek User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // 2. Ambil Profil Admin
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profileData || profileData.role !== "ADMIN") {
      alert("Akses Ditolak!");
      router.push("/attendance");
      return;
    }
    setProfile(profileData);

    // 3. AMBIL DATA ABSEN (Sesuai field di Gambar DB Anda)
    const { data: attendanceData, error: attError } = await supabase
      .from("attendances")
      .select(`
        id,
        created_at,
        check_in,
        check_out,
        status,
        lat,
        lng,
        user_id,
        profiles (
          full_name
        )
      `)
      .order("created_at", { ascending: false });

    if (attError) {
      console.error("Detail Error:", attError);
      alert("Gagal ambil data: " + attError.message);
    } else if (attendanceData) {
      // --- PERBAIKAN DI SINI: SIMPAN KE STATE ---
      setAttendances(attendanceData);

      // Hitung Statistik
      const total = attendanceData.length;
      const hadir = attendanceData.filter(a => a.status === 'Hadir').length;
      setStats({
        total: total,
        hadir: hadir,
        luarArea: total - hadir
      });
    }

    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleExport = () => {
    const headers = ["Nama", "Tanggal", "Masuk", "Pulang", "Status"];
    const csvContent = [
      headers.join(","),
      ...attendances.map(a => [
        a.profiles?.full_name || "N/A",
        new Date(a.created_at).toLocaleDateString(),
        a.check_in ? new Date(a.check_in).toLocaleTimeString() : "-",
        a.check_out ? new Date(a.check_out).toLocaleTimeString() : "-",
        a.status
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Laporan_Absen.csv`;
    link.click();
  };

  if (loading) return <div className="p-20 text-center">Memuat Data HR...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Navbar */}
      <nav className="bg-white border-b p-4 flex justify-between items-center px-8">
        <h1 className="font-bold text-xl text-blue-600">PRO-HR Admin</h1>
        <div className="flex items-center gap-4 text-sm font-medium">
            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full">{profile?.full_name}</span>
            <button onClick={() => router.push('/attendance')} className="text-gray-500 hover:text-blue-600">Mode Karyawan</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-8 mt-10">
        {/* Statistik */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <p className="text-gray-400 text-xs font-bold uppercase">Total Presensi</p>
            <h3 className="text-3xl font-bold">{stats.total}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100">
            <p className="text-green-500 text-xs font-bold uppercase">Hadir</p>
            <h3 className="text-3xl font-bold">{stats.hadir}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100">
            <p className="text-red-500 text-xs font-bold uppercase">Luar Area</p>
            <h3 className="text-3xl font-bold">{stats.luarArea}</h3>
          </div>
        </div>

        {/* Tabel */}
        <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="font-bold">Log Absensi Karyawan</h3>
            <button onClick={handleExport} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold">EKSPOR CSV</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-gray-500">
                <tr>
                  <th className="p-6">Nama</th>
                  <th className="p-6">Tanggal</th>
                  <th className="p-6">Masuk</th>
                  <th className="p-6">Pulang</th>
                  <th className="p-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {attendances.map((item) => (
                  <tr key={item.id} className="text-sm">
                    <td className="p-6 font-bold">{item.profiles?.full_name}</td>
                    <td className="p-6">{new Date(item.created_at).toLocaleDateString()}</td>
                    <td className="p-6 text-blue-600 font-mono">{item.check_in ? new Date(item.check_in).toLocaleTimeString() : '--:--'}</td>
                    <td className="p-6 text-orange-600 font-mono">{item.check_out ? new Date(item.check_out).toLocaleTimeString() : '--:--'}</td>
                    <td className="p-6">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${item.status === 'Hadir' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}