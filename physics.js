'use strict';
/* Shared rigid rectangles with off-centre mouse joints, contact torque, friction and rest. */
(()=>{
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),cross=(a,b)=>a.x*b.y-a.y*b.x;
 const dot=(a,b)=>a.x*b.x+a.y*b.y;
 const rot=(p,a)=>({x:p.x*Math.cos(a)-p.y*Math.sin(a),y:p.x*Math.sin(a)+p.y*Math.cos(a)});
 const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y});
 const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
 function create(field,cls='physics-chip',limit=100){
  const bodies=[];let raf=0,previous=0,drag=null;
  const bounds=()=>field.getBoundingClientRect();
  function poly(b){const c=b.pos;return [{x:-b.w/2,y:-b.h/2},{x:b.w/2,y:-b.h/2},{x:b.w/2,y:b.h/2},{x:-b.w/2,y:b.h/2}].map(p=>add(c,rot(p,b.angle)));}
  function draw(b){b.el.style.transform=`translate3d(${(b.pos.x-b.w/2).toFixed(2)}px,${(b.pos.y-b.h/2).toFixed(2)}px,0) rotate(${b.angle.toFixed(5)}rad)`;}
  function attach(b){b.el.addEventListener('pointerdown',e=>down(e,b));b.el.addEventListener('contextmenu',e=>e.preventDefault());}
  function addBody(b){b.pos={x:b.x+b.w/2,y:b.y+b.h/2};b.vel={x:0,y:0};b.omega=0;b.angle=0;b.mass=clamp(b.w*b.h/1400,1,8);b.inv=1/b.mass;b.inertia=b.mass*(b.w*b.w+b.h*b.h)/12;b.invI=1/b.inertia;b.sleep=0;b.held=false;b.el.style.transformOrigin='center center';b.el.style.touchAction='none';bodies.push(b);attach(b);while(bodies.length>limit){const old=bodies.shift();old.el.remove();}draw(b);start();return b;}
  function spawn(text,cx,cy){text=String(text||'').trim().slice(0,38);if(!text)return null;const el=document.createElement('div');el.className=cls;if(cls==='physics-chip'){const inner=document.createElement('div');inner.className='word-chip-inner';const span=document.createElement('span');span.textContent=text;inner.append(span);el.append(inner);}else{el.textContent=text;}field.append(el);const r=bounds(),w=el.offsetWidth,h=el.offsetHeight;return addBody({el,w,h,x:clamp((cx??r.left+r.width/2)-r.left-w/2,0,Math.max(0,r.width-w)),y:clamp((cy??r.top+30)-r.top-h/2,0,Math.max(0,r.height-h))});}
  function down(e,b){if(drag||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();const r=bounds();const pointer={x:e.clientX-r.left,y:e.clientY-r.top};drag={b,id:e.pointerId,local:rot(sub(pointer,b.pos),-b.angle),pointer,history:[{...pointer,t:performance.now()}]};b.held=true;b.sleep=0;b.el.classList.add('held','dragging');if(e.target===b.el||b.el.contains(e.target)){try{b.el.setPointerCapture(e.pointerId)}catch{}}window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);if(typeof onGrab==='function')onGrab(b);start();}
  function move(e){if(!drag||drag.id!==e.pointerId)return;e.preventDefault();const r=bounds();drag.pointer={x:e.clientX-r.left,y:e.clientY-r.top};drag.history.push({...drag.pointer,t:performance.now()});while(drag.history.length>2&&performance.now()-drag.history[0].t>110)drag.history.shift();}
  function up(e){if(!drag||drag.id!==e.pointerId)return;const d=drag,b=d.b;drag=null;b.held=false;b.el.classList.remove('held','dragging');window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);try{b.el.releasePointerCapture(e.pointerId)}catch{}const a=d.history[0],z=d.history[d.history.length-1],dt=(z.t-a.t)/1000;if(dt>.025&&performance.now()-z.t<130){b.vel.x=clamp((z.x-a.x)/dt,-950,950);b.vel.y=clamp((z.y-a.y)/dt,-950,950);}else{b.vel.x*=.3;b.vel.y*=.3;}b.omega=clamp(b.omega,-6,6);if(typeof onRelease==='function')onRelease(b);start();}
  let onGrab=null,onRelease=null;
  function impulse(b,J,r){if(!b||b.held)return;b.vel.x+=J.x*b.inv;b.vel.y+=J.y*b.inv;b.omega+=cross(r,J)*b.invI;b.sleep=0;}
  function contact(a,b,normal,depth,point){const ia=a&&!a.held?a.inv:0,ib=b&&!b.held?b.inv:0;if(ia+ib===0)return;const ra=a?sub(point,a.pos):{x:0,y:0},rb=b?sub(point,b.pos):{x:0,y:0};const invIa=a&&!a.held?a.invI:0,invIb=b&&!b.held?b.invI:0;
   const va=a?add(a.vel,{x:-a.omega*ra.y,y:a.omega*ra.x}):{x:0,y:0};const vb=b?add(b.vel,{x:-b.omega*rb.y,y:b.omega*rb.x}):{x:0,y:0};let rel=sub(vb,va),vn=dot(rel,normal);
   const correction=Math.max(0,depth-.12)*.65/(ia+ib);if(a&&!a.held){a.pos.x-=normal.x*correction*ia;a.pos.y-=normal.y*correction*ia;}if(b&&!b.held){b.pos.x+=normal.x*correction*ib;b.pos.y+=normal.y*correction*ib;}
   if(vn>0)return;const rnA=cross(ra,normal),rnB=cross(rb,normal),den=ia+ib+rnA*rnA*invIa+rnB*rnB*invIb;if(den<1e-8)return;const restitution=vn< -110?.24:0;const j=-(1+restitution)*vn/den;const J={x:normal.x*j,y:normal.y*j};impulse(a,{x:-J.x,y:-J.y},ra);impulse(b,J,rb);
   const tangent={x:-normal.y,y:normal.x};rel=sub(b?add(b.vel,{x:-b.omega*rb.y,y:b.omega*rb.x}):{x:0,y:0},a?add(a.vel,{x:-a.omega*ra.y,y:a.omega*ra.x}):{x:0,y:0});const rtA=cross(ra,tangent),rtB=cross(rb,tangent),td=ia+ib+rtA*rtA*invIa+rtB*rtB*invIb;let jt=td>0?-dot(rel,tangent)/td:0;jt=clamp(jt,-j*.68,j*.68);const F={x:tangent.x*jt,y:tangent.y*jt};impulse(a,{x:-F.x,y:-F.y},ra);impulse(b,F,rb);
  }
  function collide(a,b){const A=poly(a),B=poly(b);let depth=Infinity,axis=null;for(const P of [A,B])for(let k=0;k<2;k++){const edge=sub(P[k+1],P[k]),len=Math.hypot(edge.x,edge.y),n={x:-edge.y/len,y:edge.x/len};const p=A.map(v=>dot(v,n)),q=B.map(v=>dot(v,n));const overlap=Math.min(Math.max(...p),Math.max(...q))-Math.max(Math.min(...p),Math.min(...q));if(overlap<=0)return;if(overlap<depth){depth=overlap;axis=n;}}if(dot(sub(b.pos,a.pos),axis)<0)axis={x:-axis.x,y:-axis.y};const points=[];for(const v of A)if(inside(v,B))points.push(v);for(const v of B)if(inside(v,A))points.push(v);let pt=points.length?{x:points.reduce((s,p)=>s+p.x,0)/points.length,y:points.reduce((s,p)=>s+p.y,0)/points.length}:add(a.pos,{x:axis.x*a.w*.35,y:axis.y*a.h*.35});contact(a,b,axis,depth,pt);}
  function inside(p,P){let sign=0;for(let i=0;i<4;i++){let v=cross(sub(P[(i+1)%4],P[i]),sub(p,P[i]));if(Math.abs(v)<1e-5)continue;if(sign&&v*sign<0)return false;sign=v;}return true;}
  function walls(b,W,H){const P=poly(b);for(const p of P){if(p.y>H)contact(b,null,{x:0,y:1},p.y-H,p);if(p.y<0)contact(b,null,{x:0,y:-1},-p.y,p);if(p.x<0)contact(b,null,{x:-1,y:0},-p.x,p);if(p.x>W)contact(b,null,{x:1,y:0},p.x-W,p);}}
  function step(dt){const W=field.clientWidth,H=field.clientHeight;for(const b of bodies){if(b.held){const d=drag;if(!d||d.b!==b)continue;const arm=rot(d.local,b.angle),at=add(b.pos,arm),err=sub(d.pointer,at);const pointVel=add(b.vel,{x:-b.omega*arm.y,y:b.omega*arm.x});const force={x:clamp(err.x*125-pointVel.x*22,-24000,24000),y:clamp(err.y*125-pointVel.y*22,-24000,24000)};b.vel.x+=force.x*b.inv*dt;b.vel.y+=force.y*b.inv*dt;b.omega+=cross(arm,force)*b.invI*dt;b.omega=clamp(b.omega,-10,10);}else{b.vel.y+=1800*dt;}b.vel.x*=Math.exp(-.48*dt);b.vel.y*=Math.exp(-.12*dt);b.omega*=Math.exp(-1.65*dt);b.pos.x+=b.vel.x*dt;b.pos.y+=b.vel.y*dt;b.angle+=b.omega*dt;}
   for(let pass=0;pass<5;pass++){for(const b of bodies)walls(b,W,H);for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++)collide(bodies[i],bodies[j]);}
   for(const b of bodies){if(b.held)continue;const floor=Math.max(...poly(b).map(p=>p.y));if(floor>=H-.9&&Math.abs(b.vel.y)<14){b.vel.y=0;if(Math.abs(b.vel.x)<3)b.vel.x=0;if(Math.abs(b.omega)<.04)b.omega=0;}}
  }
  function frame(t){const dt=Math.min(.033,(t-previous)/1000||.016);previous=t;const n=Math.max(1,Math.ceil(dt/.008));for(let i=0;i<n;i++)step(dt/n);bodies.forEach(draw);raf=requestAnimationFrame(frame);}
  function start(){if(!raf){previous=performance.now();raf=requestAnimationFrame(frame);}}
  function stop(){if(raf)cancelAnimationFrame(raf);raf=0;}
  function remove(b){const i=bodies.indexOf(b);if(i>=0)bodies.splice(i,1);if(drag?.b===b)drag=null;}
  function clear(){for(const b of bodies)b.el.remove();bodies.length=0;drag=null;stop();}
  function refit(){const W=field.clientWidth,H=field.clientHeight;for(const b of bodies){b.pos.x=clamp(b.pos.x,0,W);b.pos.y=clamp(b.pos.y,0,H);draw(b);}}
  return {spawn,add:addBody,remove,clear,refit,start,stop,grab:(b,e)=>down(e,b),setCallbacks:(grab,release)=>{onGrab=grab;onRelease=release;}};
 }
 window.createWordPhysics=create;
 const source=document.getElementById('sourcePhysics');if(source)window.sourcePhysics=create(source,'physics-chip',100);
})();
