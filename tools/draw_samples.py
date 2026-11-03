import random, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter
F='/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc'
W,H=120,164; S=3  # supersample
def font(sz): return ImageFont.truetype(F, sz*S, index=0)
NUM='一二三四五六七八九'
RED=(200,38,38); BLUE=(28,72,170); GREEN=(22,128,74); BLACK=(25,25,25); FACE=(250,247,236)
def face():
    im=Image.new('RGBA',(W*S,H*S),(0,0,0,0)); d=ImageDraw.Draw(im)
    d.rounded_rectangle([0,0,W*S-1,H*S-1],radius=14*S,fill=(40,120,85))       # back (green)
    d.rounded_rectangle([0,0,W*S-1,(H-14)*S],radius=14*S,fill=FACE,outline=(205,198,180),width=2*S)
    return im,d
def ctext(d,t,cx,cy,sz,col):
    f=font(sz); b=d.textbbox((0,0),t,font=f); d.text((cx*S-(b[0]+b[2])/2,cy*S-(b[1]+b[3])/2),t,font=f,fill=col)
def circle(d,cx,cy,r,col):
    # 外輪 → 白 → 色の輪 → 白 → 芯(赤み)の同心円。実物の筒子の「花」の雰囲気
    def e(rr,c): d.ellipse([(cx-rr)*S,(cy-rr)*S,(cx+rr)*S,(cy+rr)*S],fill=c)
    e(r,col); e(r*0.80,FACE); e(r*0.64,col); e(r*0.36,FACE); e(r*0.22,col)
    for k in range(8):
        a=k*math.pi/4; x=cx+math.cos(a)*r*0.5; y=cy+math.sin(a)*r*0.5
        d.ellipse([(x-r*0.07)*S,(y-r*0.07)*S,(x+r*0.07)*S,(y+r*0.07)*S],fill=FACE)
def pin1(d):
    cx,cy,r=60,75,40
    def e(rr,c): d.ellipse([(cx-rr)*S,(cy-rr)*S,(cx+rr)*S,(cy+rr)*S],fill=c)
    e(r,GREEN); e(r*0.9,FACE)
    for k in range(16):
        a=k*math.pi/8; x=cx+math.cos(a)*r*0.75; y=cy+math.sin(a)*r*0.75
        d.ellipse([(x-4)*S,(y-4)*S,(x+4)*S,(y+4)*S],fill=BLUE if k%2 else GREEN)
    e(r*0.58,RED); e(r*0.44,FACE); e(r*0.32,BLUE); e(r*0.18,FACE); e(r*0.1,RED)
def pin(n):
    im,d=face()
    if n==1: pin1(d); return im
    B,R_,G=BLUE,RED,GREEN
    L={2:[(60,45,19,G),(60,105,19,B)],
       3:[(31,32,16,B),(60,75,16,R_),(89,118,16,G)],
       4:[(36,45,18,B),(84,45,18,G),(36,105,18,G),(84,105,18,B)],
       5:[(34,38,15,B),(86,38,15,G),(60,75,15,R_),(34,112,15,G),(86,112,15,B)],
       6:[(37,34,14,G),(83,34,14,G),(37,82,14,R_),(83,82,14,R_),(37,118,14,R_),(83,118,14,R_)],
       7:[(28,24,11,G),(60,36,11,G),(92,48,11,G),(37,84,12,R_),(83,84,12,R_),(37,120,12,R_),(83,120,12,R_)],
       8:[(37,y,11,B) for y in (24,57,90,123)]+[(83,y,11,B) for y in (24,57,90,123)],
       9:[(x,32,12,B) for x in (28,60,92)]+[(x,75,12,R_) for x in (28,60,92)]+[(x,118,12,G) for x in (28,60,92)]}[n]
    for x,y,r,c in L: circle(d,x,y,r,c)
    return im
def stick(base,cx,cy,col,h=36,w=13,ang=0):
    # 竹: 濃い縁取り・中央と両端の節・中心の筋
    T=Image.new('RGBA',((w+8)*S,(h+8)*S),(0,0,0,0)); t=ImageDraw.Draw(T)
    ox,oy=4*S,4*S; dark=tuple(int(c*0.62) for c in col)
    t.rounded_rectangle([ox,oy,ox+w*S,oy+h*S],radius=int(w*0.45*S),fill=dark)
    t.rounded_rectangle([ox+2*S,oy+2*S,ox+(w-2)*S,oy+(h-2)*S],radius=int(w*0.4*S),fill=col)
    for yy in (0.5,):
        y=oy+h*S*yy; t.rectangle([ox,y-1.6*S,ox+w*S,y+1.6*S],fill=dark)
    for yy in (0.2,0.8):
        y=oy+h*S*yy; t.line([(ox+3*S,y),(ox+(w-3)*S,y)],fill=FACE,width=int(1.2*S))
    t.line([(ox+w*S/2,oy+4*S),(ox+w*S/2,oy+h*S*0.45)],fill=FACE,width=int(1.4*S))
    t.line([(ox+w*S/2,oy+h*S*0.55),(ox+w*S/2,oy+(h-4)*S)],fill=FACE,width=int(1.4*S))
    if ang: T=T.rotate(ang,resample=Image.BICUBIC,expand=True)
    base.alpha_composite(T,(int(cx*S-T.width/2),int(cy*S-T.height/2)))
