export function Logo({ size = 36, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <img src="/favicon.svg" width={size} height={size} alt="KeyFit" className="rounded-[.8rem] shadow-glow" />
      {withText && (
        <div className="leading-tight">
          <div className="text-lg font-black tracking-tight">کی‌فیت</div>
          <div className="-mt-1 text-[10px] font-semibold tracking-widest text-ink-400">KEYFIT</div>
        </div>
      )}
    </div>
  )
}
