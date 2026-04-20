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

  // --- 1. FUNGSI AMBIL DATA AWAL (FIX TIMEZONE) ---
  const fetchInitialData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // Ambil Profil
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setUserProfile(profile);

    // LOGIKA TANGGAL LOKAL: Buat rentang waktu hari ini 00:00:00 s/d 23:59:59
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    const { data: attendance } = await supabase
      .from("attendances")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)
      .maybeSingle();

    setTodayAttendance(attendance);
    setIsCheckingAuth(false);
  }, [supabase, router]);

  // --- 2. AMBIL RIWAYAT ---
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

  // --- 3. GPS TRACKING (HIGH ACCURACY) ---
  useEffect(() => {
    fetchInitialData();
    
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.error(err);
          if (err.code === 1) alert("Mohon izinkan akses lokasi di pengaturan browser HP Anda.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [fetchInitialData]);

  useEffect(() => {
    if (userProfile?.id) fetchHistory(userProfile.id, filter);
  }, [filter, userProfile, fetchHistory]);

  // --- 4. KUNCI LOKASI ---
  const handleLockLocation = async () => {
    if (!location) return alert("Menunggu sinyal GPS...");
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ office_lat: location.lat, office_long: location.lng })
      .eq("id", userProfile.id);

    if (error) alert(error.message);
    else {
      alert("Lokasi kantor terkunci!");
      fetchInitialData();
    }
    setLoading(false);
  };

  // --- 5. LOGIKA ABSEN (INSTANT UPDATE) ---
  const handleAttendance = async () => {
    if (!location || !userProfile?.office_lat) return;
    setLoading(true);

    const distance = getDistance(location.lat, location.lng, userProfile.office_lat, userProfile.office_long);
    const isWithinRadius = distance <= 100;

    if (!todayAttendance) {
      // PROSES MASUK
      const { data, error } = await supabase.from("attendances").insert({
        user_id: userProfile.id,
        lat: location.lat,
        lng: location.lng,
        status: isWithinRadius ? "Hadir" : "Luar Area",
        check_in: new Date().toISOString()
      }).select().single();

      if (!error) {
        setTodayAttendance(data); // Langsung update UI
        alert(isWithinRadius ? "Berhasil Absen Masuk!" : `Berhasil Masuk (Luar Area: ${Math.round(distance)}m)`);
      } else {
        alert(error.message);
      }
    } else {
      // PROSES PULANG
      const { data, error } = await supabase.from("attendances")
        .update({ check_out: new Date().toISOString() })
        .eq('id', todayAttendance.id)
        .select().single();
      
      if (!error) {
        setTodayAttendance(data); // Langsung update UI
        alert("Berhasil Absen Pulang!");
      } else {
        alert(error.message);
      }
    }

    setLoading(false);
    fetchHistory(userProfile.id, filter); // Refresh riwayat bawah
  };

  if (isCheckingAuth) return <div className="p-10 text-center text-gray-500 font-bold">Sinkronisasi GPS...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pb-24">
      {/* Header */}
      <div className="w-full max-w-md bg-white p-5 flex justify-between items-center shadow-sm sticky top-0 z-20">
        <h1 className="text-blue-600 font-black text-xl italic">GeoAttend.</h1>
        <button onClick={() => supabase.auth.signOut().then(() => router.push("/"))} className="text-[10px] font-black bg-red-50 text-red-500 px-3 py-1 rounded-full">LOGOUT</button>
      </div>

      <div className="w-full max-w-md p-6">
        {/* User Card */}
        <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl mb-8">
          <p className="opacity-50 text-[10px] font-bold uppercase mb-1 tracking-widest">Karyawan</p>
          <h2 className="text-2xl font-black">{userProfile?.full_name}</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
            <div>
              <p className="text-[9px] opacity-40 uppercase font-bold mb-1">Masuk</p>
              <p className="text-xs font-mono font-bold text-blue-400">{todayAttendance?.check_in ? new Date(todayAttendance.check_in).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "--:--"}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] opacity-40 uppercase font-bold mb-1">Pulang</p>
              <p className="text-xs font-mono font-bold text-orange-400">{todayAttendance?.check_out ? new Date(todayAttendance.check_out).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "--:--"}</p>
            </div>
          </div>
        </div>

        {/* Action Area */}
        {!userProfile?.office_lat ? (
          <div className="bg-white p-8 rounded-[2rem] shadow-lg border border-blue-50 text-center">
             <h3 className="font-black text-slate-800 text-lg">Setup Lokasi Kantor</h3>
             <p className="text-slate-500 text-xs mt-2 mb-6">Silakan berdiri di titik kantor Anda sekarang dan kunci lokasi.</p>
             <button onClick={handleLockLocation} disabled={loading || !location} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-100">
                {loading ? "MENGUNCI..." : "KUNCI LOKASI SAYA"}
             </button>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-[2rem] shadow-lg border border-gray-100 text-center">
            <div className="mb-6 flex items-center justify-center gap-3 bg-slate-50 p-3 rounded-2xl border border-dashed">
               <div className={`w-2.5 h-2.5 rounded-full ${location ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
               <span className="text-[11px] font-mono font-bold text-slate-600">
                  {location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "Mencari GPS..."}
               </span>
            </div>

            {(!todayAttendance || !todayAttendance.check_out) ? (
              <button 
                onClick={handleAttendance}
                disabled={loading || !location}
                className={`w-full py-5 rounded-3xl font-black text-white shadow-xl transition-all active:scale-95
                  ${!todayAttendance ? 'bg-blue-600 shadow-blue-200' : 'bg-orange-500 shadow-orange-200'}`}
              >
                {loading ? "MEMPROSES..." : !todayAttendance ? "ABSEN MASUK" : "ABSEN PULANG"}
              </button>
            ) : (
              <div className="p-5 bg-green-50 text-green-700 rounded-3xl text-xs font-bold border border-green-100">
                ✅ Presensi hari ini telah selesai.
              </div>
            )}
          </div>
        )}

        {/* Riwayat */}
        <div className="mt-10">
            <div className="flex justify-between items-end mb-6">
                <h3 className="font-black text-slate-800 text-lg">Riwayat Aktivitas</h3>
                <div className="flex bg-slate-200 p-1 rounded-xl">
                    {(['daily', 'weekly', 'monthly'] as const).map((type) => (
                        <button key={type} onClick={() => setFilter(type)} className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all ${filter === type ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}>
                            {type === 'daily' ? 'HARI' : type === 'weekly' ? 'MINGGU' : 'BULAN'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                {history.map((item) => (
                    <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-black text-slate-800">{new Date(item.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                                <div className="flex gap-4 mt-3 text-[10px] font-bold text-slate-500">
                                    <span>In: {item.check_in ? new Date(item.check_in).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--'}</span>
                                    <span>Out: {item.check_out ? new Date(item.check_out).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--'}</span>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${item.status === 'Hadir' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
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