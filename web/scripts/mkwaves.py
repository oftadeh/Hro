# ساخت پس‌زمینه‌ی خطوط موجی ظریف (تیره و روشن): python3 scripts/mkwaves.py public
import math,sys
W,H=1600,1000
def paths():
 out=[]
 for k in range(14):
  y0=60+k*68;amp=26+12*math.sin(k*1.3);ph=k*.55
  pts=[(i,y0+amp*math.sin(i/W*2*math.pi*1.15+ph)+10*math.sin(i/W*2*math.pi*3.1+ph*1.7)) for i in range(0,W+81,80)]
  out.append(f"M{pts[0][0]-40} {pts[0][1]:.1f}"+''.join(f" L{x} {y:.1f}" for x,y in pts))
 return out
for name,col in [('waves-dark.svg','rgba(255,255,255,.065)'),('waves-light.svg','rgba(91,55,245,.07)')]:
 g=''.join(f"<path d='{d}'/>" for d in paths())
 open(sys.argv[1]+'/'+name,'w').write(f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {W} {H}' preserveAspectRatio='xMidYMid slice'><g fill='none' stroke='{col}' stroke-width='1.2' stroke-linejoin='round'>{g}</g></svg>")
 print(name)