def sou1(im,d):
    # 1索: 鳥(孔雀)を簡略化
    G2=(30,130,80)
    d.ellipse([42*S,30*S,80*S,72*S],fill=G2)                     # 胴
    d.ellipse([62*S,22*S,82*S,42*S],fill=G2)                     # 頭
    d.polygon([(82*S,30*S),(94*S,33*S),(82*S,37*S)],fill=(210,150,40))   # くちばし
    d.ellipse([71*S,28*S,75*S,32*S],fill=RED)                    # 目
    for k,ang in enumerate(range(200,341,28)):                  # 尾羽
        a=math.radians(ang); x=60+math.cos(a)*-34; y=95+math.sin(a)*-28
        d.line([(58*S,68*S),(x*S,y*S)],fill=BLUE if k%2 else G2,width=5*S)
        d.ellipse([(x-6)*S,(y-6)*S,(x+6)*S,(y+6)*S],fill=RED if k%2==0 else BLUE)
    d.line([(55*S,72*S),(50*S,128*S)],fill=(150,90,40),width=3*S); d.line([(64*S,72*S),(70*S,128*S)],fill=(150,90,40),width=3*S)
def sou(n):
    im,d=face(); G_,R_=GREEN,RED
    if n==1: sou1(im,d); return im
    if n==8:
        # 上が「M」、下が「W」
        for (x,y,a) in [(24,44,0),(46,44,-22),(74,44,22),(96,44,0),(24,106,0),(46,106,22),(74,106,-22),(96,106,0)]:
            stick(im,x,y,G_,h=40,w=12,ang=a)
        return im
    L={2:[(60,44,G_),(60,106,G_)],3:[(60,42,G_),(38,108,G_),(82,108,G_)],
       4:[(38,44,G_),(82,44,G_),(38,106,G_),(82,106,G_)],
       5:[(32,44,G_),(88,44,G_),(60,75,R_),(32,106,G_),(88,106,G_)],
       6:[(x,y,G_) for y in (44,106) for x in (28,60,92)],
       7:[(60,26,R_)]+[(x,y,G_) for y in (76,122) for x in (28,60,92)],
       9:[(x,y,R_ if x==60 else G_) for y in (30,75,120) for x in (28,60,92)]}[n]
    h=40 if n<=6 else 36
    if n==7 or n==9: h=34
    for x,y,c in L: stick(im,x,y,c,h=h,w=13)
    return im
def man(n):
    im,d=face(); ctext(d,NUM[n-1],60,42,44,BLACK); ctext(d,'萬',60,105,52,RED); return im
def honor(k):
    im,d=face()
    if k==5: d.rounded_rectangle([26*S,30*S,94*S,122*S],radius=4*S,outline=(70,110,190),width=3*S)
    else: ctext(d,'東南西北 發中'[k-1],60,75,70,{6:GREEN,7:RED}.get(k,BLACK))
    return im
def tile(code):
    n,s=int(code[0]),code[1]
    im={'m':man,'p':pin,'s':sou,'z':honor}[s](n)
    return im.resize((W,H),Image.LANCZOS)
def parse(h):
    out=[];buf=[]
    for ch in h:
        if ch.isdigit(): buf.append(ch)
        else: out+= [b+ch for b in buf]; buf=[]
    return out
def hand_image(hand, win, path, seed=0):
    random.seed(seed)
    tiles=parse(hand); gap=6; sep=28
    w=len(tiles)*(W+gap)+sep+(W)+120; h=H+160
    bg=Image.new('RGB',(w,h),(34,96,70)); 
    # felt noise + vignette
    px=bg.load()
    for y in range(h):
        for x in range(0,w):
            v=random.randint(-6,6); r,g,b=px[x,y]; px[x,y]=(r+v,g+v,b+v)
    x=60;y=80
    for t in tiles:
        im=tile(t); sh=Image.new('RGBA',(W,H),(0,0,0,90)).filter(ImageFilter.GaussianBlur(4))
        bg.paste((10,30,20),(x+4,y+6,x+W+4,y+H+6),mask=im.split()[3].point(lambda a:int(a*0.45)))
        bg.paste(im,(x,y),im); x+=W+gap
    x+=sep; im=tile(win); bg.paste((10,30,20),(x+4,y+6,x+W+4,y+H+6),mask=im.split()[3].point(lambda a:int(a*0.45))); bg.paste(im,(x,y),im)
    bg=bg.filter(ImageFilter.GaussianBlur(0.6))
    bg.save(path,quality=90)
