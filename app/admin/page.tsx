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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!profileData || profileData.role !== "ADMIN") return router.push("/attendance");
    setProfile(profileData);

    // AMBIL DATA (Pastikan check_out dan selfie_url dipanggil)
    const { data: attendanceData, error: attError } = await supabase
      .from("attendances")
      .select(`
        id, created_at, check_in, check_out, status, selfie_url,
        profiles ( full_name )
      `)
      .order("created_at", { ascending: false });

    if (attendanceData) {
      setAttendances(attendanceData);
      const hadir = attendanceData.filter(a => a.status === 'Hadir').length;
      setStats({ total: attendanceData.length, hadir: hadir, luarArea: attendanceData.length - hadir });
    }
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { loadAdminData(); }, [loadAdminData]);

  if (loading) return <div className="p-20 text-center font-black text-slate-300 uppercase tracking-tighter">Syncing HR Database...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white border-b p-5 flex justify-between items-center px-10 sticky top-0 z-50 shadow-sm">
        <div className="flex flex-col">
            <h1 className="font-black text-xl text-blue-600 italic tracking-tighter">GoAbsen. Admin</h1>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em]">Central Management</span>
        </div>
        <div className="flex items-center gap-6">
            <button onClick={() => router.push('/attendance')} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-all">Mode Karyawan</button>
            <div className="h-6 w-[1px] bg-slate-200"></div>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 uppercase">{profile?.full_name}</span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-8 mt-10">
        {/* Statistik Ringkas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <p className="text-slate-400 text-[9px] font-black uppercase mb-1 tracking-widest">Total Record</p>
                <h3 className="text-3xl font-black text-slate-800">{stats.total}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-green-100 shadow-sm">
                <p className="text-green-500 text-[9px] font-black uppercase mb-1 tracking-widest">Hadir</p>
                <h3 className="text-3xl font-black text-slate-800">{stats.hadir}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-red-100 shadow-sm">
                <p className="text-red-500 text-[9px] font-black uppercase mb-1 tracking-widest">Luar Area</p>
                <h3 className="text-3xl font-black text-slate-800">{stats.luarArea}</h3>
            </div>
        </div>

        {/* Tabel Laporan Utama */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-20">
          <div className="p-8 border-b bg-white flex justify-between items-center">
             <h3 className="font-black text-slate-800 text-lg tracking-tight text-uppercase">Log Presensi Harian</h3>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Live Database Feed</span>
             </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-widest border-b">
                <tr>
                  <th className="px-8 py-5">Karyawan</th>
                  <th className="px-6 py-5">Tanggal</th>
                  <th className="px-6 py-5 text-blue-500">Masuk</th>
                  <th className="px-6 py-5 text-orange-500">Pulang</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5">Selfie URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {attendances.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-8 py-5 font-black text-slate-700 text-sm italic group-hover:text-blue-600 transition-colors">
                        {item.profiles?.full_name}
                    </td>
                    <td className="px-6 py-5 text-xs font-bold text-slate-400">
                      {new Date(item.created_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}
                    </td>
                    <td className="px-6 py-5 font-mono text-xs font-black text-blue-600">
                      {item.check_in ? new Date(item.check_in).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}
                    </td>
                    <td className="px-6 py-5 font-mono text-xs font-black text-orange-500">
                      {item.check_out ? new Date(item.check_out).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${
                          item.status === 'Hadir' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
                      }`}>
                          {item.status}
                      </span>
                    </td>
                    {/* KOLOM URL SELFIE */}
                    <td className="px-6 py-5">
                      {item.selfie_url ? (
                        <a 
                          href={item.selfie_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded border border-blue-100 hover:bg-blue-600 hover:text-white transition-all block max-w-[100px] truncate text-center"
                          title={item.selfie_url}
                        >
                          LIHAT FOTO
                        </a>
                      ) : (
                        <span className="text-[9px] text-slate-300 italic font-bold">NO PHOTO</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {attendances.length === 0 && (
                <div className="p-20 text-center text-slate-300 font-bold italic text-sm">
                    Belum ada aktivitas presensi terekam.
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}