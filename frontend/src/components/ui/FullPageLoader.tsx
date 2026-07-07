/**
 * Full-page loading spinner used during auth hydration and lazy route loading.
 */
const FullPageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#050508]">
    <div className="flex flex-col items-center gap-4">
      {/* Animated logo mark */}
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 animate-pulse-glow" />
        <div className="absolute inset-[2px] rounded-[14px] bg-[#050508] flex items-center justify-center">
          <span className="text-2xl font-black gradient-text">C</span>
        </div>
      </div>
      {/* Spinner ring */}
      <div className="w-8 h-8 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
      <p className="text-slate-500 text-sm animate-pulse">Loading CP Arena…</p>
    </div>
  </div>
);

export default FullPageLoader;
