// templates.js - Pre-built animated examples
(function () {
  // ── Primitives ──────────────────────────────────────────────────────────────
  function mk(W, H) { return Array.from({ length: H }, () => new Uint8Array(W)); }
  function px(f, x, y, W, H) { if (x >= 0 && x < W && y >= 0 && y < H) f[y][x] = 1; }
  function ln(f, x0, y0, x1, y1, W, H) {
    let dx = Math.abs(x1-x0), dy = Math.abs(y1-y0), sx = x0<x1?1:-1, sy = y0<y1?1:-1, er = dx-dy;
    for(;;){px(f,x0,y0,W,H);if(x0===x1&&y0===y1)break;let e=2*er;if(e>-dy){er-=dy;x0+=sx;}if(e<dx){er+=dx;y0+=sy;}}
  }
  function circ(f, cx, cy, r, W, H) {
    let x=r,y=0,e=0;
    while(x>=y){[[x,y],[y,x],[-y,x],[-x,y],[-x,-y],[-y,-x],[y,-x],[x,-y]].forEach(([a,b])=>px(f,cx+a,cy+b,W,H));y++;e+=2*y+1;if(2*(e-x)+1>0){x--;e+=1-2*x;}}
  }
  function fillCirc(f, cx, cy, r, W, H) {
    for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(dx*dx+dy*dy<=r*r)px(f,cx+dx,cy+dy,W,H);
  }
  function fillRect(f, x, y, w, h, W, H) {
    for(let iy=y;iy<y+h;iy++)for(let ix=x;ix<x+w;ix++)px(f,ix,iy,W,H);
  }
  function outRect(f, x, y, w, h, W, H) {
    for(let i=x;i<x+w;i++){px(f,i,y,W,H);px(f,i,y+h-1,W,H);}
    for(let i=y;i<y+h;i++){px(f,x,i,W,H);px(f,x+w-1,i,W,H);}
  }
  function bmp(f, str, ox, oy, W, H) {
    str.trim().split('\n').forEach((row,y)=>[...row].forEach((c,x)=>{if(c==='#')px(f,ox+x,oy+y,W,H);}));
  }
  function arc(f, cx, cy, r, a0, a1, W, H) {
    for(let a=a0;a<=a1;a+=1){const rd=a*Math.PI/180;px(f,Math.round(cx+r*Math.cos(rd)),Math.round(cy+r*Math.sin(rd)),W,H);}
  }

  // ── Generators ──────────────────────────────────────────────────────────────

  // 1. Heart Beat
  function heartBeat(W, H) {
    const cx=Math.floor(W/2), cy=Math.floor(H/2);
    const sm=`.##.##.\n#######\n#######\n.#####.\n..###..\n...#...`;
    const lg=`.###.###.\n#########\n#########\n.#######.\n..#####..\n...###...\n....#....`;
    const f1=mk(W,H); bmp(f1,sm,cx-3,cy-3,W,H);
    const f2=mk(W,H); bmp(f2,lg,cx-4,cy-3,W,H);
    const f3=mk(W,H); bmp(f3,sm,cx-3,cy-3,W,H);
    const f4=mk(W,H);
    return [f1,f2,f1,f4];
  }

  // 2. Loading Spinner
  function spinner(W, H) {
    const cx=Math.floor(W/2), cy=Math.floor(H/2), r=20;
    return Array.from({length:8},(_,i)=>{
      const f=mk(W,H);
      circ(f,cx,cy,r,W,H);
      const a=(i/8)*Math.PI*2-Math.PI/2;
      const x1=Math.round(cx+r*Math.cos(a)), y1=Math.round(cy+r*Math.sin(a));
      const x2=Math.round(cx+(r-6)*Math.cos(a)), y2=Math.round(cy+(r-6)*Math.sin(a));
      ln(f,cx,cy,x1,y1,W,H);
      // Three dots moving along outer ring
      for(let d=0;d<3;d++){const da=(i+d)/8*Math.PI*2-Math.PI/2;px(f,Math.round(cx+(r+2)*Math.cos(da)),Math.round(cy+(r+2)*Math.sin(da)),W,H);}
      return f;
    });
  }

  // 3. WiFi Connecting
  function wifi(W, H) {
    const cx=Math.floor(W/2), cy=Math.floor(H*0.65);
    return [1,2,3,4].map(n=>{
      const f=mk(W,H);
      fillCirc(f,cx,cy,3,W,H);
      if(n>=2) arc(f,cx,cy,10,210,330,W,H);
      if(n>=3) arc(f,cx,cy,18,210,330,W,H);
      if(n>=4) arc(f,cx,cy,26,210,330,W,H);
      return f;
    });
  }

  // 4. Bouncing Ball
  function bounceBall(W, H) {
    const r=4, frames=[];
    let x=20,y=20,vx=7,vy=5;
    for(let i=0;i<10;i++){
      const f=mk(W,H);
      fillCirc(f,x,y,r,W,H);
      // floor & wall lines
      ln(f,0,H-2,W-1,H-2,W,H);
      ln(f,0,0,0,H-1,W,H); ln(f,W-1,0,W-1,H-1,W,H);
      frames.push(f);
      x+=vx; y+=vy;
      if(x+r>=W-1||x-r<=0)vx=-vx;
      if(y+r>=H-2||y-r<=0)vy=-vy;
    }
    return frames;
  }

  // 5. Pac-Man
  function pacman(W, H) {
    const cy=Math.floor(H/2), startX=20;
    // Mouth angles: closed, half, open, half
    const mouths=[2,25,45,25];
    const dots=[80,90,100,110];
    return mouths.map((m,i)=>{
      const f=mk(W,H);
      const cx=startX+i*15;
      // Body
      circ(f,cx,cy,12,W,H);
      fillCirc(f,cx,cy,11,W,H);
      // Mouth cutout (clear pixels)
      if(m>0){
        for(let a=-m;a<=m;a+=1){const rd=a*Math.PI/180;for(let rr=0;rr<=12;rr++)f[Math.round(cy+rr*Math.sin(rd))][Math.round(cx+rr*Math.cos(rd))]=0;}
      }
      // Remaining dots
      dots.slice(i).forEach(dx=>fillCirc(f,dx,cy,2,W,H));
      // Eye
      px(f,cx-2,cy-5,W,H); f[cy-5][cx-2]=0;
      return f;
    });
  }

  // 6. Smiley Blink
  function smiley(W, H) {
    const cx=Math.floor(W/2), cy=Math.floor(H/2);
    function base(eyeOpen){
      const f=mk(W,H);
      circ(f,cx,cy,22,W,H);
      // Eyes
      if(eyeOpen){fillCirc(f,cx-8,cy-6,3,W,H);fillCirc(f,cx+8,cy-6,3,W,H);}
      else{ln(f,cx-11,cy-6,cx-5,cy-6,W,H);ln(f,cx+5,cy-6,cx+11,cy-6,W,H);}
      // Smile
      arc(f,cx,cy+4,12,30,150,W,H);
      return f;
    }
    return [base(true),base(true),base(false),base(true)];
  }

  // 7. Battery Charging
  function battery(W, H) {
    const bx=20, by=20, bw=80, bh=24, tip=6;
    return [0,1,2,3,4].map(level=>{
      const f=mk(W,H);
      outRect(f,bx,by,bw,bh,W,H);
      fillRect(f,bx+bw,by+Math.floor(bh/3),tip,Math.ceil(bh/3),W,H);
      const fillW=Math.floor((bw-6)*(level/4));
      if(fillW>0)fillRect(f,bx+3,by+3,fillW,bh-6,W,H);
      // Lightning bolt for charging
      const lx=Math.floor(bx+bw/2), ly=by;
      bmp(f,`.#\n##\n.#`,lx-1,ly+4,W,H);
      return f;
    });
  }

  // 8. Signal Bars
  function signal(W, H) {
    const bars=4, bw=12, gap=4, bh=[8,16,24,32];
    const startX=Math.floor(W/2)-Math.floor((bars*(bw+gap))/2);
    const baseY=H-8;
    return [0,1,2,3,4].map(level=>{
      const f=mk(W,H);
      for(let b=0;b<bars;b++){
        const x=startX+b*(bw+gap), h=bh[b], y=baseY-h;
        if(b<level)fillRect(f,x,y,bw,h,W,H);
        else outRect(f,x,y,bw,h,W,H);
      }
      return f;
    });
  }

  // 9. Clock / Analog
  function clock(W, H) {
    const cx=Math.floor(W/2), cy=Math.floor(H/2), r=26;
    return Array.from({length:12},(_,i)=>{
      const f=mk(W,H);
      circ(f,cx,cy,r,W,H);
      // Hour marks
      for(let h=0;h<12;h++){const a=h/12*Math.PI*2-Math.PI/2;px(f,Math.round(cx+(r-2)*Math.cos(a)),Math.round(cy+(r-2)*Math.sin(a)),W,H);}
      // Hour hand (points to hour i)
      const ha=i/12*Math.PI*2-Math.PI/2;
      ln(f,cx,cy,Math.round(cx+(r-10)*Math.cos(ha)),Math.round(cy+(r-10)*Math.sin(ha)),W,H);
      // Minute hand (12 o'clock fixed for simplicity)
      ln(f,cx,cy,cx,cy-r+4,W,H);
      // Center dot
      fillCirc(f,cx,cy,2,W,H);
      return f;
    });
  }

  // 10. Sine Wave Scroll
  function sineWave(W, H) {
    return Array.from({length:8},(_,i)=>{
      const f=mk(W,H);
      const cy=Math.floor(H/2);
      const offset=i*8;
      for(let x=0;x<W;x++){
        const y=Math.round(cy+18*Math.sin((x+offset)*2*Math.PI/40));
        px(f,x,y,W,H);
        if(y+1<H)px(f,x,y+1,W,H);
      }
      return f;
    });
  }

  // 11. Matrix Rain
  function matrix(W, H) {
    const cols=Math.floor(W/4), drops=Array(cols).fill(0);
    return Array.from({length:8},()=>{
      const f=mk(W,H);
      drops.forEach((y,c)=>{
        px(f,c*4,y,W,H);
        if(y>0)px(f,c*4,y-1,W,H);
        if(y>1)px(f,c*4,y-2,W,H);
        drops[c]=(y+Math.floor(Math.random()*3))%H;
      });
      return f;
    });
  }

  // 12. Startup / Countdown
  function startup(W, H) {
    const frames=[];
    // 3..2..1..GO!
    const segs = {
      '3': `###\n..#\n###\n..#\n###`,
      '2': `###\n..#\n###\n#..\n###`,
      '1': `..#\n..#\n..#\n..#\n..#`,
      '!': `#\n#\n#\n.\n#`,
    };
    const chars=['3','2','1','!'];
    chars.forEach(ch=>{
      for(let rep=0;rep<2;rep++){
        const f=mk(W,H);
        bmp(f,segs[ch],Math.floor(W/2)-1,Math.floor(H/2)-2,W,H);
        frames.push(f);
      }
    });
    return frames;
  }

  // ── Text Animation Generators ──────────────────────────────────────────────
  function getCustomText() {
    const el = document.getElementById('tplTextInputBig');
    return el ? (el.value || 'OLED') : 'OLED';
  }

  function getAlignedX(tw, W, align, offsetX) {
    if (align === 'left') return offsetX;
    if (align === 'right') return W - tw + offsetX;
    return Math.max(0, Math.floor((W - tw) / 2)) + offsetX;
  }

  function textMarquee(W, H, cfg = {}) {
    const txt = getCustomText();
    const font = window.FONTS['5x7'];
    const scale = cfg.scale || 1;
    const tw = window.measureText(txt, font, scale);
    const th = font.height * scale;
    const y = Math.max(0, Math.floor((H - th) / 2)) + (cfg.offsetY || 0);
    const frames = [];
    const step = 4;
    for (let x = W; x > -tw; x -= step) {
      const f = mk(W, H);
      window.renderTextToFrame(f, txt, x, y, font, 1, W, H, scale);
      frames.push(f);
    }
    return frames.length ? frames : [mk(W, H)];
  }

  function textBounce(W, H, cfg = {}) {
    const txt = getCustomText();
    const font = window.FONTS['5x7'];
    const scale = cfg.scale || 1;
    const tw = window.measureText(txt, font, scale);
    const th = font.height * scale;
    const x = getAlignedX(tw, W, cfg.align || 'center', cfg.offsetX || 0);
    const frames = [];
    const max_y = Math.max(0, H - th);
    for (let i = 0; i < 8; i++) {
      const f = mk(W, H);
      const bounceY = Math.round((max_y / 2) - (max_y / 2) * Math.sin(i * Math.PI / 4));
      const y = bounceY + (cfg.offsetY || 0);
      window.renderTextToFrame(f, txt, x, y, font, 1, W, H, scale);
      frames.push(f);
    }
    return frames;
  }

  function textBlink(W, H, cfg = {}) {
    const txt = getCustomText();
    const font = window.FONTS['5x7'];
    const scale = cfg.scale || 1;
    const tw = window.measureText(txt, font, scale);
    const th = font.height * scale;
    const x = getAlignedX(tw, W, cfg.align || 'center', cfg.offsetX || 0);
    const y = Math.max(0, Math.floor((H - th) / 2)) + (cfg.offsetY || 0);
    const f1 = mk(W, H);
    window.renderTextToFrame(f1, txt, x, y, font, 1, W, H, scale);
    return [f1, mk(W, H)];
  }

  function qrCode(W, H) {
    const txt = typeof window.getQrText === 'function' ? window.getQrText() : 'https://oledanimationmaker.com';
    const f = mk(W, H);
    if (typeof window.renderQRToFrame === 'function') window.renderQRToFrame(f, txt, W, H);
    return [f];
  }

  // ── Registry ────────────────────────────────────────────────────────────────
  window.TEMPLATES = [
    { id:'heart',    icon:'❤️',  name:'Heart Beat',      desc:'Pulsing heart — perfect for health/bio displays', fps:4,  gen:heartBeat },
    { id:'spinner',  icon:'🔄',  name:'Loading Spinner', desc:'Circular spinner — use while data loads',          fps:10, gen:spinner   },
    { id:'wifi',     icon:'📶',  name:'WiFi Connecting', desc:'WiFi signal connecting animation',                 fps:2,  gen:wifi      },
    { id:'ball',     icon:'⚽',  name:'Bouncing Ball',   desc:'Ball bouncing off walls',                          fps:15, gen:bounceBall},
    { id:'pacman',   icon:'👾',  name:'Pac-Man',         desc:'Classic Pac-Man eating dots',                      fps:6,  gen:pacman    },
    { id:'smiley',   icon:'😊',  name:'Smiley Blink',   desc:'Happy face with blinking eyes',                    fps:3,  gen:smiley    },
    { id:'battery',  icon:'🔋',  name:'Battery Charge',  desc:'Battery level filling up',                         fps:3,  gen:battery   },
    { id:'signal',   icon:'📡',  name:'Signal Bars',     desc:'Signal strength bars growing',                     fps:3,  gen:signal    },
    { id:'clock',    icon:'🕐',  name:'Analog Clock',    desc:'Clock with rotating hour hand',                    fps:2,  gen:clock     },
    { id:'sine',     icon:'〰️', name:'Sine Wave',       desc:'Scrolling sine wave animation',                   fps:12, gen:sineWave  },
    { id:'matrix',   icon:'💻',  name:'Matrix Rain',     desc:'Falling pixel rain effect',                        fps:10, gen:matrix    },
    { id:'start',    icon:'🚀',  name:'Countdown Start', desc:'3..2..1.. countdown sequence',                     fps:4,  gen:startup   },
    { id:'txt-scroll',icon:'⬅️', name:'Scrolling Text',  desc:'Custom text scrolling left',                       fps:15, gen:textMarquee },
    { id:'txt-bounce',icon:'↕️', name:'Bouncing Text',   desc:'Custom text bouncing up and down',                 fps:10, gen:textBounce  },
    { id:'txt-blink', icon:'✨', name:'Blinking Text',   desc:'Custom text flashing on and off',                  fps:4,  gen:textBlink   },
    { id:'qr-code',   icon:'📱', name:'QR Code',         desc:'Enter any URL or text — live QR on OLED',          fps:1,  gen:qrCode, isQr:true }
  ];
})();
