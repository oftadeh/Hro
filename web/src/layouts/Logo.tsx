export function Logo({ size = 32, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/favicon.svg" width={size} height={size} alt="KeyFit" className="rounded-[10px] ring-1 ring-black/5 dark:ring-white/10" />
      {withText && (
        <div className="leading-none">
          <div className="text-[17px] font-semibold tracking-tight">کی‌فیت</div>
          <div className="mt-1 text-[9px] font-medium tracking-[.3em] text-ink-400">KEYFIT</div>
        </div>
      )}
    </div>
  )
}
