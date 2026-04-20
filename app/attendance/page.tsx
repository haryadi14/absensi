"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { getDistance } from "@/utils/distance";
import { useRouter } from "next/navigation";

export default function AttendancePage() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [filter, setFilter] = useState<"daily" | "weekly" | "monthly">("daily");

  const supabase = createClient();
  const router = useRouter();

  // --- 1. AMBIL DATA AWAL ---
  const fetchInitialData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // Ambil Profil (Nama & Koordinat Kantor)
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setUserProfile(profile);

    // Ambil Absen Hari Ini
    const today = new Date().toISOString().split('T')[0];
    const { data: attendance } = await supabase
      .from("attendances")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00Z`)
      .lte("created_at", `${today}T23:59:59Z`)
      .maybeSingle();

    setTodayAttendance(attendance);
    setIsCheckingAuth(false);
  }, [supabase, router]);

  // --- 2. AMBIL RIWAYAT TERFILTER ---
  const fetchHistory = useCallback(async (userId: string, filterType: string) => {
    const now = new Date();
    let startDate = new Date();

    if (filterType === "daily") startDate.setHours(0, 0, 0, 0);
    else if (filterType === "weekly") startDate.setDate(now.getDate() - 7);
    else if (filterType === "monthly") startDate.setDate(now.getDate() - 30);

    const { data, error } = await supabase
      .from("attendances")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (!error) setHistory(data || []);
  }, [supabase]);

  // --- 3. GPS TRACKING REAL-TIME ---
  useEffect(() => {
    fetchInitialData();
    
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => console.error("GPS Error:", err),
        { enableHighAccuracy: true } // Menjamin akurasi tinggi
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [fetchInitialData]);

  useEffect(() => {
    if (userProfile?.id) fetchHistory(userProfile.id, filter);
  }, [filter, userProfile, fetchHistory]);

  // --- 4. LOGIKA KUNCI LOKASI KERJA ---
  const handleLockLocation = async () => {
    if (!location) return alert("Menunggu sinyal GPS...");
    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        office_lat: location.lat,
        office_long: location.lng
      })
      .eq("id", userProfile.id);

    if (error) alert("Gagal: " + error.message);
    else {
      alert("Lokasi kerja Anda berhasil dikunci di titik ini!");
      fetchInitialData();
    }
    setLoading(false);
  };

  // --- 5. LOGIKA ABSEN MASUK / PULANG ---
  const handleAttendance = async () => {
    if (!location || !userProfile?.office_lat) return;
    setLoading(true);

    const distance = getDistance(
      location.lat, 
      location.lng, 
      userProfile.office_lat, 
      userProfile.office_long
    );
    
    const isWithinRadius = distance <= 100; // Radius 100 Meter

    if (!todayAttendance) {
      // ABSEN MASUK
      const { error } = await supabase.from("attendances").insert({
        user_id: userProfile.id,
        lat: location.lat,
        lng: location.lng,
        status: isWithinRadius ? "Hadir" : "Luar Area",
        check_in: new Date().toISOString()
      });
      if (!error) alert(isWithinRadius ? "Berhasil Absen Masuk!" : `Luar Area (${Math.round(distance)}m)`);
    } else {
      // ABSEN PULANG
      const { error } = await supabase.from("attendances")
        .update({ check_out: new Date().toISOString() })
        .eq('id', todayAttendance.id);
      if (!error) alert("Berhasil Absen Pulang!");
    }

    setLoading(false);
    fetchInitialData();
  };

  if (isCheckingAuth) return <div className="p-10 text-center text-gray-400 font-bold">Inisialisasi Sistem GPS...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pb-20">
      {/* Header */}
      <div className="w-full max-w-md bg-white p-5 flex justify-between items-center shadow-sm sticky top-0 z-20">
        <div className="flex flex-col">
            <span className="text-blue-600 font-black text-xl italic tracking-tighter">PRO-HR</span>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Field Personnel System</span>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full">LOGOUT</button>
      </div>

      <div className="w-full max-w-md p-6">
        {/* Card Profil */}
        <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-2xl mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-10 -mt-10"></div>
          <p className="opacity-50 text-[10px] font-bold uppercase tracking-widest mb-1">User Profile</p>
          <h2 className="text-2xl font-black capitalize tracking-tight">{userProfile?.full_name}</h2>
          
          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
            <div>
              <p className="text-[9px] opacity-40 uppercase font-bold mb-1 tracking-tighter">Check-In</p>
              <p className="text-sm font-mono font-bold text-blue-400">{todayAttendance?.check_in ? new Date(todayAttendance.check_in).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "--:--"}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] opacity-40 uppercase font-bold mb-1 tracking-tighter">Check-Out</p>
              <p className="text-sm font-mono font-bold text-orange-400">{todayAttendance?.check_out ? new Date(todayAttendance.check_out).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "--:--"}</p>
            </div>
          </div>
        </div>

        {/* LOGIKA TAMPILAN UTAMA */}
        {!userProfile?.office_lat ? (
          // MODE SETUP: Jika Belum Kunci Lokasi
          <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-blue-50 text-center">
             <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
             </div>
             <h3 className="font-black text-slate-800 text-xl">Setup Lokasi Kerja</h3>
             <p className="text-slate-500 text-xs mt-3 mb-8 leading-relaxed">
                Anda belum mengatur titik kantor. Silakan berdiri tepat di lokasi kerja Anda sekarang, lalu klik tombol di bawah.
             </p>
             <button 
                onClick={handleLockLocation}
                disabled={loading || !location}
                className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-200 active:scale-95 transition-all disabled:bg-gray-200"
             >
                {loading ? "MENGUNCI..." : "KUNCI LOKASI SAYA"}
             </button>
          </div>
        ) : (
          // MODE ABSEN: Jika Lokasi Sudah Ada
          <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100 text-center">
            <div className="flex justify-center mb-6">
                {!todayAttendance ? (
                    <div className="px-4 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full border border-indigo-100 uppercase tracking-widest">Status: Ready</div>
                ) : !todayAttendance.check_out ? (
                    <div className="px-4 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-full border border-amber-100 uppercase tracking-widest animate-pulse">Status: Working</div>
                ) : (
                    <div className="px-4 py-1 bg-green-50 text-green-600 text-[10px] font-black rounded-full border border-green-100 uppercase tracking-widest">Status: Finished</div>
                )}
            </div>

            <div className="mb-8 flex items-center justify-center gap-3 bg-slate-50 p-3 rounded-2xl border border-dashed border-slate-200">
               <div className={`w-2.5 h-2.5 rounded-full ${location ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
               <span className="text-[11px] font-mono font-bold text-slate-600">
                  {location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "Mencari Sinyal GPS..."}
               </span>
            </div>

            {(!todayAttendance || !todayAttendance.check_out) ? (
              <button 
                onClick={handleAttendance}
                disabled={loading || !location}
                className={`w-full py-5 rounded-3xl font-black text-white shadow-2xl transition-all active:scale-95
                  ${!todayAttendance ? 'bg-blue-600 shadow-blue-200' : 'bg-orange-500 shadow-orange-200'}`}
              >
                {loading ? "MEMPROSES..." : !todayAttendance ? "MASUK SEKARANG" : "PULANG SEKARANG"}
              </button>
            ) : (
              <div className="p-5 bg-green-50 text-green-700 rounded-3xl text-xs font-bold border border-green-100 flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                </svg>
                Presensi hari ini telah selesai.
              </div>
            )}
          </div>
        )}

        {/* Filter Riwayat */}
        <div className="mt-12">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h3 className="font-black text-slate-800 text-lg">Riwayat Aktivitas</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Log Log Presensi Anda</p>
                </div>
                <div className="flex bg-slate-200 p-1 rounded-xl">
                    {(['daily', 'weekly', 'monthly'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all ${
                                filter === type ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                            }`}
                        >
                            {type === 'daily' ? 'HARI' : type === 'weekly' ? 'MINGGU' : 'BULAN'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                {history.map((item) => (
                    <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-black text-slate-800">
                                    {new Date(item.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                                </p>
                                <div className="flex gap-4 mt-3">
                                    <div>
                                        <p className="text-[8px] text-slate-400 uppercase font-bold">In</p>
                                        <p className="text-xs font-mono font-bold text-slate-600">{item.check_in ? new Date(item.check_in).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--'}</p>
                                    </div>
                                    <div className="border-l border-slate-100 pl-4">
                                        <p className="text-[8px] text-slate-400 uppercase font-bold">Out</p>
                                        <p className="text-xs font-mono font-bold text-slate-600">{item.check_out ? new Date(item.check_out).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--'}</p>
                                    </div>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter ${
                                item.status === 'Hadir' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                            }`}>
                                {item.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}