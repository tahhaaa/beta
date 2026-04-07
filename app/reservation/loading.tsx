export default function ReservationLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-cyan-300/20 border-t-cyan-300" />
          <span className="font-heading text-3xl font-semibold text-cyan-200">β</span>
        </div>
        <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">βeta Physique</p>
      </div>
    </div>
  );
}
