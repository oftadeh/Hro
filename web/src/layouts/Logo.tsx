export function Logo({ size = 32, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/favicon.svg" width={size} height={size} alt="KeyFit" className="rounded-[11px]" />
      {withText && <div className="font-display text-[1.6rem] leading-none">کی‌فیت</div>}
    </div>
  )
}
