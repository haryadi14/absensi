"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { getDistance } from "@/utils/distance";
import { useRouter } from "next/navigation";

// KONFIGURASI KANTOR SPESIFIK
const OFFICE_COORDS = {
  lat: -6.98622839247075,
  lng: 107.594697187528,
  radius: 500 
};

export default function AttendancePage() {
  // --- STATE MANAGEMENT ---
  const [userProfile, setUserProfile] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [filter, setFilter] = useState<"daily" | "weekly" | "monthly">("daily");

  // --- STATE KAMERA ---
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const supabase = createClient();
  const router = useRouter();

  // --- 1. AMBIL DATA AWAL ---
  const fetchInitialData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    // Ambil Profil
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setUserProfile(profile);

    // Ambil Absen Hari Ini (Local Timezone Fix)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    const { data: attendance } = await supabase.from("attendances").select("*")
      .eq("user_id", user.id).gte("created_at", startOfDay).lte("created_at", endOfDay).maybeSingle();

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

    const { data, error } = await supabase.from("attendances").select("*")
      .eq("user_id", userId).gte("created_at", startDate.toISOString()).order("created_at", { ascending: false });

    if (!error) setHistory(data || []);
  }, [supabase]);

  // --- 3. GPS & AUTH LIFECYCLE ---
  useEffect(() => {
    fetchInitialData();
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [fetchInitialData]);

  useEffect(() => {
    if (userProfile?.id) fetchHistory(userProfile.id, filter);
  }, [filter, userProfile, fetchHistory]);

  // --- 4. FUNGSI LOGOUT ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // --- 5. FUNGSI KAMERA ---
  const startCamera = async () => {
    setShowCamera(true);
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user", width: 640, height: 480 }, 
            audio: false 
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        alert("Gagal mengakses kamera. Pastikan izin kamera diberikan.");
        setShowCamera(false);
      }
    }, 300);
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  // --- 6. LOGIKA ABSEN (CAPTURE + UPLOAD + DB) ---
  const handleAttendance = async () => {
    if (!location || !userProfile || !videoRef.current || !canvasRef.current) return;
    setLoading(true);

    try {
      // A. Capture Foto ke Canvas
      const context = canvasRef.current.getContext("2d");
      context?.drawImage(videoRef.current, 0, 0, 640, 480);
      
      // B. Convert Canvas ke Blob (File)
      const blob = await new Promise<Blob | null>((resolve) => canvasRef.current?.toBlob(resolve, "image/jpeg", 0.6));
      if (!blob) throw new Error("Gagal mengambil gambar");

      // C. Upload ke Supabase Storage
      const fileName = `${userProfile.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("selfies").upload(fileName, blob);
      if (uploadError) throw uploadError;

      // D. Dapatkan Public URL
      const { data: { publicUrl } } = supabase.storage.from("selfies").getPublicUrl(fileName);

      // E. Hitung Jarak & Simpan ke DB
      const distance = getDistance(location.lat, location.lng, OFFICE_COORDS.lat, OFFICE_COORDS.lng);
      const isWithinRadius = distance <= OFFICE_COORDS.radius;

      const { data: newAtt, error: dbError } = await supabase.from("attendances").insert({
        user_id: userProfile.id,
        lat: location.lat,
        lng: location.lng,
        status: isWithinRadius ? "Hadir" : "Luar Kantor",
        check_in: new Date().toISOString(),
        selfie_url: publicUrl
      }).select().single();

      if (dbError) throw dbError;

      setTodayAttendance(newAtt);
      alert(isWithinRadius ? "Absen Berhasil!" : `Absen Luar Kantor (${Math.round(distance)}m)`);
      stopCamera();
      fetchHistory(userProfile.id, filter);

    } catch (err: any) {
      alert("Gagal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIKA PULANG (UPDATE TANPA SELFIE) ---
  const handleCheckOut = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("attendances")
      .update({ check_out: new Date().toISOString() })
      .eq('id', todayAttendance.id).select().single();
    
    if (!error) {
      setTodayAttendance(data);
      alert("Berhasil Pulang!");
      fetchHistory(userProfile.id, filter);
    }
    setLoading(false);
  };

  if (isCheckingAuth) return <div className="min-h-screen flex items-center justify-center font-black text-slate-300 animate-pulse uppercase tracking-tighter">Sincronizing GPS & Camera...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pb-24">
      {/* Navbar */}
      <div className="w-full max-w-md bg-white p-5 flex justify-between items-center shadow-sm sticky top-0 z-50">
        <h1 className="text-blue-600 font-black text-xl italic tracking-tighter">GeoAbsen.</h1>
        <button onClick={handleLogout} className="text-[10px] font-black bg-red-50 text-red-500 px-4 py-1.5 rounded-full border border-red-100 active:scale-90 transition-all">LOGOUT</button>
      </div>

      <div className="w-full max-w-md p-6">
        {/* Profile Card */}
        <div className="bg-slate-900 p-7 rounded-[2.5rem] text-white shadow-2xl mb-8 border-b-4 border-blue-600">
          <p className="opacity-40 text-[9px] font-bold uppercase tracking-[0.2em] mb-1">Employee Profile</p>
          <h2 className="text-2xl font-black tracking-tight mb-6">{userProfile?.full_name}</h2>
          
          <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
            <div>
              <p className="text-[9px] opacity-40 uppercase font-bold mb-1">Check-In</p>
              <p className="text-sm font-mono font-bold text-blue-400">{todayAttendance?.check_in ? new Date(todayAttendance.check_in).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "--:--"}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] opacity-40 uppercase font-bold mb-1">Check-Out</p>
              <p className="text-sm font-mono font-bold text-orange-400">{todayAttendance?.check_out ? new Date(todayAttendance.check_out).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "--:--"}</p>
            </div>
          </div>
        </div>

        {/* UI KAMERA / STATUS AREA */}
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 text-center mb-10 overflow-hidden">
            {showCamera ? (
                // MODE: KAMERA SEDANG AKTIF
                <div className="animate-in fade-in zoom-in duration-300">
                    <div className="relative w-full aspect-square bg-slate-900 rounded-3xl overflow-hidden mb-6 border-4 border-slate-100">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" style={{transform: 'rotateY(180deg)'}} />
                        <canvas ref={canvasRef} width="640" height="480" className="hidden" />
                        <div className="absolute inset-0 border-[20px] border-black/20 pointer-events-none flex items-center justify-center">
                            <div className="w-48 h-64 border-2 border-dashed border-white/50 rounded-full"></div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={stopCamera} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase">Batal</button>
                        <button onClick={handleAttendance} disabled={loading} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-blue-200">
                           {loading ? "MENGUPLOAD..." : "AMBIL FOTO & ABSEN"}
                        </button>
                    </div>
                </div>
            ) : todayAttendance ? (
                // MODE: SUDAH ABSEN MASUK
                <div>
                   <div className="w-24 h-24 mx-auto mb-6 rounded-3xl overflow-hidden shadow-lg border-4 border-white rotate-3">
                      <img src={todayAttendance.selfie_url} alt="Selfie" className="w-full h-full object-cover" />
                   </div>
                   <h3 className="font-black text-slate-800 text-lg mb-2">Presensi Masuk Berhasil</h3>
                   <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-8 italic">Status: {todayAttendance.status}</p>
                   
                   {!todayAttendance.check_out ? (
                       <button onClick={handleCheckOut} disabled={loading} className="w-full py-5 bg-orange-500 text-white rounded-[1.5rem] font-black shadow-xl shadow-orange-100 active:scale-95 transition-all">
                           {loading ? "PROSES..." : "ABSEN PULANG SEKARANG"}
                       </button>
                   ) : (
                       <div className="p-5 bg-green-50 text-green-700 rounded-3xl text-[10px] font-black border border-green-100 flex items-center justify-center gap-2 uppercase">
                         ✅ Tugas Anda selesai hari ini
                       </div>
                   )}
                </div>
            ) : (
                // MODE: BELUM ABSEN (TOMBOL MULAI)
                <div>
                    <div className="mb-8 flex items-center justify-center gap-3 bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200">
                        <div className={`w-3 h-3 rounded-full ${location ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className="text-[11px] font-mono font-black text-slate-700 tracking-tight">
                            {location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : "Mencari Sinyal GPS..."}
                        </span>
                    </div>
                    <button 
                        onClick={startCamera} 
                        disabled={!location}
                        className="w-full py-6 bg-blue-600 text-white rounded-[1.5rem] font-black text-lg shadow-2xl shadow-blue-200 active:scale-95 transition-all disabled:bg-slate-100 disabled:text-slate-300"
                    >
                        MULAI ABSEN MASUK
                    </button>
                    <p className="text-[9px] text-slate-400 font-bold mt-4 uppercase tracking-widest">Radius Kantor: 500m</p>
                </div>
            )}
        </div>

        {/* Riwayat */}
        <div className="w-full">
            <div className="flex justify-between items-center mb-6 px-2">
                <h3 className="font-black text-slate-800 text-lg tracking-tight">Riwayat</h3>
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
                    <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0">
                            {item.selfie_url && <img src={item.selfie_url} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <p className="text-xs font-black text-slate-800">
                                    {new Date(item.created_at).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </p>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                                    item.status === 'Hadir' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                }`}>
                                    {item.status}
                                </span>
                            </div>
                            <div className="flex gap-4 mt-2 text-[10px] font-bold text-slate-400">
                                <span>In: {item.check_in ? new Date(item.check_in).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--'}</span>
                                <span>Out: {item.check_out ? new Date(item.check_out).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--'}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}