# ساخت آیکون‌های PNG اپ از روی نشان کی‌فیت (K با سوراخ کلید، کرم روی تیره؛ بدون وابستگی): python3 scripts/mkicons.py public
import zlib,struct,math,sys
BG=(22,19,27);FG=(241,236,227)
POLYS=[[(15,11),(26.5,11),(26.5,53),(15,53)],[(26.5,27.5),(41.5,11),(53,11),(31.5,35)],[(30,30.5),(52.5,53),(41.2,53),(26.5,38.2)]]
SLOT=[(25.9,34.5),(29.3,34.5),(30.4,45),(24.8,45)]
def inpoly(x,y,P):
 c=False;n=len(P)
 for i in range(n):
  x1,y1=P[i];x2,y2=P[(i+1)%n]
  if (y1>y)!=(y2>y) and x<(x2-x1)*(y-y1)/(y2-y1)+x1:c=not c
 return c
def mark(x,y):
 if math.hypot(x-27.6,y-31.5)<=4.6 or inpoly(x,y,SLOT):return 0
 return any(inpoly(x,y,P) for P in POLYS)
def inrr(x,y,r):
 cx=min(max(x,r),64-r);cy=min(max(y,r),64-r);return math.hypot(x-cx,y-cy)<=r
def render(N,full):
 ss=3;rows=[]
 for j in range(N):
  row=bytearray([0])
  for i in range(N):
   acc=[0,0,0,0]
   for sj in range(ss):
    for si in range(ss):
     x=(i+(si+.5)/ss)*64/N;y=(j+(sj+.5)/ss)*64/N
     if not full and not inrr(x,y,16):continue
     mx,my=((x-6.4)/.8,(y-6.4)/.8) if full else (x,y)
     c=FG if mark(mx,my) else BG
     acc[0]+=c[0];acc[1]+=c[1];acc[2]+=c[2];acc[3]+=255
   n=ss*ss;a=acc[3]/n;k=acc[3]/255 or 1
   row+=bytes([int(acc[0]/k),int(acc[1]/k),int(acc[2]/k),int(a)])
  rows.append(bytes(row))
 raw=b''.join(rows)
 ch=lambda t,d:struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d))
 return b'\x89PNG\r\n\x1a\n'+ch(b'IHDR',struct.pack('>IIBBBBB',N,N,8,6,0,0,0))+ch(b'IDAT',zlib.compress(raw,9))+ch(b'IEND',b'')
d=sys.argv[1]
for name,N,m in [('icon-192.png',192,0),('icon-512.png',512,0),('icon-maskable-512.png',512,1),('apple-touch-icon.png',180,1)]:
 open(d+'/'+name,'wb').write(render(N,m));print(name)
