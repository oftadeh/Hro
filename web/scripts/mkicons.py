# ساخت آیکون‌های PNG اپ از روی نشان کی‌فیت (بدون وابستگی): python3 scripts/mkicons.py public
import zlib,struct,math,sys
C=[(155,123,255),(196,140,242),(246,169,211)];K=(23,20,28)
SEG=[(22,25,22,51,2.5),(22,40.5,16,40.5,2.5),(22,46.5,17.5,46.5,2.5),(27,37,44.5,19.5,2.75),(31.5,33.5,45,50,2.75)]
def grad(t):
 t=max(0,min(1,t))
 a,b,u=(C[0],C[1],t/.55) if t<.55 else (C[1],C[2],(t-.55)/.45)
 return [a[i]+(b[i]-a[i])*u for i in range(3)]
def seg(px,py,x1,y1,x2,y2):
 dx,dy=x2-x1,y2-y1;L=dx*dx+dy*dy;t=max(0,min(1,((px-x1)*dx+(py-y1)*dy)/L))
 return math.hypot(px-x1-t*dx,py-y1-t*dy)
def mark(x,y):
 if abs(math.hypot(x-22,y-18.5)-6.5)<=2.5 or math.hypot(x-47.5,y-16.5)<=4.2:return 1
 return any(seg(x,y,*s[:4])<=s[4] for s in SEG)
def inrr(x,y,r):
 cx=min(max(x,r),64-r);cy=min(max(y,r),64-r);return math.hypot(x-cx,y-cy)<=r
def render(N,mask):
 ss=3;rows=[]
 for j in range(N):
  row=bytearray([0])
  for i in range(N):
   acc=[0,0,0,0]
   for sj in range(ss):
    for si in range(ss):
     x=(i+(si+.5)/ss)*64/N;y=(j+(sj+.5)/ss)*64/N
     if not mask and not inrr(x,y,18):continue
     mx,my=((x-6.4)/.8,(y-6.4)/.8) if mask else (x,y)
     c=K if mark(mx,my) else grad((x+y)/128)
     acc[0]+=c[0];acc[1]+=c[1];acc[2]+=c[2];acc[3]+=255
   n=ss*ss;a=acc[3]/n
   row+=bytes([int(acc[0]/(acc[3]/255) if acc[3] else 0),int(acc[1]/(acc[3]/255) if acc[3] else 0),int(acc[2]/(acc[3]/255) if acc[3] else 0),int(a)])
  rows.append(bytes(row))
 raw=b''.join(rows)
 ch=lambda t,d:struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d))
 return b'\x89PNG\r\n\x1a\n'+ch(b'IHDR',struct.pack('>IIBBBBB',N,N,8,6,0,0,0))+ch(b'IDAT',zlib.compress(raw,9))+ch(b'IEND',b'')
d=sys.argv[1]
for name,N,m in [('icon-192.png',192,0),('icon-512.png',512,0),('icon-maskable-512.png',512,1),('apple-touch-icon.png',180,1)]:
 open(d+'/'+name,'wb').write(render(N,m));print(name)
