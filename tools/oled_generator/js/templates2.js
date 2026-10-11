// Auto-generated 50 animations for OLED
(function() {
  const mk = (W,H) => Array.from({length:H}, ()=>new Uint8Array(W));
  const Draw = {
    line: (f, x0, y0, x1, y1) => {
      x0 = Math.round(x0); y0 = Math.round(y0);
      x1 = Math.round(x1); y1 = Math.round(y1);
      let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
      let sx = (x0 < x1) ? 1 : -1, sy = (y0 < y1) ? 1 : -1;
      let err = dx - dy;
      while(true) {
        if (x0>=0 && x0<f[0].length && y0>=0 && y0<f.length) f[y0][x0] = 1;
        if (x0===x1 && y0===y1) break;
        let e2 = 2*err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
      }
    },
    circle: (f, xc, yc, r) => {
      xc = Math.round(xc); yc = Math.round(yc); r = Math.round(r);
      let x = r, y = 0, err = 0;
      while (x >= y) {
        [[x,y],[y,x],[-y,x],[-x,y],[-x,-y],[-y,-x],[y,-x],[x,-y]].forEach(([dx,dy]) => {
          let px = xc+dx, py = yc+dy;
          if (px>=0 && px<f[0].length && py>=0 && py<f.length) f[py][px] = 1;
        });
        y++; err += 2*y + 1;
        if (2*(err-x)+1 > 0) { x--; err += 1 - 2*x; }
      }
    },
    rect: (f, x, y, w, h) => {
      x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
      for(let i=0; i<w; i++) {
        if (x+i>=0 && x+i<f[0].length && y>=0 && y<f.length) f[y][x+i] = 1;
        if (x+i>=0 && x+i<f[0].length && y+h-1>=0 && y+h-1<f.length) f[y+h-1][x+i] = 1;
      }
      for(let i=0; i<h; i++) {
        if (x>=0 && x<f[0].length && y+i>=0 && y+i<f.length) f[y+i][x] = 1;
        if (x+w-1>=0 && x+w-1<f[0].length && y+i>=0 && y+i<f.length) f[y+i][x+w-1] = 1;
      }
    },
    fillRect: (f, x, y, w, h) => {
      for(let i=0; i<h; i++) {
        for(let j=0; j<w; j++) {
          let px=Math.floor(x+j), py=Math.floor(y+i);
          if (px>=0 && px<f[0].length && py>=0 && py<f.length) f[py][px] = 1;
        }
      }
    }
  };

  const extraTemplates = [
    { id:'ripple', icon:'🌊', name:'Ripple', desc:'Expanding circles', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<15; i++) {
        let f=mk(W,H);
        for(let r=i; r<Math.max(W,H); r+=15) Draw.circle(f, W/2, H/2, r);
        frames.push(f);
      }
      return frames;
    }},
    { id:'warpSpeed', icon:'🚀', name:'Warp Speed', desc:'Stars zooming by', fps:15, gen:(W,H)=>{
      let frames=[]; let stars = Array.from({length:40}, ()=>({x:Math.random()*W, y:Math.random()*H, z:Math.random()}));
      for(let i=0; i<15; i++) {
        let f=mk(W,H);
        stars.forEach(s => {
          let cx=W/2, cy=H/2;
          s.x = cx + (s.x-cx)*1.2; s.y = cy + (s.y-cy)*1.2;
          if (s.x<0 || s.x>=W || s.y<0 || s.y>=H) { s.x=cx+(Math.random()-0.5)*W*0.5; s.y=cy+(Math.random()-0.5)*H*0.5; }
          Draw.line(f, Math.round(s.x), Math.round(s.y), Math.round(s.x+(s.x-cx)*0.1), Math.round(s.y+(s.y-cy)*0.1));
        });
        frames.push(f);
      }
      return frames;
    }},
    { id:'rain', icon:'🌧️', name:'Rain', desc:'Falling rain', fps:15, gen:(W,H)=>{
      let frames=[]; let drops = Array.from({length:30}, ()=>({x:Math.random()*W, y:Math.random()*H, s:Math.random()*2+1}));
      for(let i=0; i<10; i++) {
        let f=mk(W,H);
        drops.forEach(d => {
          d.y += d.s * 2; if(d.y>H) { d.y=0; d.x=Math.random()*W; }
          Draw.line(f, Math.round(d.x), Math.round(d.y), Math.round(d.x), Math.round(d.y+3));
        });
        frames.push(f);
      }
      return frames;
    }},
    { id:'snow', icon:'❄️', name:'Snow', desc:'Falling snow', fps:10, gen:(W,H)=>{
      let frames=[]; let flakes = Array.from({length:40}, ()=>({x:Math.random()*W, y:Math.random()*H, s:Math.random()*1+0.5, a:Math.random()*Math.PI}));
      for(let i=0; i<20; i++) {
        let f=mk(W,H);
        flakes.forEach(fl => {
          fl.y += fl.s; fl.a += 0.1;
          let px = Math.round(fl.x + Math.sin(fl.a)*2);
          if(fl.y>H) { fl.y=0; fl.x=Math.random()*W; }
          if (px>=0 && px<W && fl.y>=0 && fl.y<H) f[Math.floor(fl.y)][px] = 1;
        });
        frames.push(f);
      }
      return frames;
    }},
    { id:'staticNoise', icon:'📺', name:'Static TV', desc:'Random noise', fps:15, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<8; i++) {
        let f=mk(W,H);
        for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(Math.random()>0.7) f[y][x]=1;
        frames.push(f);
      }
      return frames;
    }},
    { id:'gridPan', icon:'🌐', name:'Grid Pan', desc:'Scrolling grid', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<8; i++) {
        let f=mk(W,H);
        for(let x=i; x<W; x+=8) Draw.line(f, x, 0, x, H-1);
        for(let y=i; y<H; y+=8) Draw.line(f, 0, y, W-1, y);
        frames.push(f);
      }
      return frames;
    }},
    { id:'checkerboard', icon:'🏁', name:'Checkerboard', desc:'Moving checker pattern', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<8; i++) {
        let f=mk(W,H);
        for(let y=0;y<H;y+=8) for(let x=0;x<W;x+=8) {
          if (((x+y)/8)%2 === 0) Draw.fillRect(f, x+i, y, 8, 8);
        }
        frames.push(f);
      }
      return frames;
    }},
    { id:'radar', icon:'📡', name:'Radar Scan', desc:'Sweeping line', fps:10, gen:(W,H)=>{
      let frames=[]; let cx=W/2, cy=H/2, r=Math.min(W,H)/2-2;
      for(let i=0; i<32; i++) {
        let f=mk(W,H);
        Draw.circle(f, cx, cy, r);
        let a = (i/32) * Math.PI * 2;
        Draw.line(f, cx, cy, Math.round(cx+Math.cos(a)*r), Math.round(cy+Math.sin(a)*r));
        frames.push(f);
      }
      return frames;
    }},
    { id:'cube3D', icon:'🧊', name:'3D Cube', desc:'Rotating cube', fps:10, gen:(W,H)=>{
      let frames=[]; let nodes = [[-1,-1,-1],[-1,-1,1],[-1,1,-1],[-1,1,1],[1,-1,-1],[1,-1,1],[1,1,-1],[1,1,1]];
      let edges = [[0,1],[1,3],[3,2],[2,0],[4,5],[5,7],[7,6],[6,4],[0,4],[1,5],[2,6],[3,7]];
      for(let i=0; i<20; i++) {
        let f=mk(W,H); let ang = i*0.1;
        let proj = nodes.map(([x,y,z]) => {
          let rx = x*Math.cos(ang) - z*Math.sin(ang);
          let rz = x*Math.sin(ang) + z*Math.cos(ang);
          let ry = y*Math.cos(ang*0.5) - rz*Math.sin(ang*0.5);
          rz = y*Math.sin(ang*0.5) + rz*Math.cos(ang*0.5);
          let s = 20 / (rz + 4);
          return [Math.round(W/2 + rx*s*15), Math.round(H/2 + ry*s*15)];
        });
        edges.forEach(([a,b]) => Draw.line(f, proj[a][0], proj[a][1], proj[b][0], proj[b][1]));
        frames.push(f);
      }
      return frames;
    }},
    { id:'spiral', icon:'🌀', name:'Spiral', desc:'Hypnotic rotating spiral', fps:12, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<10; i++) {
        let f=mk(W,H);
        for(let a=0; a<Math.PI*10; a+=0.1) {
          let r = a*2;
          let px = Math.round(W/2 + Math.cos(a + i*0.6)*r);
          let py = Math.round(H/2 + Math.sin(a + i*0.6)*r);
          if (px>=0 && px<W && py>=0 && py<H) f[py][px] = 1;
        }
        frames.push(f);
      }
      return frames;
    }},
    { id:'tunnel', icon:'🕳️', name:'Tunnel', desc:'Rectangles flying towards screen', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<10; i++) {
        let f=mk(W,H);
        for(let s=i; s<Math.max(W,H); s+=10) {
          Draw.rect(f, Math.round(W/2-s), Math.round(H/2-s/2), s*2, s);
        }
        frames.push(f);
      }
      return frames;
    }},
    { id:'wave', icon:'〰️', name:'Sine Wave', desc:'Scrolling wave', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<16; i++) {
        let f=mk(W,H);
        for(let x=0; x<W; x++) {
          let y = H/2 + Math.sin((x+i*4)*0.1)*10;
          if(y>=0 && y<H) f[Math.floor(y)][x] = 1;
        }
        frames.push(f);
      }
      return frames;
    }},
    { id:'dna', icon:'🧬', name:'DNA', desc:'Spinning helix', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<16; i++) {
        let f=mk(W,H);
        for(let x=0; x<W; x+=4) {
          let y1 = H/2 + Math.sin((x+i*4)*0.1)*15;
          let y2 = H/2 + Math.cos((x+i*4)*0.1)*15;
          if(x%16===0) Draw.line(f, x, Math.round(y1), x, Math.round(y2));
          if(y1>=0 && y1<H) f[Math.floor(y1)][x] = 1;
          if(y2>=0 && y2<H) f[Math.floor(y2)][x] = 1;
        }
        frames.push(f);
      }
      return frames;
    }},
    { id:'equalizer', icon:'🎚️', name:'Equalizer', desc:'Audio bars', fps:15, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<10; i++) {
        let f=mk(W,H);
        for(let x=4; x<W-4; x+=8) {
          let h = Math.random()*(H-4);
          Draw.fillRect(f, x, Math.round(H-h), 4, Math.round(h));
        }
        frames.push(f);
      }
      return frames;
    }},
    { id:'checkmark', icon:'✅', name:'Checkmark', desc:'Draws a check', fps:8, gen:(W,H)=>{
      let frames=[];
      let pts = [[W/2-10, H/2], [W/2-2, H/2+8], [W/2+12, H/2-8]];
      for(let i=0; i<=10; i++) {
        let f=mk(W,H);
        if(i>0) Draw.line(f, pts[0][0], pts[0][1], pts[0][0]+(pts[1][0]-pts[0][0])*Math.min(1, i/5), pts[0][1]+(pts[1][1]-pts[0][1])*Math.min(1, i/5));
        if(i>5) Draw.line(f, pts[1][0], pts[1][1], pts[1][0]+(pts[2][0]-pts[1][0])*((i-5)/5), pts[1][1]+(pts[2][1]-pts[1][1])*((i-5)/5));
        frames.push(f);
      }
      return frames;
    }},
    { id:'cross', icon:'❌', name:'X Mark', desc:'Draws an X', fps:8, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<=10; i++) {
        let f=mk(W,H);
        let s = 10 * (i/10);
        Draw.line(f, W/2-s, H/2-s, W/2+s, H/2+s);
        Draw.line(f, W/2-s, H/2+s, W/2+s, H/2-s);
        frames.push(f);
      }
      return frames;
    }},
    { id:'hourglass', icon:'⏳', name:'Hourglass', desc:'Sand falling', fps:5, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<=8; i++) {
        let f=mk(W,H);
        Draw.line(f, W/2-10, H/2-10, W/2+10, H/2-10);
        Draw.line(f, W/2-10, H/2-10, W/2, H/2);
        Draw.line(f, W/2+10, H/2-10, W/2, H/2);
        Draw.line(f, W/2-10, H/2+10, W/2+10, H/2+10);
        Draw.line(f, W/2-10, H/2+10, W/2, H/2);
        Draw.line(f, W/2+10, H/2+10, W/2, H/2);
        let sandTop = 8-i;
        if(sandTop>0) Draw.fillRect(f, W/2-sandTop, H/2-sandTop, sandTop*2, sandTop);
        if(i>0) Draw.fillRect(f, W/2-i, H/2+10-i, i*2, i);
        if(sandTop>0) Draw.line(f, W/2, H/2, W/2, H/2+10-i);
        frames.push(f);
      }
      return frames;
    }},
    { id:'upload', icon:'⬆️', name:'Upload', desc:'Arrow moving up', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<8; i++) {
        let f=mk(W,H);
        let y = H/2+4 - i;
        Draw.line(f, W/2, y, W/2, y+10);
        Draw.line(f, W/2, y, W/2-4, y+4);
        Draw.line(f, W/2, y, W/2+4, y+4);
        Draw.fillRect(f, W/2-8, H/2+12, 16, 2);
        frames.push(f);
      }
      return frames;
    }},
    { id:'download', icon:'⬇️', name:'Download', desc:'Arrow moving down', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<8; i++) {
        let f=mk(W,H);
        let y = H/2-8 + i;
        Draw.line(f, W/2, y, W/2, y+10);
        Draw.line(f, W/2, y+10, W/2-4, y+6);
        Draw.line(f, W/2, y+10, W/2+4, y+6);
        Draw.fillRect(f, W/2-8, H/2+12, 16, 2);
        frames.push(f);
      }
      return frames;
    }},
    { id:'loadingBar', icon:'▬', name:'Loading Bar', desc:'Filling progress bar', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<=10; i++) {
        let f=mk(W,H);
        Draw.rect(f, W/2-20, H/2-4, 40, 8);
        Draw.fillRect(f, W/2-18, H/2-2, Math.floor(36*(i/10)), 4);
        frames.push(f);
      }
      return frames;
    }},
    { id:'loadingRing', icon:'⭕', name:'Loading Ring', desc:'Filling circle', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<=12; i++) {
        let f=mk(W,H);
        for(let a=0; a<Math.PI*2*(i/12); a+=0.1) {
          Draw.circle(f, Math.round(W/2+Math.cos(a-Math.PI/2)*10), Math.round(H/2+Math.sin(a-Math.PI/2)*10), 1);
        }
        frames.push(f);
      }
      return frames;
    }},
    { id:'thermometer', icon:'🌡️', name:'Thermometer', desc:'Temperature rising', fps:5, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<=5; i++) {
        let f=mk(W,H);
        Draw.circle(f, W/2, H/2+10, 5);
        Draw.rect(f, W/2-2, H/2-10, 4, 16);
        Draw.fillRect(f, W/2-1, H/2+6-i*3, 2, 4+i*3);
        frames.push(f);
      }
      return frames;
    }},
    { id:'batteryCharge', icon:'🔋', name:'Battery Charge', desc:'Advanced battery filling', fps:5, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<=4; i++) {
        let f=mk(W,H);
        Draw.rect(f, W/2-12, H/2-6, 24, 12);
        Draw.fillRect(f, W/2+12, H/2-2, 2, 4);
        for(let j=0; j<i; j++) Draw.fillRect(f, W/2-10+j*5, H/2-4, 4, 8);
        frames.push(f);
      }
      return frames;
    }},
    { id:'lock', icon:'🔒', name:'Padlock Close', desc:'Lock closing', fps:6, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<=5; i++) {
        let f=mk(W,H);
        Draw.fillRect(f, W/2-8, H/2, 16, 12);
        let off = 5-i;
        for(let a=Math.PI; a<=Math.PI*2; a+=0.1) {
          f[Math.floor(H/2-4-off+Math.sin(a)*4)][Math.floor(W/2+Math.cos(a)*4)] = 1;
        }
        Draw.line(f, W/2-4, H/2-4-off, W/2-4, H/2);
        if(i===5) Draw.line(f, W/2+4, H/2-4-off, W/2+4, H/2);
        frames.push(f);
      }
      return frames;
    }},
    { id:'unlock', icon:'🔓', name:'Padlock Open', desc:'Lock opening', fps:6, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<=5; i++) {
        let f=mk(W,H);
        Draw.fillRect(f, W/2-8, H/2, 16, 12);
        let off = i;
        for(let a=Math.PI; a<=Math.PI*2; a+=0.1) {
          f[Math.floor(H/2-4-off+Math.sin(a)*4)][Math.floor(W/2+Math.cos(a)*4)] = 1;
        }
        Draw.line(f, W/2-4, H/2-4-off, W/2-4, H/2);
        if(i===0) Draw.line(f, W/2+4, H/2-4-off, W/2+4, H/2);
        frames.push(f);
      }
      return frames;
    }},
    { id:'mail', icon:'✉️', name:'Mail', desc:'Envelope opening', fps:6, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<=5; i++) {
        let f=mk(W,H);
        Draw.rect(f, W/2-12, H/2-8, 24, 16);
        if(i<3) {
          Draw.line(f, W/2-12, H/2-8, W/2, H/2);
          Draw.line(f, W/2+12, H/2-8, W/2, H/2);
        } else {
          Draw.line(f, W/2-12, H/2-8, W/2, H/2-16);
          Draw.line(f, W/2+12, H/2-8, W/2, H/2-16);
        }
        frames.push(f);
      }
      return frames;
    }},
    { id:'search', icon:'🔍', name:'Search', desc:'Magnifying glass sweeping', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<10; i++) {
        let f=mk(W,H);
        let x = W/2-10 + (i<5?i*4: (10-i)*4);
        Draw.circle(f, x, H/2-2, 5);
        Draw.line(f, x+3, H/2+1, x+8, H/2+6);
        frames.push(f);
      }
      return frames;
    }},
    { id:'volumeUp', icon:'🔊', name:'Volume Up', desc:'Speaker waves', fps:5, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<=3; i++) {
        let f=mk(W,H);
        Draw.fillRect(f, W/2-10, H/2-2, 4, 4);
        Draw.line(f, W/2-6, H/2-2, W/2-2, H/2-6);
        Draw.line(f, W/2-6, H/2+2, W/2-2, H/2+6);
        Draw.line(f, W/2-2, H/2-6, W/2-2, H/2+6);
        for(let j=1; j<=i; j++) {
          for(let a=-Math.PI/4; a<=Math.PI/4; a+=0.1) f[Math.floor(H/2+Math.sin(a)*j*4)][Math.floor(W/2+j*4+Math.cos(a)*j*4-j*4)] = 1;
        }
        frames.push(f);
      }
      return frames;
    }},
    { id:'wifiScan', icon:'📡', name:'WiFi Scan', desc:'Radar scanning', fps:5, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<=3; i++) {
        let f=mk(W,H);
        Draw.circle(f, W/2, H/2+8, 1);
        for(let j=1; j<=i; j++) {
          for(let a=-Math.PI*0.75; a<=-Math.PI*0.25; a+=0.1) f[Math.floor(H/2+8+Math.sin(a)*j*4)][Math.floor(W/2+Math.cos(a)*j*4)] = 1;
        }
        frames.push(f);
      }
      return frames;
    }},
    { id:'moonPhases', icon:'🌖', name:'Moon Phases', desc:'Moon shadow', fps:8, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<8; i++) {
        let f=mk(W,H);
        Draw.circle(f, W/2, H/2, 8);
        for(let y=-8; y<=8; y++) {
          for(let x=-8; x<=8; x++) {
            if(x*x+y*y <= 64) {
              if (x > (i-4)*2) f[Math.floor(H/2+y)][Math.floor(W/2+x)] = 1;
            }
          }
        }
        frames.push(f);
      }
      return frames;
    }},
    { id:'pendulum', icon:'⏱️', name:'Pendulum', desc:'Swinging bob', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<10; i++) {
        let f=mk(W,H);
        let a = Math.PI/2 + Math.sin(i*Math.PI*2/10) * Math.PI/4;
        let px = W/2 + Math.cos(a)*15;
        let py = H/2-10 + Math.sin(a)*15;
        Draw.line(f, W/2, H/2-10, Math.round(px), Math.round(py));
        Draw.circle(f, Math.round(px), Math.round(py), 3);
        frames.push(f);
      }
      return frames;
    }},
    { id:'windmill', icon:'🛩️', name:'Windmill', desc:'Spinning cross', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<8; i++) {
        let f=mk(W,H);
        Draw.line(f, W/2, H/2, W/2, H/2+15);
        let a = i * Math.PI/4;
        Draw.line(f, W/2, H/2, Math.round(W/2+Math.cos(a)*10), Math.round(H/2+Math.sin(a)*10));
        Draw.line(f, W/2, H/2, Math.round(W/2-Math.cos(a)*10), Math.round(H/2-Math.sin(a)*10));
        Draw.line(f, W/2, H/2, Math.round(W/2+Math.cos(a+Math.PI/2)*10), Math.round(H/2+Math.sin(a+Math.PI/2)*10));
        Draw.line(f, W/2, H/2, Math.round(W/2-Math.cos(a+Math.PI/2)*10), Math.round(H/2-Math.sin(a+Math.PI/2)*10));
        frames.push(f);
      }
      return frames;
    }},
    { id:'gears', icon:'⚙️', name:'Gears', desc:'Two gears spinning', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<8; i++) {
        let f=mk(W,H);
        let a1 = i * Math.PI/16;
        let a2 = -i * Math.PI/16;
        Draw.circle(f, W/2-8, H/2, 6);
        Draw.circle(f, W/2+8, H/2, 6);
        for(let j=0; j<8; j++) {
          let ang1 = a1 + j*Math.PI/4;
          Draw.line(f, W/2-8, H/2, Math.round(W/2-8+Math.cos(ang1)*8), Math.round(H/2+Math.sin(ang1)*8));
          let ang2 = a2 + j*Math.PI/4 + Math.PI/8;
          Draw.line(f, W/2+8, H/2, Math.round(W/2+8+Math.cos(ang2)*8), Math.round(H/2+Math.sin(ang2)*8));
        }
        frames.push(f);
      }
      return frames;
    }},
    { id:'eyeBlink', icon:'👁️', name:'Blinking Eye', desc:'Eye opening and closing', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<6; i++) {
        let f=mk(W,H);
        let h = i<3 ? 8-i*3 : (i-3)*3;
        Draw.line(f, W/2-10, H/2, W/2, H/2-h);
        Draw.line(f, W/2, H/2-h, W/2+10, H/2);
        Draw.line(f, W/2-10, H/2, W/2, H/2+h);
        Draw.line(f, W/2, H/2+h, W/2+10, H/2);
        if(h>2) Draw.circle(f, W/2, H/2, 2);
        frames.push(f);
      }
      for(let i=0;i<5;i++) frames.push(frames[0]); // pause open
      return frames;
    }},
    { id:'pulseEKG', icon:'📈', name:'EKG Pulse', desc:'Heartbeat monitor', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<20; i++) {
        let f=mk(W,H);
        let offset = i*2;
        for(let x=0; x<W; x++) {
          let y = H/2;
          let lx = (x + offset)%W;
          if(lx > W/2-10 && lx < W/2-5) y = H/2 - (lx-(W/2-10))*2;
          else if(lx >= W/2-5 && lx < W/2+5) y = H/2-10 + (lx-(W/2-5))*4;
          else if(lx >= W/2+5 && lx < W/2+10) y = H/2+10 - (lx-(W/2+5))*2;
          if (y>=0 && y<H) f[Math.floor(y)][x] = 1;
        }
        frames.push(f);
      }
      return frames;
    }},
    { id:'diamond', icon:'💎', name:'Diamond', desc:'Shining diamond', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<8; i++) {
        let f=mk(W,H);
        Draw.line(f, W/2-10, H/2-5, W/2+10, H/2-5);
        Draw.line(f, W/2-10, H/2-5, W/2-15, H/2);
        Draw.line(f, W/2+10, H/2-5, W/2+15, H/2);
        Draw.line(f, W/2-15, H/2, W/2, H/2+15);
        Draw.line(f, W/2+15, H/2, W/2, H/2+15);
        Draw.line(f, W/2-5, H/2-5, W/2, H/2+15);
        Draw.line(f, W/2+5, H/2-5, W/2, H/2+15);
        if(i===0) Draw.line(f, W/2-18, H/2-8, W/2-12, H/2-2);
        if(i===2) Draw.line(f, W/2+18, H/2-8, W/2+12, H/2-2);
        frames.push(f);
      }
      return frames;
    }},
    { id:'planet', icon:'🪐', name:'Planet', desc:'Orbiting rings', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<16; i++) {
        let f=mk(W,H);
        Draw.circle(f, W/2, H/2, 8);
        for(let a=0; a<Math.PI*2; a+=0.1) {
          let x = Math.cos(a)*16;
          let y = Math.sin(a)*4;
          let rx = x*Math.cos(0.2) - y*Math.sin(0.2);
          let ry = x*Math.sin(0.2) + y*Math.cos(0.2);
          if (Math.sin(a - i*Math.PI*2/16) > 0) f[Math.floor(H/2+ry)][Math.floor(W/2+rx)] = 1;
        }
        frames.push(f);
      }
      return frames;
    }},
    { id:'atom', icon:'⚛️', name:'Atom', desc:'Electrons orbiting', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<10; i++) {
        let f=mk(W,H);
        Draw.circle(f, W/2, H/2, 2);
        let a1 = i*Math.PI*2/10;
        let a2 = i*Math.PI*2/10 + Math.PI*2/3;
        let a3 = i*Math.PI*2/10 + Math.PI*4/3;
        for(let a=0; a<Math.PI*2; a+=0.1) {
          let x=Math.cos(a)*12, y=Math.sin(a)*3;
          f[Math.floor(H/2+x*Math.sin(0)+y*Math.cos(0))][Math.floor(W/2+x*Math.cos(0)-y*Math.sin(0))] = 1;
          f[Math.floor(H/2+x*Math.sin(2)+y*Math.cos(2))][Math.floor(W/2+x*Math.cos(2)-y*Math.sin(2))] = 1;
          f[Math.floor(H/2+x*Math.sin(4)+y*Math.cos(4))][Math.floor(W/2+x*Math.cos(4)-y*Math.sin(4))] = 1;
        }
        Draw.circle(f, Math.round(W/2+Math.cos(a1)*12), Math.round(H/2+Math.sin(a1)*3), 1);
        frames.push(f);
      }
      return frames;
    }},
    { id:'birdFlap', icon:'🐦', name:'Bird', desc:'Flapping bird', fps:8, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<4; i++) {
        let f=mk(W,H);
        let y = i<2 ? i*3 : (4-i)*3;
        Draw.line(f, W/2, H/2, W/2-8, H/2-y);
        Draw.line(f, W/2, H/2, W/2+8, H/2-y);
        frames.push(f);
      }
      return frames;
    }},
    { id:'flagWave', icon:'🚩', name:'Flag', desc:'Waving flag', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<8; i++) {
        let f=mk(W,H);
        Draw.line(f, W/2-10, H/2-10, W/2-10, H/2+10);
        for(let x=0; x<20; x++) {
          let y1 = H/2-10 + Math.sin((x-i*2)*0.3)*3;
          let y2 = H/2 + Math.sin((x-i*2)*0.3)*3;
          Draw.line(f, W/2-10+x, Math.round(y1), W/2-10+x, Math.round(y2));
        }
        frames.push(f);
      }
      return frames;
    }},
    { id:'bounceBox', icon:'📦', name:'Bouncing Box', desc:'DVD logo style', fps:15, gen:(W,H)=>{
      let frames=[];
      let x=10, y=10, dx=2, dy=2;
      for(let i=0; i<60; i++) {
        let f=mk(W,H);
        Draw.fillRect(f, x, y, 8, 8);
        x+=dx; y+=dy;
        if(x<0 || x>W-8) { dx*=-1; x+=dx; }
        if(y<0 || y>H-8) { dy*=-1; y+=dy; }
        frames.push(f);
      }
      return frames;
    }},
    { id:'tetris', icon:'🧱', name:'Tetris', desc:'Falling block', fps:5, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<10; i++) {
        let f=mk(W,H);
        Draw.fillRect(f, W/2-8, H-8, 16, 8); // floor
        Draw.fillRect(f, W/2-4, Math.min(H-12, i*4), 4, 12); // falling piece
        frames.push(f);
      }
      return frames;
    }},
    { id:'pong', icon:'🏓', name:'Pong', desc:'Two paddles and ball', fps:15, gen:(W,H)=>{
      let frames=[];
      let bx=W/2, by=H/2, dx=4, dy=2, p1=H/2-4, p2=H/2-4;
      for(let i=0; i<20; i++) {
        let f=mk(W,H);
        Draw.fillRect(f, 4, p1, 2, 8);
        Draw.fillRect(f, W-6, p2, 2, 8);
        Draw.fillRect(f, Math.round(bx), Math.round(by), 2, 2);
        bx+=dx; by+=dy;
        if(by<0 || by>H-2) dy*=-1;
        if(bx<6) { dx*=-1; p1=Math.min(H-8, Math.max(0, by-4)); }
        if(bx>W-8) { dx*=-1; p2=Math.min(H-8, Math.max(0, by-4)); }
        frames.push(f);
      }
      return frames;
    }},
    { id:'fire', icon:'🔥', name:'Fire', desc:'Particle fire', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<10; i++) {
        let f=mk(W,H);
        for(let j=0; j<20; j++) {
          let px = W/2 + (Math.random()-0.5)*10;
          let py = H/2+10 - Math.random()*15;
          Draw.circle(f, Math.round(px), Math.round(py), Math.floor(Math.random()*2+1));
        }
        frames.push(f);
      }
      return frames;
    }},
    { id:'compass', icon:'🧭', name:'Compass', desc:'Spinning needle', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<16; i++) {
        let f=mk(W,H);
        Draw.circle(f, W/2, H/2, 12);
        let a = i*Math.PI*2/16;
        Draw.line(f, W/2, H/2, Math.round(W/2+Math.cos(a)*10), Math.round(H/2+Math.sin(a)*10));
        Draw.line(f, Math.round(W/2-Math.cos(a)*4), Math.round(H/2-Math.sin(a)*4), Math.round(W/2+Math.cos(a)*10), Math.round(H/2+Math.sin(a)*10));
        frames.push(f);
      }
      return frames;
    }},
    { id:'target', icon:'🎯', name:'Target', desc:'Crosshairs lock on', fps:8, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<8; i++) {
        let f=mk(W,H);
        let s = i<4 ? 20-i*3 : 8;
        Draw.circle(f, W/2, H/2, s);
        if(i===7) Draw.circle(f, W/2, H/2, 4);
        Draw.line(f, W/2, H/2-s-4, W/2, H/2-s);
        Draw.line(f, W/2, H/2+s, W/2, H/2+s+4);
        Draw.line(f, W/2-s-4, H/2, W/2-s, H/2);
        Draw.line(f, W/2+s, H/2, W/2+s+4, H/2);
        frames.push(f);
      }
      return frames;
    }},
    { id:'clockHands', icon:'🕐', name:'Fast Clock', desc:'Spinning hands', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<12; i++) {
        let f=mk(W,H);
        Draw.circle(f, W/2, H/2, 12);
        Draw.line(f, W/2, H/2, W/2, H/2-6); // hour hand
        let a = i*Math.PI*2/12 - Math.PI/2;
        Draw.line(f, W/2, H/2, Math.round(W/2+Math.cos(a)*10), Math.round(H/2+Math.sin(a)*10)); // minute
        frames.push(f);
      }
      return frames;
    }},
    { id:'magnet', icon:'🧲', name:'Magnet', desc:'Pulling particles', fps:10, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<10; i++) {
        let f=mk(W,H);
        Draw.line(f, W/2-6, H/2-4, W/2-6, H/2+4);
        Draw.line(f, W/2+6, H/2-4, W/2+6, H/2+4);
        Draw.line(f, W/2-6, H/2+4, W/2+6, H/2+4);
        for(let j=0; j<8; j++) {
          let x = W/2 + (Math.random()-0.5)*20;
          let y = H/2-15 + Math.random()*10 + (10-i);
          if (y < H/2-4) f[Math.floor(y)][Math.floor(x)] = 1;
        }
        frames.push(f);
      }
      return frames;
    }},
    { id:'ghost', icon:'👻', name:'Ghost', desc:'Hovering shape', fps:5, gen:(W,H)=>{
      let frames=[];
      for(let i=0; i<4; i++) {
        let f=mk(W,H);
        let y = i<2 ? H/2-6 : H/2-4;
        Draw.circle(f, W/2, y, 6);
        Draw.fillRect(f, W/2-6, y, 13, 8);
        Draw.circle(f, W/2-4, y-2, 1);
        Draw.circle(f, W/2+4, y-2, 1);
        Draw.line(f, W/2-6, y+8, W/2-4, y+10);
        Draw.line(f, W/2-2, y+8, W/2, y+10);
        Draw.line(f, W/2+2, y+8, W/2+4, y+10);
        frames.push(f);
      }
      return frames;
    }}
  ];

  window.TEMPLATES.push(...extraTemplates);
})();
