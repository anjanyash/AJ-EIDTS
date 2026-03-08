import React, { useState, useEffect, useCallback, useRef } from "react";

const store = {
  async get(key){ try{ const r=await window.storage.get(key); return r?JSON.parse(r.value):null; }catch(e){ return null; } },
  async set(key,val){ try{ await window.storage.set(key,JSON.stringify(val)); }catch(e){} },
};

// Load EmailJS immediately
(()=>{
  if(document.querySelector('script[data-emailjs]')) return;
  const s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
  s.setAttribute('data-emailjs','1');
  s.onload=()=>{
    window.emailjs.init({publicKey:'ruNcl-TyQKP7m6jl_'});
    console.log('EmailJS ready ✅');
  };
  s.onerror=()=>console.error('EmailJS failed to load ❌');
  document.head.appendChild(s);
})();

async function sendBookingEmail(b) {
  return new Promise((resolve)=>{
    const attempt=(tries=0)=>{
      if(tries>10){ console.error('EmailJS never loaded'); resolve(false); return; }
      if(!window.emailjs || !window.emailjs.send){
        setTimeout(()=>attempt(tries+1), 600);
        return;
      }
      window.emailjs.send('service_9a87af3','template_bpy4fqz',{
        to_name: 'AJ',
        from_name: b.client_name,
        reply_to: b.client_email,
        booking_id: '#'+b.id.slice(-8),
        client_name: b.client_name,
        client_email: b.client_email,
        client_phone: b.phone||'Not provided',
        service: b.service,
        price: 'Rs.'+b.price,
        description: b.description||'—',
        drive_link: b.drive_link||'Not provided',
        contact_note: b.contact_note||'—',
        date: b.created_at,
        message: 'New booking: '+b.service+' by '+b.client_name+' ('+b.client_email+') — Rs.'+b.price+' — ID: #'+b.id.slice(-8),
        title: 'New Booking: '+b.service,
        name: b.client_name,
        email: b.client_email,
      }, 'ruNcl-TyQKP7m6jl_')
      .then(r=>{ console.log('Email sent ✅', r.status, r.text); resolve(true); })
      .catch(err=>{ console.error('EmailJS error ❌', err); resolve(false); });
    };
    attempt();
  });
}


const DB = {
  async register(email, password, name) {
    const users = await store.get('db:users') || [];
    if(users.find(u=>u.email===email.toLowerCase())) return { error: 'Email already registered.' };
    const user = { id:'u_'+Date.now(), name, email:email.toLowerCase(), password, role:'client', joined:new Date().toISOString().slice(0,10), avatar:name.charAt(0).toUpperCase(), token:'tok_'+Date.now() };
    users.push(user); await store.set('db:users', users); return { user };
  },
  async login(email, password) {
    const users = await store.get('db:users') || [];
    if(!users.find(u=>u.email==='ajedits1455@gmail.com')) {
      users.push({id:'admin_1',name:'AJ Admin',email:'ajedits1455@gmail.com',password:'admin123',role:'admin',joined:'2025-01-01',avatar:'A',token:'admin_token'});
      await store.set('db:users', users);
    }
    const user = users.find(u=>u.email===email.trim().toLowerCase()&&u.password===password.trim());
    if(!user) return { error: 'Invalid email or password.' };
    return { user };
  },
  async getBookings() { return await store.get('db:bookings') || []; },
  async getUserBookings(uid) { return (await store.get('db:bookings')||[]).filter(b=>b.user_id===uid); },
  async saveBooking(b) { const all=await store.get('db:bookings')||[]; all.unshift(b); await store.set('db:bookings',all); },
  async updateBookingStatus(id,status) {
    const all=await store.get('db:bookings')||[]; const i=all.findIndex(b=>b.id===id);
    if(i>-1){ all[i].status=status; await store.set('db:bookings',all); }
  },
  async deliverBooking(id,url,note) {
    const all=await store.get('db:bookings')||[]; const i=all.findIndex(b=>b.id===id);
    if(i>-1){ all[i].delivery_url=url; all[i].delivery_note=note; all[i].status='Completed'; await store.set('db:bookings',all); }
  },
  async rejectBooking(id,reason) {
    const all=await store.get('db:bookings')||[]; const i=all.findIndex(b=>b.id===id);
    if(i>-1){ all[i].status='Rejected'; all[i].reject_reason=reason||''; await store.set('db:bookings',all); }
  },
  async getPayments() { return await store.get('db:payments') || []; },
  async addPayment(p) { const all=await store.get('db:payments')||[]; all.unshift(p); await store.set('db:payments',all); },
  async updatePaymentStatus(bid,status) {
    const all=await store.get('db:payments')||[]; const i=all.findIndex(p=>p.booking_id===bid);
    if(i>-1){ all[i].status=status; await store.set('db:payments',all); }
  },
  async getSamples() {
    const s=await store.get('db:samples'); if(s) return s;
    const d=[{id:'s1',title:'Wedding Highlight',type:'Wedding',thumb:'🎬',added_on:'2025-01-10'},{id:'s2',title:'Birthday Reel',type:'Event',thumb:'🎉',added_on:'2025-02-14'},{id:'s3',title:'Brand Promo',type:'Promo',thumb:'📽️',added_on:'2025-03-01'},{id:'s4',title:'Instagram Pack',type:'Reel',thumb:'📱',added_on:'2025-04-05'}];
    await store.set('db:samples',d); return d;
  },
  async addSample(s) { const all=await store.get('db:samples')||[]; all.unshift(s); await store.set('db:samples',all); },
  async removeSample(id) { const all=await store.get('db:samples')||[]; await store.set('db:samples',all.filter(s=>s.id!==id)); },
  async getProfiles() { return (await store.get('db:users')||[]).filter(u=>u.role!=='admin'); },
  async getReviews() { return await store.get('db:reviews') || []; },
  async addReview(r) { const all=await store.get('db:reviews')||[]; all.unshift(r); await store.set('db:reviews',all); },
  async getNotifications() { return await store.get('db:notifications') || []; },
  async addNotification(n) { const all=await store.get('db:notifications')||[]; all.unshift(n); await store.set('db:notifications',all); },
  async clearNotifications() { await store.set('db:notifications',[]); },
  async changePassword(email, oldPass, newPass) {
    const users = await store.get('db:users') || [];
    const i = users.findIndex(u=>u.email===email&&u.password===oldPass);
    if(i===-1) return {error:'Current password is incorrect.'};
    users[i].password = newPass;
    await store.set('db:users', users);
    return {success:true};
  },
};

const G = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Syncopate:wght@400;700&family=Montserrat:wght@200;300;400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{--black:#000;--deep:#060608;--card:#0d0d10;--border:rgba(255,255,255,0.07);--gold:#c9a84c;--gold2:#e8d08a;--white:#f5f0e8;--dim:rgba(245,240,232,0.55);--green:#00c864;--yellow:#ffb400;}
  html{scroll-behavior:smooth;}
  body{background:var(--black);color:var(--white);font-family:'Montserrat',sans-serif;font-weight:300;overflow-x:hidden;}
  .fd{font-family:'Syncopate',sans-serif;}
  .fs{font-family:'Cormorant Garamond',serif;}
  .noise-bg{position:fixed;inset:0;opacity:0.025;pointer-events:none;z-index:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");}
  .card{position:relative;background:var(--card);border:1px solid var(--border);transition:border-color 0.3s;}
  .card:hover{border-color:rgba(201,168,76,0.2);}
  .section-label{display:flex;align-items:center;gap:12px;font-size:9px;letter-spacing:0.4em;color:var(--gold);font-family:'Montserrat';}
  .section-label::before{content:'';width:24px;height:1px;background:var(--gold);}
  .section-title{font-family:'Syncopate',sans-serif;font-size:clamp(28px,5vw,52px);font-weight:700;letter-spacing:0.08em;line-height:1.1;}
  .btn-primary{background:var(--gold);color:var(--black);border:none;padding:16px 40px;font-family:'Syncopate',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.25em;cursor:pointer;transition:all 0.3s;}
  .btn-primary:hover{background:var(--gold2);transform:translateY(-2px);}
  .btn-outline{background:transparent;color:var(--white);border:1px solid rgba(255,255,255,0.2);padding:16px 40px;font-family:'Syncopate',sans-serif;font-size:10px;letter-spacing:0.25em;cursor:pointer;transition:all 0.3s;}
  .btn-outline:hover{border-color:var(--gold);color:var(--gold);}
  .input-field{width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);color:var(--white);padding:14px 16px;font-family:'Montserrat';font-size:13px;outline:none;transition:border 0.3s;}
  .input-field:focus{border-color:rgba(201,168,76,0.5);}
  .input-field::placeholder{color:rgba(245,240,232,0.25);}
  .nav-link{background:none;border:none;color:var(--dim);font-family:'Montserrat';font-size:11px;letter-spacing:0.2em;cursor:pointer;transition:color 0.3s;padding:4px 0;}
  .nav-link:hover{color:var(--gold);}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
  @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
  @keyframes glow{0%,100%{opacity:1}50%{opacity:0.8}}
  @keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes bounceIn{0%{transform:scale(0)}60%{transform:scale(1.2)}100%{transform:scale(1)}}
  @media(max-width:640px){.nav-desktop{display:none!important;}.nav-mobile-btn{display:flex!important;}}
  @media(min-width:641px){.nav-mobile-btn{display:none!important;}.mobile-menu{display:none!important;}}
`;

function Particles() {
  const pts = Array.from({length:16},(_,i)=>({left:Math.random()*100,top:Math.random()*100,size:Math.random()*3+1,dur:Math.random()*6+4,delay:Math.random()*5}));
  return (
    <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none'}}>
      {pts.map((p,i)=>(
        <div key={i} style={{position:'absolute',left:p.left+'%',top:p.top+'%',width:p.size,height:p.size,borderRadius:'50%',background:'var(--gold)',opacity:0.25,animation:'pulse '+p.dur+'s ease-in-out infinite',animationDelay:p.delay+'s'}}/>
      ))}
    </div>
  );
}

function IntroScreen({onComplete}){
  const [ph,setPh]=useState(0);
  useEffect(()=>{
    const t=[setTimeout(()=>setPh(1),400),setTimeout(()=>setPh(2),1800),setTimeout(()=>setPh(3),3200),setTimeout(onComplete,4400)];
    return()=>t.forEach(clearTimeout);
  },[]);
  return(
    <div style={{position:'fixed',inset:0,zIndex:9999,background:'radial-gradient(ellipse at center,#0a0802 0%,#000 70%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',opacity:ph===3?0:1,transition:ph===3?'opacity 1.2s ease':'none'}}>
      <Particles/>
      <div style={{position:'absolute',top:0,left:0,right:0,height:'2px',background:'linear-gradient(90deg,transparent,var(--gold),transparent)',animation:'scanline 3s linear infinite',opacity:0.4}}/>
      {[400,500].map((sz,i)=><div key={i} style={{position:'absolute',width:sz+'px',height:sz+'px',border:'1px solid rgba(201,168,76,0.06)',borderRadius:'50%',animation:'spin '+(20+i*12)+'s linear infinite'+(i%2?' reverse':'')}}/>)}
      <div style={{textAlign:'center',position:'relative',zIndex:1}}>
        <div style={{opacity:ph>=1?1:0,transform:ph>=1?'scale(1)':'scale(0.5)',transition:'all 0.8s cubic-bezier(0.34,1.56,0.64,1)',marginBottom:'32px'}}>
          <div style={{width:'80px',height:'80px',border:'1px solid rgba(201,168,76,0.4)',margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'center',animation:ph>=1?'borderGlow 2s infinite':'none'}}>
            <span className="fd" style={{fontSize:'28px',fontWeight:700,color:'var(--gold)'}}>AJ</span>
          </div>
        </div>
        <p style={{fontFamily:'Montserrat',fontSize:'10px',fontWeight:500,letterSpacing:'0.5em',color:'rgba(245,240,232,0.4)',marginBottom:'20px',opacity:ph>=1?1:0,transition:'opacity 1s ease 0.3s'}}>WELCOME TO</p>
        <h1 className="fd" style={{fontSize:'clamp(48px,12vw,110px)',fontWeight:700,letterSpacing:'0.35em',color:'var(--white)',animation:'glowPulse 2s ease-in-out infinite',lineHeight:1,opacity:ph>=1?1:0,transition:'opacity 0.8s ease 0.5s'}}>AJ EDITS</h1>
        <div style={{marginTop:'24px',opacity:ph>=2?1:0,transform:ph>=2?'translateY(0)':'translateY(20px)',transition:'all 0.8s ease'}}>
          <p className="fs" style={{fontSize:'clamp(16px,3vw,22px)',fontStyle:'italic',color:'var(--gold)'}}>Turning Moments Into Cinematic Masterpieces</p>
        </div>
        <div style={{marginTop:'48px',width:'200px',height:'1px',background:'rgba(255,255,255,0.1)',margin:'48px auto 0',overflow:'hidden'}}>
          <div style={{height:'100%',background:'linear-gradient(90deg,transparent,var(--gold),transparent)',width:ph>=2?'100%':'0%',transition:'width 1.5s ease'}}/>
        </div>
      </div>
    </div>
  );
}


function Nav({setPage,page,user,setUser,newBookingsCount}) {
  const [sc,setSc]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  useEffect(()=>{const h=()=>setSc(window.scrollY>50);window.addEventListener('scroll',h);return()=>window.removeEventListener('scroll',h);},[]);
  const goTo=(id)=>{
    setMenuOpen(false);
    if(page!=='home'){setPage('home');setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth'}),120);}
    else{document.getElementById(id)?.scrollIntoView({behavior:'smooth'});}
  };
  const go=(p)=>{setMenuOpen(false);setPage(p);};
  return (
    <>
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:1000,padding:'16px clamp(20px,5vw,60px)',display:'flex',justifyContent:'space-between',alignItems:'center',background:sc||menuOpen?'rgba(6,6,8,0.97)':'transparent',backdropFilter:'blur(20px)',borderBottom:(sc||menuOpen)?'1px solid var(--border)':'none',transition:'all 0.4s'}}>
        <button onClick={()=>go('home')} style={{background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'baseline',gap:8}}>
          <span className="fd" style={{fontSize:18,fontWeight:700,color:'var(--gold)',letterSpacing:'0.2em'}}>AJ</span>
          <span className="fd" style={{fontSize:18,fontWeight:400,color:'var(--white)',letterSpacing:'0.2em'}}>EDITS</span>
        </button>
        {/* Desktop nav */}
        <div className="nav-desktop" style={{display:'flex',gap:28,alignItems:'center'}}>
          {['services','pricing'].map(s=>(
            <button key={s} className="nav-link" onClick={()=>goTo(s)}>{s.toUpperCase()}</button>
          ))}
          {!user?(
            <button className="btn-primary" style={{padding:'10px 24px',fontSize:9}} onClick={()=>go('login')}>BOOK NOW</button>
          ):(
            <div style={{display:'flex',gap:12,alignItems:'center'}}>
              <button className="nav-link" style={{position:'relative'}} onClick={()=>go(user.role==='admin'?'admin':'dashboard')}>
                DASHBOARD
                {user.role==='admin'&&newBookingsCount>0&&(
                  <span style={{position:'absolute',top:-6,right:-10,background:'#ff6b6b',color:'#fff',fontSize:8,fontWeight:700,borderRadius:'50%',width:16,height:16,display:'flex',alignItems:'center',justifyContent:'center',animation:'bounceIn 0.4s ease'}}>{newBookingsCount}</span>
                )}
              </button>
              <button className="btn-outline" style={{padding:'8px 18px',fontSize:9}} onClick={()=>{setUser(null);go('home');}}>LOGOUT</button>
            </div>
          )}
        </div>
        {/* Mobile hamburger */}
        <button className="nav-mobile-btn" onClick={()=>setMenuOpen(v=>!v)} style={{background:'none',border:'none',cursor:'pointer',padding:4,flexDirection:'column',gap:5,display:'none'}}>
          <span style={{display:'block',width:22,height:2,background:'var(--gold)',transition:'all 0.3s',transform:menuOpen?'rotate(45deg) translate(5px,5px)':'none'}}/>
          <span style={{display:'block',width:22,height:2,background:'var(--gold)',transition:'all 0.3s',opacity:menuOpen?0:1}}/>
          <span style={{display:'block',width:22,height:2,background:'var(--gold)',transition:'all 0.3s',transform:menuOpen?'rotate(-45deg) translate(5px,-5px)':'none'}}/>
        </button>
      </nav>
      {/* Mobile dropdown menu */}
      {menuOpen&&(
        <div className="mobile-menu" style={{position:'fixed',top:56,left:0,right:0,zIndex:999,background:'rgba(6,6,8,0.98)',borderBottom:'1px solid var(--border)',padding:'24px clamp(20px,5vw,40px)',display:'flex',flexDirection:'column',gap:4,animation:'slideDown 0.2s ease'}}>
          {['services','pricing'].map(s=>(
            <button key={s} className="nav-link" style={{padding:'14px 0',fontSize:13,borderBottom:'1px solid var(--border)'}} onClick={()=>goTo(s)}>{s.toUpperCase()}</button>
          ))}
          {!user?(
            <button className="btn-primary" style={{marginTop:16,width:'100%'}} onClick={()=>go('login')}>BOOK NOW</button>
          ):(
            <>
              <button className="nav-link" style={{padding:'14px 0',fontSize:13,borderBottom:'1px solid var(--border)',position:'relative',textAlign:'left'}} onClick={()=>go(user.role==='admin'?'admin':'dashboard')}>
                DASHBOARD {user.role==='admin'&&newBookingsCount>0&&<span style={{marginLeft:8,background:'#ff6b6b',color:'#fff',fontSize:9,fontWeight:700,borderRadius:10,padding:'2px 7px'}}>{newBookingsCount} NEW</span>}
              </button>
              <button className="btn-outline" style={{marginTop:16,width:'100%'}} onClick={()=>{setUser(null);go('home');}}>LOGOUT</button>
            </>
          )}
        </div>
      )}
    </>
  );
}

function Hero({setPage}) {
  const [vis,setVis]=useState(false);
  useEffect(()=>{setTimeout(()=>setVis(true),100);},[]);
  return (
    <section id="home" style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'120px clamp(20px,8vw,120px) 80px',position:'relative',overflow:'hidden',background:'radial-gradient(ellipse at 50% 60%,rgba(201,168,76,0.04),transparent 70%)'}}>
      <Particles/>
      <div style={{textAlign:'center',position:'relative',zIndex:1}}>
        <div style={{opacity:vis?1:0,transform:vis?'none':'translateY(20px)',transition:'all 0.8s ease',marginBottom:24}}>
          <span className="section-label" style={{justifyContent:'center'}}>Cinematic Video Editing Studio</span>
        </div>
        <h1 className="fd" style={{fontSize:'clamp(36px,10vw,88px)',fontWeight:700,letterSpacing:'0.06em',lineHeight:1.05,marginBottom:32,
          background:'linear-gradient(135deg,var(--white) 0%,var(--gold) 40%,var(--white) 60%,var(--gold2) 100%)',backgroundSize:'200% auto',
          WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',animation:'shimmer 6s linear infinite',
          opacity:vis?1:0,transform:vis?'none':'translateY(40px)',transition:'opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s'}}>
          TURNING MOMENTS<br/>INTO MASTERPIECES
        </h1>
        <p className="fs" style={{fontSize:'clamp(16px,2.5vw,22px)',fontStyle:'italic',color:'var(--dim)',maxWidth:560,margin:'0 auto 48px',opacity:vis?1:0,transform:vis?'none':'translateY(20px)',transition:'all 0.8s ease 0.4s'}}>
          Premium cinematic editing — weddings, reels, promos and more
        </p>
        <div style={{display:'flex',gap:16,justifyContent:'center',flexWrap:'wrap',opacity:vis?1:0,transition:'opacity 0.8s ease 0.6s'}}>
          <button className="btn-primary" onClick={()=>setPage('login')}>BOOK A PROJECT</button>
          <button className="btn-outline" onClick={()=>document.getElementById('services')?.scrollIntoView({behavior:'smooth'})}>OUR SERVICES</button>
        </div>
        <div style={{marginTop:64,display:'flex',gap:48,justifyContent:'center',flexWrap:'wrap',opacity:vis?1:0,transition:'opacity 0.8s ease 0.8s'}}>
          {[['500+','Projects'],['100%','Satisfaction'],['5 Star','Rating']].map(([v,l])=>(
            <div key={l} style={{textAlign:'center'}}>
              <div className="fd" style={{fontSize:'clamp(20px,4vw,32px)',color:'var(--gold)',fontWeight:700}}>{v}</div>
              <div style={{fontSize:10,letterSpacing:'0.3em',color:'var(--dim)',marginTop:4}}>{l.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BeforeAfter() {
  const [pos,setPos]=useState(50);
  const [drag,setDrag]=useState(false);
  const [tab,setTab]=useState(0);
  const ref=useRef(null);
  const pairs=[
    {label:'Wedding',bColor:'#1a0a0a',aColor:'#0a0014',bTxt:'RAW FOOTAGE',aTxt:'CINEMATIC EDIT',bIcon:'📹',aIcon:'🎬'},
    {label:'Reel',bColor:'#0a1a0a',aColor:'#00001a',bTxt:'BASIC CLIP',aTxt:'VIRAL REEL',bIcon:'📱',aIcon:'✨'},
    {label:'Photo',bColor:'#1a1a0a',aColor:'#0a000a',bTxt:'ORIGINAL',aTxt:'COLOUR GRADED',bIcon:'📷',aIcon:'🖼️'},
  ];
  const move=e=>{
    if(!drag && e.type==='mousemove') return;
    const r=ref.current?.getBoundingClientRect(); if(!r) return;
    const x=((e.touches?e.touches[0].clientX:e.clientX)-r.left)/r.width*100;
    setPos(Math.min(98,Math.max(2,x)));
  };
  const p=pairs[tab];
  return (
    <section style={{padding:'clamp(60px,8vw,100px) clamp(20px,5vw,80px)',background:'linear-gradient(to bottom,rgba(201,168,76,0.02),transparent)'}}>
      <div style={{textAlign:'center',marginBottom:52}}>
        <span className="section-label" style={{justifyContent:'center'}}>See The Difference</span>
        <h2 className="section-title" style={{marginTop:20}}>BEFORE &amp; AFTER</h2>
        <p className="fs" style={{fontStyle:'italic',color:'var(--dim)',marginTop:12,fontSize:16}}>Drag to reveal the transformation</p>
      </div>
      <div style={{display:'flex',justifyContent:'center',gap:12,marginBottom:28,flexWrap:'wrap'}}>
        {pairs.map((pair,i)=>(
          <button key={i} onClick={()=>{setTab(i);setPos(50);}} style={{padding:'10px 24px',fontSize:10,letterSpacing:'0.2em',fontFamily:'Montserrat',fontWeight:500,cursor:'pointer',transition:'all 0.3s',background:tab===i?'rgba(201,168,76,0.15)':'transparent',border:'1px solid '+(tab===i?'rgba(201,168,76,0.4)':'var(--border)'),color:tab===i?'var(--gold)':'var(--dim)'}}>
            {pair.label.toUpperCase()}
          </button>
        ))}
      </div>
      <div style={{maxWidth:800,margin:'0 auto',userSelect:'none'}}>
        <div ref={ref} style={{position:'relative',height:380,overflow:'hidden',cursor:'col-resize',border:'1px solid var(--border)'}}
          onMouseMove={move} onMouseDown={()=>setDrag(true)} onMouseUp={()=>setDrag(false)} onMouseLeave={()=>setDrag(false)}
          onTouchMove={move} onTouchStart={()=>setDrag(true)} onTouchEnd={()=>setDrag(false)}>
          <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 30% 50%,'+p.bColor+',#000)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
            <div style={{fontSize:72}}>{p.bIcon}</div>
            <div className="fd" style={{fontSize:12,letterSpacing:'0.3em',color:'rgba(255,255,255,0.35)',fontWeight:700}}>{p.bTxt}</div>
          </div>
          <div style={{position:'absolute',inset:0,clipPath:'inset(0 '+(100-pos)+'% 0 0)',background:'radial-gradient(ellipse at 70% 50%,'+p.aColor+',#000)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
            <div style={{fontSize:72,filter:'drop-shadow(0 0 20px rgba(201,168,76,0.5))'}}>{p.aIcon}</div>
            <div className="fd" style={{fontSize:12,letterSpacing:'0.3em',color:'var(--gold)',fontWeight:700}}>{p.aTxt}</div>
          </div>
          <div style={{position:'absolute',top:0,bottom:0,left:pos+'%',width:2,background:'var(--gold)',boxShadow:'0 0 12px rgba(201,168,76,0.8)',transform:'translateX(-50%)',pointerEvents:'none'}}>
            <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:40,height:40,borderRadius:'50%',background:'var(--gold)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 20px rgba(201,168,76,0.6)'}}>
              <span style={{fontSize:14,color:'#000',fontWeight:700}}>||</span>
            </div>
          </div>
          <div style={{position:'absolute',top:14,left:14,fontSize:9,letterSpacing:'0.2em',color:'rgba(255,255,255,0.4)',fontFamily:'Montserrat',fontWeight:600,background:'rgba(0,0,0,0.6)',padding:'4px 10px'}}>BEFORE</div>
          <div style={{position:'absolute',top:14,right:14,fontSize:9,letterSpacing:'0.2em',color:'var(--gold)',fontFamily:'Montserrat',fontWeight:600,background:'rgba(0,0,0,0.6)',padding:'4px 10px'}}>AFTER</div>
        </div>
      </div>
    </section>
  );
}

const SERVICES=[
  {icon:'🎬',title:'Video Editing',desc:'Professional cuts, colour grading, motion graphics and cinematic transitions.'},
  {icon:'📱',title:'Instagram Reels',desc:'Viral-ready short-form content with trending music, effects and transitions.'},
  {icon:'🖼️',title:'Photo & Thumbnail',desc:'Striking thumbnails and photo edits that grab attention instantly.'},
  {icon:'💍',title:'Wedding Song Edit',desc:'Emotional highlight films set to music that tell your love story.'},
  {icon:'🎞️',title:'Promo Video',desc:'High-impact promotional videos for brands and products that convert.'},
  {icon:'💫',title:'WhatsApp Status',desc:'Short cinematic clips optimised for WhatsApp status.'},
  {icon:'👰',title:'Wedding Shoot',desc:'Full wedding shoot editing with colour correction and cinematic output.'},
  {icon:'🎉',title:'Event Editing',desc:'Half saree, birthday and special events edited with elegance.'},
];

function Services() {
  return (
    <section id="services" style={{padding:'clamp(80px,10vw,120px) clamp(20px,5vw,80px)',background:'linear-gradient(to bottom,transparent,rgba(201,168,76,0.02) 50%,transparent)'}}>
      <div style={{textAlign:'center',marginBottom:64}}>
        <span className="section-label" style={{justifyContent:'center'}}>What We Offer</span>
        <h2 className="section-title" style={{marginTop:20}}>OUR SERVICES</h2>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:24}}>
        {SERVICES.map((s,i)=>(
          <div key={i} className="card" style={{padding:'48px 44px',display:'flex',alignItems:'flex-start',gap:32}}>
            <div style={{fontSize:52,flexShrink:0,animation:'float 4s ease-in-out infinite',animationDelay:i*0.3+'s',lineHeight:1}}>{s.icon}</div>
            <div>
              <h3 className="fd" style={{fontSize:13,fontWeight:700,letterSpacing:'0.15em',marginBottom:12}}>{s.title.toUpperCase()}</h3>
              <p style={{fontSize:14,color:'var(--dim)',lineHeight:1.8,fontWeight:300}}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const DEF_REVIEWS=[
  {id:'r1',name:'Priya Sharma',service:'Wedding Song Edit',rating:5,text:'AJ transformed our wedding video into a masterpiece. Every moment felt magical. Highly recommend!',date:'2025-02-10',avatar:'P'},
  {id:'r2',name:'Rahul Verma',service:'Instagram Reels',rating:5,text:'Our brand reels went viral after AJ edited them. 10x engagement! Professional, fast, and creative.',date:'2025-03-05',avatar:'R'},
  {id:'r3',name:'Sneha Patel',service:'Wedding Shoot',rating:5,text:'Outstanding work on our wedding highlights. AJ captured every emotion beautifully. 100% satisfied!',date:'2025-01-20',avatar:'S'},
  {id:'r4',name:'Arjun Nair',service:'Promo Editing',rating:5,text:'Our product promo video got us 50+ new clients. AJ knows how to make content that converts!',date:'2025-03-18',avatar:'A'},
];

function Testimonials() {
  const [reviews,setReviews]=useState(DEF_REVIEWS);
  const [active,setActive]=useState(0);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({name:'',service:'',rating:5,text:''});
  const [submitted,setSubmitted]=useState(false);
  useEffect(()=>{ DB.getReviews().then(r=>{ if(r&&r.length>0) setReviews([...DEF_REVIEWS,...r]); }); },[]);
  useEffect(()=>{ const t=setInterval(()=>setActive(a=>(a+1)%DEF_REVIEWS.length),4000); return()=>clearInterval(t); },[]);
  const stars=n=>Array.from({length:5},(_,i)=><span key={i} style={{color:i<n?'var(--gold)':'rgba(255,255,255,0.15)',fontSize:16}}>★</span>);
  const submit=async()=>{
    if(!form.name||!form.text) return;
    const r={id:'r_'+Date.now(),...form,date:new Date().toISOString().slice(0,10),avatar:form.name.charAt(0).toUpperCase()};
    await DB.addReview(r); setReviews(p=>[r,...p]);
    setSubmitted(true); setShowForm(false); setForm({name:'',service:'',rating:5,text:''});
  };
  const rev=reviews[active]||DEF_REVIEWS[0];
  return (
    <section style={{padding:'clamp(60px,8vw,100px) clamp(20px,5vw,80px)'}}>
      <div style={{textAlign:'center',marginBottom:52}}>
        <span className="section-label" style={{justifyContent:'center'}}>Client Stories</span>
        <h2 className="section-title" style={{marginTop:20}}>TESTIMONIALS</h2>
      </div>
      <div style={{maxWidth:800,margin:'0 auto 40px'}}>
        <div className="card" style={{padding:48,textAlign:'center'}}>
          <div className="fs" style={{fontSize:64,color:'rgba(201,168,76,0.15)',lineHeight:1,marginBottom:8}}>"</div>
          <p className="fs" style={{fontSize:'clamp(15px,2.5vw,20px)',fontStyle:'italic',color:'var(--white)',lineHeight:1.8,maxWidth:580,margin:'0 auto 24px'}}>{rev.text}</p>
          <div style={{display:'flex',gap:4,justifyContent:'center',marginBottom:16}}>{stars(rev.rating)}</div>
          <div style={{display:'flex',alignItems:'center',gap:12,justifyContent:'center'}}>
            <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,var(--gold),var(--gold2))',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Syncopate',fontSize:16,color:'#000',fontWeight:700}}>{rev.avatar}</div>
            <div style={{textAlign:'left'}}>
              <div className="fd" style={{fontSize:11,letterSpacing:'0.1em'}}>{rev.name}</div>
              <div style={{fontSize:10,color:'var(--gold)',marginTop:2}}>{rev.service}</div>
            </div>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'center',gap:8,marginTop:16}}>
          {DEF_REVIEWS.map((_,i)=><button key={i} onClick={()=>setActive(i)} style={{width:i===active?24:8,height:8,borderRadius:4,background:i===active?'var(--gold)':'rgba(201,168,76,0.2)',border:'none',cursor:'pointer',transition:'all 0.3s'}}/>)}
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16,marginBottom:32}}>
        {reviews.slice(0,4).map((r,i)=>(
          <div key={i} className="card" style={{padding:24,opacity:i===active?1:0.6,transition:'opacity 0.3s',cursor:'pointer'}} onClick={()=>setActive(i)}>
            <div style={{display:'flex',gap:4,marginBottom:10}}>{stars(r.rating)}</div>
            <p style={{fontSize:13,color:'var(--dim)',lineHeight:1.6,marginBottom:14,fontStyle:'italic'}}>"{r.text.slice(0,80)}..."</p>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,var(--gold),var(--gold2))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:'#000',fontWeight:700,fontFamily:'Syncopate',flexShrink:0}}>{r.avatar}</div>
              <div>
                <div style={{fontSize:11,fontWeight:500}}>{r.name}</div>
                <div style={{fontSize:10,color:'var(--gold)'}}>{r.service}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!showForm&&!submitted&&<div style={{textAlign:'center'}}><button className="btn-outline" onClick={()=>setShowForm(true)}>LEAVE A REVIEW</button></div>}
      {submitted&&<div style={{textAlign:'center',color:'var(--green)',fontSize:13}}>Thank you for your review!</div>}
      {showForm&&(
        <div style={{maxWidth:480,margin:'0 auto'}}>
          <div className="card" style={{padding:32}}>
            <h3 className="fd" style={{fontSize:13,marginBottom:20,letterSpacing:'0.15em'}}>SHARE YOUR EXPERIENCE</h3>
            <input className="input-field" placeholder="Your name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={{marginBottom:12}}/>
            <input className="input-field" placeholder="Service received" value={form.service} onChange={e=>setForm(f=>({...f,service:e.target.value}))} style={{marginBottom:12}}/>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10,color:'var(--dim)',letterSpacing:'0.2em',marginBottom:8}}>RATING</div>
              <div style={{display:'flex',gap:8}}>{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setForm(f=>({...f,rating:n}))} style={{background:'none',border:'none',cursor:'pointer',fontSize:24,color:n<=form.rating?'var(--gold)':'rgba(255,255,255,0.15)',transition:'color 0.2s'}}>★</button>)}</div>
            </div>
            <textarea className="input-field" rows={3} placeholder="Tell us about your experience..." value={form.text} onChange={e=>setForm(f=>({...f,text:e.target.value}))} style={{marginBottom:16,resize:'vertical'}}/>
            <div style={{display:'flex',gap:12}}>
              <button className="btn-primary" style={{flex:1}} onClick={submit}>SUBMIT</button>
              <button className="btn-outline" style={{padding:'14px 20px'}} onClick={()=>setShowForm(false)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const PRICING=[
  {name:'Any Editing',desc:'Photo, Thumbnail, etc.',price:20,tag:'STARTER'},
  {name:'Video Edit',desc:'Short to mid-length video',price:100,tag:'POPULAR',highlight:true},
  {name:'Reel Editing',desc:'Instagram / Short Reels',price:50},
  {name:'Promo Editing',desc:'Brand / Product Promo',price:200},
  {name:'Wedding Song',desc:'Song highlight film',price:500},
  {name:'WhatsApp Status',desc:'Short cinematic clips',price:500},
  {name:'Wedding Shoot',desc:'Full wedding production',price:15000,tag:'PREMIUM'},
  {name:'Events',desc:'Half Saree / Birthday',price:15000,tag:'STARTING AT'},
];

function Pricing({setPage}) {
  return (
    <section id="pricing" style={{padding:'clamp(80px,10vw,120px) clamp(20px,5vw,80px)'}}>
      <div style={{textAlign:'center',marginBottom:64}}>
        <span className="section-label" style={{justifyContent:'center'}}>Transparent Pricing</span>
        <h2 className="section-title" style={{marginTop:20}}>PACKAGES</h2>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:24}}>
        {PRICING.map((p,i)=>(
          <div key={i} className="card" style={{padding:'48px 44px',background:p.highlight?'linear-gradient(135deg,#0d0b05,#14110a)':'var(--card)',border:'1px solid '+(p.highlight?'rgba(201,168,76,0.35)':'var(--border)')}}>
            {p.tag&&<div style={{position:'absolute',top:18,right:18,background:p.highlight?'var(--gold)':'rgba(201,168,76,0.12)',color:p.highlight?'#000':'var(--gold)',fontSize:8,fontWeight:600,letterSpacing:'0.2em',padding:'5px 12px',fontFamily:'Montserrat'}}>{p.tag}</div>}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:20}}>
              <div style={{flex:1}}>
                <h3 className="fd" style={{fontSize:14,fontWeight:700,letterSpacing:'0.15em',color:p.highlight?'var(--gold)':'var(--white)',marginBottom:10}}>{p.name.toUpperCase()}</h3>
                <p style={{fontSize:13,color:'var(--dim)',fontWeight:300,lineHeight:1.6,maxWidth:280}}>{p.desc}</p>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:4,justifyContent:'flex-end'}}>
                  <span style={{fontSize:16,color:'var(--gold)',marginTop:8}}>Rs.</span>
                  <span className="fd" style={{fontSize:52,fontWeight:700,color:p.highlight?'var(--gold)':'var(--white)',lineHeight:1}}>{p.price>=1000?(p.price/1000)+'K':p.price}</span>
                </div>
                <div style={{fontSize:10,color:'rgba(245,240,232,0.3)',letterSpacing:'0.15em',marginTop:4}}>{p.price>=15000?'ONWARDS':'PER PROJECT'}</div>
              </div>
            </div>
            <div style={{marginTop:32,borderTop:'1px solid var(--border)',paddingTop:24}}>
              <button className={p.highlight?'btn-primary':'btn-outline'} style={{fontSize:10,padding:'12px 32px'}} onClick={()=>setPage('login')}>BOOK NOW</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Login({setPage,setUser}) {
  const [mode,setMode]=useState('login');
  const [email,setEmail]=useState('');
  const [pass,setPass]=useState('');
  const [name,setName]=useState('');
  const [conf,setConf]=useState('');
  const [err,setErr]=useState('');
  const [ok,setOk]=useState('');
  const [loading,setLoading]=useState(false);
  const [showPw,setShowPw]=useState(false);
  const handle=async()=>{
    setErr('');setOk('');setLoading(true);
    const trimEmail=email.trim().toLowerCase();
    const trimPass=pass.trim();
    if(!trimEmail){setErr('Please enter your email.');setLoading(false);return;}
    if(!trimPass){setErr('Please enter your password.');setLoading(false);return;}
    if(mode==='login'){
      const res=await DB.login(trimEmail,trimPass);
      if(res.error){setErr(res.error);}else{setUser(res.user);setPage(res.user.role==='admin'?'admin':'dashboard');}
    } else {
      if(!name.trim()){setErr('Name is required.');setLoading(false);return;}
      if(trimPass!==conf.trim()){setErr('Passwords do not match.');setLoading(false);return;}
      if(trimPass.length<6){setErr('Password must be at least 6 characters.');setLoading(false);return;}
      const res=await DB.register(trimEmail,trimPass,name.trim());
      if(res.error){setErr(res.error);}else{setOk('Account created! You can now sign in.');setMode('login');}
    }
    setLoading(false);
  };
  return (
    <div style={{minHeight:'100vh',display:'grid',gridTemplateColumns:'1fr 1fr',background:'var(--black)'}}>
      <div style={{background:'linear-gradient(135deg,#050503,#0d0a04)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:60,position:'relative',overflow:'hidden',borderRight:'1px solid var(--border)'}}>
        <Particles/>
        <div style={{position:'relative',zIndex:1,textAlign:'center'}}>
          <div className="fd" style={{fontSize:48,fontWeight:700,color:'var(--gold)',letterSpacing:'0.2em',marginBottom:8}}>AJ</div>
          <div className="fd" style={{fontSize:20,letterSpacing:'0.5em',color:'var(--white)',marginBottom:32}}>EDITS</div>
          <p className="fs" style={{fontStyle:'italic',color:'var(--dim)',fontSize:18,lineHeight:1.8,maxWidth:300}}>Every frame tells a story. Let us tell yours.</p>
          <div style={{marginTop:40,display:'flex',gap:24,justifyContent:'center'}}>
            {[['500+','Projects'],['100%','Happy'],['5 Star','Rated']].map(([v,l])=>(
              <div key={l} style={{textAlign:'center'}}>
                <div className="fd" style={{fontSize:20,color:'var(--gold)',fontWeight:700}}>{v}</div>
                <div style={{fontSize:9,letterSpacing:'0.3em',color:'var(--dim)',marginTop:4}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:60}}>
        <div style={{width:'100%',maxWidth:400}}>
          <div style={{display:'flex',gap:4,marginBottom:32,borderBottom:'1px solid var(--border)'}}>
            {['login','register'].map(m=>(
              <button key={m} onClick={()=>{setMode(m);setErr('');setOk('');}} style={{flex:1,background:'none',border:'none',padding:12,fontSize:10,letterSpacing:'0.2em',fontFamily:'Syncopate',fontWeight:700,cursor:'pointer',color:mode===m?'var(--gold)':'var(--dim)',borderBottom:'2px solid '+(mode===m?'var(--gold)':'transparent'),transition:'all 0.3s',marginBottom:-1}}>
                {m.toUpperCase()}
              </button>
            ))}
          </div>
          {err&&<div style={{padding:'12px 16px',background:'rgba(255,107,107,0.1)',border:'1px solid rgba(255,107,107,0.3)',color:'#ff6b6b',fontSize:12,marginBottom:16}}>{err}</div>}
          {ok&&<div style={{padding:'12px 16px',background:'rgba(0,200,100,0.1)',border:'1px solid rgba(0,200,100,0.3)',color:'var(--green)',fontSize:12,marginBottom:16}}>{ok}</div>}
          {mode==='register'&&<input className="input-field" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} style={{marginBottom:12}}/>}
          <input className="input-field" placeholder="Email address" type="email" value={email} onChange={e=>setEmail(e.target.value)} style={{marginBottom:12}}/>
          <div style={{position:'relative',marginBottom:12}}>
            <input className="input-field" placeholder="Password" type={showPw?'text':'password'} value={pass} onChange={e=>setPass(e.target.value)} style={{paddingRight:48}}/>
            <button onClick={()=>setShowPw(v=>!v)} style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--dim)',cursor:'pointer',padding:4,display:'flex',alignItems:'center'}}>
              {showPw
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              }
            </button>
          </div>
          {mode==='register'&&<input className="input-field" placeholder="Confirm password" type="password" value={conf} onChange={e=>setConf(e.target.value)} style={{marginBottom:12}}/>}
          <button className="btn-primary" style={{width:'100%',marginBottom:16}} onClick={handle} disabled={loading}>
            {loading?'LOADING...':(mode==='login'?'SIGN IN':'CREATE ACCOUNT')}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentStep({lastB,user,setBookings,setPayStep,setTab,setForm}) {
  const [payMethod,setPayMethod]=useState('');
  const [file,setFile]=useState(null);
  const [verified,setVerified]=useState('');
  const [done,setDone]=useState(false);
  const [msg,setMsg]=useState('');
  const [submitting,setSubmitting]=useState(false);
  const verify=f=>{
    const n=f.name.toLowerCase();
    const kw=['screenshot','gpay','phonepe','paytm','upi','pay','img','photo','whatsapp'];
    const hasKw=kw.some(k=>n.includes(k))||/^[0-9]+\.(jpg|jpeg|png)$/.test(n);
    if(f.size<5*1024) return 'fake';
    if(f.size>15*1024*1024) return 'unknown';
    if(hasKw) return 'real';
    return 'unknown';
  };
  const submit=async()=>{
    setSubmitting(true);
    if(payMethod==='now'){
      if(!file){setMsg('Please upload payment screenshot.');setSubmitting(false);return;}
      const v=verify(file);setVerified(v);
      const status=v==='real'?'Payment Received':v==='fake'?'Pending Payment':'Payment Under Review';
      await DB.updateBookingStatus(lastB.id,status);
      await DB.updatePaymentStatus(lastB.id,v==='real'?'Paid':'Pending');
      setBookings(p=>p.map(b=>b.id===lastB.id?{...b,status}:b));
    } else {
      await DB.updateBookingStatus(lastB.id,'Work Pending');
      setBookings(p=>p.map(b=>b.id===lastB.id?{...b,status:'Work Pending'}:b));
    }
    setDone(true);setSubmitting(false);
  };
  if(done) return (
    <div style={{maxWidth:520}}>
      <div className="card" style={{padding:40,textAlign:'center'}}>
        <div style={{fontSize:64,marginBottom:16}}>🎉</div>
        <h3 className="fd" style={{fontSize:15,letterSpacing:'0.15em',marginBottom:12,color:'var(--gold)'}}>{payMethod==='after'?'BOOKING CONFIRMED!':'PAYMENT SUBMITTED!'}</h3>
        <p style={{fontSize:13,color:'var(--dim)',lineHeight:1.8,marginBottom:24}}>
          {payMethod==='after'?'AJ will start work and collect payment on delivery.':verified==='real'?'Payment verified! AJ will start your project shortly.':'Screenshot submitted for admin review.'}
        </p>
        <div style={{background:'rgba(201,168,76,0.06)',border:'1px solid rgba(201,168,76,0.2)',padding:20,marginBottom:16,textAlign:'left'}}>
          <div style={{fontSize:10,letterSpacing:'0.25em',color:'var(--dim)',marginBottom:8}}>YOUR BOOKING ID</div>
          <div style={{fontFamily:'monospace',fontSize:22,color:'var(--gold)',letterSpacing:'0.15em',marginBottom:10}}>#{lastB.id.slice(-8)}</div>
          <div style={{fontSize:11,color:'var(--dim)',lineHeight:1.7}}>Save this ID to track your booking in My Bookings.</div>
        </div>
        <div style={{background:'rgba(0,200,100,0.05)',border:'1px solid rgba(0,200,100,0.2)',padding:'14px 18px',marginBottom:24,textAlign:'left',display:'flex',gap:12,alignItems:'flex-start'}}>
          <span style={{fontSize:20}}>📧</span>
          <div>
            <div style={{fontSize:10,letterSpacing:'0.2em',color:'var(--green)',marginBottom:4}}>BOOKING CONFIRMATION</div>
            <div style={{fontSize:12,color:'var(--dim)',lineHeight:1.6}}>Your booking ID is <span style={{color:'var(--gold)',fontFamily:'monospace'}}>#{lastB.id.slice(-8)}</span>. Track your project status anytime from the dashboard. For any queries email us at <a href="mailto:ajedits1455@gmail.com" style={{color:'var(--gold)',textDecoration:'none'}}>ajedits1455@gmail.com</a></div>
          </div>
        </div>
        <button className="btn-primary" style={{width:'100%'}} onClick={()=>{setPayStep(false);setTab('my bookings');setForm({service:'',desc:'',fileName:'',imgName:'',videoFile:null,imageFile:null,driveLink:'',phone:'',contactNote:''});}}>VIEW MY BOOKINGS</button>
      </div>
    </div>
  );
  return (
    <div style={{maxWidth:560}}>
      <div className="card" style={{padding:40}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontSize:40,marginBottom:12}}>💳</div>
          <h3 className="fd" style={{fontSize:15,letterSpacing:'0.15em',marginBottom:6}}>PAYMENT OPTIONS</h3>
          <p style={{color:'var(--green)',fontSize:12}}>Booking #{lastB.id.slice(-6)} saved!</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:28}}>
          {[{id:'now',icon:'💰',title:'PAY NOW',desc:'Pay first, we start immediately',color:'var(--gold)'},{id:'after',icon:'🤝',title:'PAY AFTER WORK',desc:'We start, you pay on delivery',color:'var(--green)'}].map(opt=>(
            <div key={opt.id} onClick={()=>setPayMethod(opt.id)} style={{padding:24,border:'1px solid '+(payMethod===opt.id?opt.color:'var(--border)'),background:payMethod===opt.id?'rgba(201,168,76,0.05)':'transparent',cursor:'pointer',textAlign:'center',transition:'all 0.3s'}}>
              <div style={{fontSize:32,marginBottom:10}}>{opt.icon}</div>
              <div className="fd" style={{fontSize:10,fontWeight:700,letterSpacing:'0.15em',color:payMethod===opt.id?opt.color:'var(--white)',marginBottom:6}}>{opt.title}</div>
              <div style={{fontSize:11,color:'var(--dim)',lineHeight:1.5}}>{opt.desc}</div>
            </div>
          ))}
        </div>
        {payMethod==='now'&&(
          <div style={{padding:20,background:'rgba(255,255,255,0.02)',border:'1px solid var(--border)',marginBottom:16}}>
            <p style={{fontSize:12,color:'var(--gold)',marginBottom:8,letterSpacing:'0.1em'}}>UPI ID: ajEdits@upi</p>
            <p style={{fontSize:11,color:'var(--dim)',marginBottom:16,lineHeight:1.6}}>Amount: Rs.{lastB.price} — Pay and upload screenshot below.</p>
            <label style={{display:'block',padding:'12px 16px',border:'1px dashed rgba(201,168,76,0.3)',cursor:'pointer',textAlign:'center',fontSize:12,color:'var(--dim)'}}>
              {file?'Done: '+file.name:'Upload payment screenshot'}
              <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{if(e.target.files[0]) setFile(e.target.files[0]);}}/>
            </label>
          </div>
        )}
        {msg&&<div style={{color:'#ff6b6b',fontSize:12,marginBottom:12}}>{msg}</div>}
        {payMethod&&<button className="btn-primary" style={{width:'100%'}} onClick={submit} disabled={submitting}>{submitting?'PROCESSING...':'CONFIRM BOOKING'}</button>}
      </div>
    </div>
  );
}

function ClientDashboard({user,setPage}) {
  const [tab,setTab]=useState('samples');
  const [bookings,setBookings]=useState([]);
  const [samples,setSamples]=useState([]);
  const [payStep,setPayStep]=useState(false);
  const [lastB,setLastB]=useState(null);
  const [form,setForm]=useState({service:'',desc:'',fileName:'',imgName:'',videoFile:null,imageFile:null,driveLink:'',phone:'',contactNote:''});
  const [msg,setMsg]=useState('');
  const [saving,setSaving]=useState(false);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    Promise.all([DB.getUserBookings(user.id),DB.getSamples()]).then(([b,s])=>{setBookings(b||[]);setSamples(s||[]);setLoading(false);});
  },[]);
  const book=async()=>{
    if(!form.service){setMsg('Please select a service.');return;}
    setSaving(true);
    const bookingId='b_'+Date.now();
    const price=PRICING.find(p=>p.name===form.service)?.price||0;
    const b={id:bookingId,user_id:user.id,client_name:user.name,client_email:user.email,service:form.service,description:form.desc,file_name:form.fileName,img_name:form.imgName,drive_link:form.driveLink,phone:form.phone,contact_note:form.contactNote,price,status:'Pending Payment',created_at:new Date().toISOString().slice(0,10)};
    await DB.saveBooking(b);
    await DB.addPayment({id:'p_'+Date.now(),booking_id:b.id,user_id:user.id,amount:price,status:'Pending',created_at:b.created_at});
    sendBookingEmail(b); // fire and forget — non-blocking
    setBookings(p=>[b,...p]);setLastB(b);setMsg('Booking saved!');setPayStep(true);setSaving(false);
  };
  const sc=t=>({background:tab===t?'rgba(201,168,76,0.15)':'transparent',border:'1px solid '+(tab===t?'rgba(201,168,76,0.4)':'var(--border)'),color:tab===t?'var(--gold)':'var(--dim)'});
  const statusC=s=>({Completed:'var(--green)','Payment Received':'var(--green)','In Progress':'#7090ff','Pending Payment':'var(--yellow)',Rejected:'#ff6b6b'}[s]||'var(--dim)');
  const steps=['Pending Payment','Payment Received','In Progress','Completed'];
  return (
    <div style={{minHeight:'100vh',padding:'clamp(100px,12vw,120px) clamp(20px,5vw,60px) 60px'}}>
      <div style={{marginBottom:40,display:'flex',justifyContent:'space-between',alignItems:'flex-end',flexWrap:'wrap',gap:16}}>
        <div>
          <span className="section-label">Client Portal</span>
          <h2 className="fd" style={{fontSize:28,marginTop:12}}>WELCOME, <span style={{color:'var(--gold)'}}>{user.name.toUpperCase()}</span></h2>
          <div style={{fontSize:11,color:'var(--dim)',marginTop:6}}>{bookings.length} booking{bookings.length!==1?'s':''}</div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {['samples','my bookings','new booking'].map(t=>(
            <button key={t} onClick={()=>{setTab(t);setPayStep(false);setMsg('');}} style={{fontSize:9,letterSpacing:'0.2em',fontFamily:'Montserrat',fontWeight:500,textTransform:'uppercase',padding:'10px 18px',cursor:'pointer',transition:'all 0.3s',...sc(t)}}>{t.toUpperCase()}</button>
          ))}
        </div>
      </div>
      {loading&&<div style={{textAlign:'center',padding:60,color:'var(--dim)'}}>Loading...</div>}
      {!loading&&tab==='samples'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:16}}>
          {samples.map((s,i)=>(
            <div key={i} className="card" style={{padding:0,overflow:'hidden'}}>
              <div style={{height:140,background:'linear-gradient(135deg,#0a0a0a,#111)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:52,borderBottom:'1px solid var(--border)'}}>{s.thumb}</div>
              <div style={{padding:20}}>
                <div style={{fontSize:8,letterSpacing:'0.3em',color:'var(--gold)',marginBottom:6}}>{s.type?.toUpperCase()}</div>
                <div className="fd" style={{fontSize:11,fontWeight:700}}>{s.title}</div>
                {s.added_on&&<div style={{fontSize:10,color:'var(--dim)',marginTop:4}}>Added {s.added_on}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading&&tab==='my bookings'&&(
        <div>
          {bookings.length===0?(
            <div style={{textAlign:'center',padding:'80px 20px',color:'var(--dim)'}}>
              <div style={{fontSize:48,marginBottom:16}}>📋</div>
              <p>No bookings yet.</p>
              <button className="btn-primary" style={{marginTop:24}} onClick={()=>setTab('new booking')}>CREATE FIRST BOOKING</button>
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              {bookings.map((b,i)=>(
                <div key={b.id} className="card" style={{padding:'28px 32px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12,marginBottom:16}}>
                    <div>
                      <div className="fd" style={{fontSize:13,letterSpacing:'0.1em',marginBottom:6}}>{b.service?.toUpperCase()}</div>
                      <div style={{fontSize:12,color:'var(--dim)',marginBottom:4}}>{b.description||'No description'}</div>
                      <div style={{fontSize:10,color:'rgba(245,240,232,0.25)'}}>ID: <span style={{color:'var(--gold)',fontFamily:'monospace'}}>#{b.id.slice(-8)}</span> · {b.created_at}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div className="fd" style={{fontSize:22,color:'var(--gold)',marginBottom:8}}>Rs.{b.price}</div>
                      <div style={{fontSize:9,letterSpacing:'0.2em',padding:'5px 14px',background:statusC(b.status)+'18',color:statusC(b.status),border:'1px solid '+statusC(b.status)+'40',display:'inline-block'}}>{b.status?.toUpperCase()}</div>
                    </div>
                  </div>
                  {b.delivery_url&&(
                    <div style={{marginBottom:14,padding:'14px 18px',background:'rgba(0,200,100,0.06)',border:'1px solid rgba(0,200,100,0.25)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
                      <div>
                        <div style={{fontSize:10,letterSpacing:'0.2em',color:'var(--green)',marginBottom:3}}>YOUR PROJECT IS READY!</div>
                        <div style={{fontSize:12,color:'var(--dim)'}}>{b.delivery_note||'Your completed project is available.'}</div>
                      </div>
                      <a href={b.delivery_url} target="_blank" rel="noopener noreferrer" style={{padding:'10px 20px',background:'var(--green)',color:'#000',fontSize:10,fontFamily:'Syncopate',fontWeight:700,letterSpacing:'0.15em',textDecoration:'none',flexShrink:0}}>DOWNLOAD</a>
                    </div>
                  )}
                  {b.status==='Rejected'&&(
                    <div style={{marginBottom:14,padding:'14px 18px',background:'rgba(255,107,107,0.06)',border:'1px solid rgba(255,107,107,0.25)'}}>
                      <div style={{fontSize:10,letterSpacing:'0.2em',color:'#ff6b6b',marginBottom:6}}>❌ BOOKING REJECTED BY ADMIN</div>
                      {b.reject_reason&&<div style={{fontSize:12,color:'var(--dim)',lineHeight:1.6}}><span style={{color:'rgba(245,240,232,0.4)'}}>Reason: </span>{b.reject_reason}</div>}
                      {!b.reject_reason&&<div style={{fontSize:12,color:'var(--dim)'}}>Please contact us at <a href="mailto:ajedits1455@gmail.com" style={{color:'var(--gold)',textDecoration:'none'}}>ajedits1455@gmail.com</a> for more details.</div>}
                    </div>
                  )}
                  <div style={{borderTop:'1px solid var(--border)',paddingTop:16,display:'flex',gap:8,alignItems:'flex-end',flexWrap:'wrap'}}>
                    {steps.map((st,si)=>{
                      const cur=steps.indexOf(b.status);
                      const active=si<=cur;
                      return (
                        <div key={si} style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                            <div style={{width:28,height:28,borderRadius:'50%',background:active?'var(--gold)':'rgba(255,255,255,0.06)',border:'2px solid '+(active?'var(--gold)':'rgba(255,255,255,0.1)'),display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:active?'#000':'rgba(255,255,255,0.2)',transition:'all 0.3s'}}>
                              {active?'V':''}
                            </div>
                            <div style={{fontSize:7,letterSpacing:'0.1em',color:active?'var(--gold)':'rgba(245,240,232,0.2)',textAlign:'center',maxWidth:60,lineHeight:1.2}}>{st.toUpperCase()}</div>
                          </div>
                          {si<3&&<div style={{width:32,height:2,background:active&&si<cur?'var(--gold)':'rgba(255,255,255,0.08)',marginBottom:16,transition:'all 0.3s'}}/>}
                        </div>
                      );
                    })}
                    <div style={{marginLeft:'auto'}}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {!loading&&tab==='new booking'&&!payStep&&(
        <div style={{maxWidth:560}}>
          <div className="card" style={{padding:40}}>
            <h3 className="fd" style={{fontSize:15,marginBottom:20,letterSpacing:'0.15em'}}>CREATE BOOKING</h3>
            {msg&&<div style={{color:msg.includes('saved')?'var(--green)':'#ff6b6b',fontSize:12,marginBottom:12}}>{msg}</div>}
            <label style={{fontSize:10,letterSpacing:'0.2em',color:'var(--dim)',display:'block',marginBottom:8}}>SERVICE</label>
            <select className="input-field" value={form.service} onChange={e=>setForm(f=>({...f,service:e.target.value}))} style={{marginBottom:16,background:'rgba(255,255,255,0.03)'}}>
              <option value="" style={{background:'#0d0d10'}}>Select a service</option>
              {PRICING.map(p=><option key={p.name} value={p.name} style={{background:'#0d0d10'}}>{p.name} — Rs.{p.price}</option>)}
            </select>
            <label style={{fontSize:10,letterSpacing:'0.2em',color:'var(--dim)',display:'block',marginBottom:8}}>DESCRIPTION</label>
            <textarea className="input-field" rows={3} placeholder="Describe your project..." value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} style={{marginBottom:16,resize:'vertical'}}/>

            <label style={{fontSize:10,letterSpacing:'0.2em',color:'var(--dim)',display:'block',marginBottom:8}}>GOOGLE DRIVE LINK <span style={{color:'rgba(201,168,76,0.4)',fontWeight:300}}>(paste your raw footage link)</span></label>
            <input className="input-field" type="url" placeholder="https://drive.google.com/..." value={form.driveLink} onChange={e=>setForm(f=>({...f,driveLink:e.target.value}))} style={{marginBottom:6}}/>
            <p style={{fontSize:10,color:'rgba(245,240,232,0.25)',marginBottom:16,lineHeight:1.6}}>Make sure the link is set to <span style={{color:'var(--gold)'}}>Anyone with link can view</span></p>

            <div style={{background:'rgba(201,168,76,0.03)',border:'1px solid rgba(201,168,76,0.12)',padding:'20px 20px 4px',marginBottom:16}}>
              <div style={{fontSize:10,letterSpacing:'0.3em',color:'var(--gold)',marginBottom:16}}>CONTACT DETAILS</div>
              <label style={{fontSize:10,letterSpacing:'0.2em',color:'var(--dim)',display:'block',marginBottom:8}}>PHONE / WHATSAPP NUMBER</label>
              <input className="input-field" type="tel" placeholder="e.g. 9876543210" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} style={{marginBottom:16}}/>
              <label style={{fontSize:10,letterSpacing:'0.2em',color:'var(--dim)',display:'block',marginBottom:8}}>ADDITIONAL CONTACT NOTE <span style={{color:'rgba(201,168,76,0.4)',fontWeight:300}}>(optional)</span></label>
              <textarea className="input-field" rows={2} placeholder="e.g. best time to call, preferred contact method..." value={form.contactNote} onChange={e=>setForm(f=>({...f,contactNote:e.target.value}))} style={{marginBottom:16,resize:'vertical'}}/>
            </div>

            <button className="btn-primary" style={{width:'100%'}} onClick={book} disabled={saving}>{saving?'SAVING...':'PROCEED TO PAYMENT'}</button>
          </div>
        </div>
      )}
      {!loading&&tab==='new booking'&&payStep&&lastB&&(
        <PaymentStep lastB={lastB} user={user} setBookings={setBookings} setPayStep={setPayStep} setTab={setTab} setForm={setForm}/>
      )}
    </div>
  );
}

function AdminDashboard({user}) {
  const [tab,setTab]=useState('overview');
  const [bookings,setBookings]=useState([]);
  const [profiles,setProfiles]=useState([]);
  const [samples,setSamples]=useState([]);
  const [payments,setPayments]=useState([]);
  const [sTitle,setSTitle]=useState('');
  const [sType,setSType]=useState('Wedding');
  const [msg,setMsg]=useState('');
  const [loading,setLoading]=useState(true);
  const [rejectState,setRejectState]=useState({});
  const [deliverState,setDeliverState]=useState({});
  const [seenCount,setSeenCount]=useState(0);
  const [cpOld,setCpOld]=useState('');
  const [cpNew,setCpNew]=useState('');
  const [cpConf,setCpConf]=useState('');
  const [cpMsg,setCpMsg]=useState('');
  const [cpErr,setCpErr]=useState('');
  const load=useCallback(async()=>{
    setLoading(true);
    const [b,u,s,p]=await Promise.all([DB.getBookings(),DB.getProfiles(),DB.getSamples(),DB.getPayments()]);
    setBookings(b||[]);setProfiles(u||[]);setSamples(s||[]);setPayments(p||[]);
    const seen=await store.get('admin:seen_bookings')||0;
    setSeenCount(seen);
    setLoading(false);
  },[]);
  useEffect(()=>{load();},[]);
  // Mark all as seen when visiting bookings tab
  useEffect(()=>{
    if(tab==='bookings'&&bookings.length>0){
      store.set('admin:seen_bookings',bookings.length);
      setSeenCount(bookings.length);
    }
  },[tab,bookings.length]);
  const newCount=Math.max(0,bookings.length-seenCount);
  const totalRev=payments.filter(p=>p.status==='Paid').reduce((a,b)=>a+b.amount,0);
  const sc=t=>({background:tab===t?'rgba(201,168,76,0.15)':'transparent',border:'1px solid '+(tab===t?'rgba(201,168,76,0.4)':'var(--border)'),color:tab===t?'var(--gold)':'var(--dim)'});
  const sColor=s=>({'Pending Payment':'var(--yellow)','Payment Received':'var(--green)','In Progress':'#7090ff','Completed':'var(--green)','Paid':'var(--green)','Pending':'var(--yellow)','Work Pending':'#7090ff','Payment Under Review':'var(--yellow)','Rejected':'#ff6b6b'}[s]||'var(--dim)');
  const invoice=b=>{
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice #${b.id.slice(-8)}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',sans-serif;background:#f8f6f0;color:#1a1a1a;padding:40px;}
    .page{max-width:680px;margin:0 auto;background:#fff;box-shadow:0 2px 20px rgba(0,0,0,0.1);}
    .header{background:linear-gradient(135deg,#0a0800,#1a1400);padding:40px 48px;display:flex;justify-content:space-between;align-items:center;}
    .brand{color:#c9a84c;font-size:28px;font-weight:700;letter-spacing:6px;font-family:Georgia,serif;}
    .inv-label{color:rgba(201,168,76,0.6);font-size:11px;letter-spacing:3px;margin-top:4px;}
    .inv-num{color:#e8d08a;font-size:13px;font-weight:600;margin-top:6px;}
    .body{padding:40px 48px;}
    .row{display:flex;justify-content:space-between;gap:32px;margin-bottom:32px;}
    .col h4{font-size:9px;letter-spacing:3px;color:#999;margin-bottom:10px;text-transform:uppercase;}
    .col p{font-size:14px;color:#222;line-height:1.7;}
    .divider{height:1px;background:#eee;margin:24px 0;}
    .item-row{display:flex;justify-content:space-between;padding:16px 0;border-bottom:1px solid #f0ede6;}
    .item-name{font-size:14px;color:#333;}
    .item-price{font-size:16px;font-weight:700;color:#c9a84c;}
    .total-row{display:flex;justify-content:space-between;padding:20px 0;margin-top:8px;}
    .total-label{font-size:13px;letter-spacing:2px;color:#666;text-transform:uppercase;}
    .total-amount{font-size:26px;font-weight:700;color:#c9a84c;}
    .status-badge{display:inline-block;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:1px;background:${b.status==='Completed'?'#e8f9ef':'#fff8e6'};color:${b.status==='Completed'?'#1a8a4a':'#b87a00'};}
    .footer{background:#f9f7f2;padding:28px 48px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16;}
    .footer p{font-size:11px;color:#888;letter-spacing:1px;}
    .footer .upi{font-size:13px;color:#555;font-weight:600;}
    .thank{text-align:center;padding:28px 48px;font-size:12px;color:#aaa;letter-spacing:2px;text-transform:uppercase;border-top:1px solid #eee;}
    </style></head><body><div class="page">
    <div class="header">
      <div><div class="brand">AJ EDITS</div><div class="inv-label">CINEMATIC VIDEO STUDIO</div></div>
      <div style="text-align:right"><div class="inv-label">INVOICE</div><div class="inv-num">#${b.id.slice(-8)}</div><div style="color:#888;font-size:11px;margin-top:4px">${b.created_at}</div></div>
    </div>
    <div class="body">
      <div class="row">
        <div class="col"><h4>Billed To</h4><p><strong>${b.client_name}</strong><br>${b.client_email}${b.phone?'<br>'+b.phone:''}</p></div>
        <div class="col" style="text-align:right"><h4>Status</h4><p><span class="status-badge">${b.status}</span></p></div>
      </div>
      <div class="divider"/>
      <div class="item-row"><span class="item-name">${b.service}${b.description?'<br><span style="font-size:12px;color:#999">'+b.description+'</span>':''}</span><span class="item-price">Rs.${b.price}</span></div>
      <div class="total-row"><span class="total-label">Total Amount</span><span class="total-amount">Rs.${b.price}</span></div>
    </div>
    <div class="footer">
      <div><p>PAYMENT VIA</p><p class="upi">UPI: ajEdits@upi</p></div>
      <div style="text-align:right"><p>ajedits1455@gmail.com</p><p>Instagram: @aj_edits_1455</p><p>Discord: discord.gg/V6srdr4BQv</p></div>
    </div>
    <div class="thank">Thank you for choosing AJ EDITS ✦ We appreciate your trust</div>
    </div></body></html>`;
    const w=window.open('','_blank');
    w.document.write(html);w.document.close();
  };
  return (
    <div style={{minHeight:'100vh',padding:'clamp(100px,12vw,120px) clamp(20px,5vw,60px) 60px'}}>
      <div style={{marginBottom:40,display:'flex',justifyContent:'space-between',alignItems:'flex-end',flexWrap:'wrap',gap:16}}>
        <div>
          <span className="section-label">Control Panel</span>
          <h2 className="fd" style={{fontSize:28,marginTop:12}}><span style={{color:'var(--gold)'}}>ADMIN</span> DASHBOARD</h2>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {['overview','bookings','payments','samples','users','settings'].map(t=>(
            <button key={t} onClick={()=>{setTab(t);setMsg('');}} style={{fontSize:9,letterSpacing:'0.2em',fontFamily:'Montserrat',fontWeight:500,textTransform:'uppercase',padding:'10px 18px',cursor:'pointer',transition:'all 0.3s',position:'relative',...sc(t)}}>
              {t.toUpperCase()}
              {t==='bookings'&&newCount>0&&(
                <span style={{position:'absolute',top:-6,right:-6,background:'#ff6b6b',color:'#fff',fontSize:8,fontWeight:700,borderRadius:'50%',width:16,height:16,display:'flex',alignItems:'center',justifyContent:'center',animation:'bounceIn 0.4s ease'}}>{newCount}</span>
              )}
            </button>
          ))}
          <button className="btn-outline" style={{padding:'10px 18px',fontSize:9}} onClick={load}>SYNC</button>
        </div>
      </div>
      {loading&&<div style={{textAlign:'center',padding:60,color:'var(--dim)'}}>Loading...</div>}
      {!loading&&tab==='overview'&&(
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16,marginBottom:28}}>
            {[{l:'Total Bookings',v:bookings.length,i:'📋',c:'var(--gold)'},{l:'Revenue',v:'Rs.'+totalRev.toLocaleString(),i:'💰',c:'var(--green)'},{l:'Pending Payments',v:payments.filter(p=>p.status==='Pending').length,i:'⏳',c:'var(--yellow)'},{l:'Clients',v:profiles.length,i:'👥',c:'var(--gold)'},{l:'Samples',v:samples.length,i:'🎬',c:'var(--gold)'},{l:'Paid',v:payments.filter(p=>p.status==='Paid').length,i:'✅',c:'var(--green)'}].map((s,i)=>(
              <div key={i} className="card" style={{padding:28}}>
                <div style={{fontSize:28,marginBottom:12}}>{s.i}</div>
                <div className="fd" style={{fontSize:26,color:s.c}}>{s.v}</div>
                <div style={{fontSize:10,color:'var(--dim)',letterSpacing:'0.2em',marginTop:6}}>{s.l.toUpperCase()}</div>
              </div>
            ))}
          </div>
          {payments.filter(p=>p.status==='Paid').length>0&&(()=>{
            const months={};
            payments.filter(p=>p.status==='Paid').forEach(p=>{ const m=(p.created_at||'2025-01').slice(0,7); months[m]=(months[m]||0)+p.amount; });
            const keys=Object.keys(months).sort();
            const maxV=Math.max(...Object.values(months),1);
            return (
              <div className="card" style={{padding:28}}>
                <div style={{fontSize:10,letterSpacing:'0.25em',color:'var(--gold)',marginBottom:20}}>MONTHLY REVENUE</div>
                <div style={{display:'flex',alignItems:'flex-end',gap:12,height:120}}>
                  {keys.map(k=>(
                    <div key={k} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6,minWidth:40}}>
                      <div style={{fontSize:9,color:'var(--gold)'}}>Rs.{months[k]>=1000?((months[k]/1000).toFixed(1))+'K':months[k]}</div>
                      <div style={{width:'100%',background:'linear-gradient(to top,var(--gold),var(--gold2))',height:Math.max(8,(months[k]/maxV)*90)+'px',borderRadius:'2px 2px 0 0',boxShadow:'0 0 8px rgba(201,168,76,0.3)'}}/>
                      <div style={{fontSize:8,color:'var(--dim)',letterSpacing:'0.05em'}}>{k.slice(5)}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
      {!loading&&tab==='bookings'&&(
        <div style={{overflowX:'auto'}}>
          <p style={{color:'var(--dim)',fontSize:12,marginBottom:20}}>{bookings.length} total bookings</p>
          {bookings.length===0?<div style={{textAlign:'center',padding:60,color:'var(--dim)'}}>No bookings yet.</div>:(
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              {bookings.map((b,i)=>(
                <div key={i} className="card" style={{padding:'24px 28px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12,marginBottom:16}}>
                    <div>
                      <div className="fd" style={{fontSize:13,letterSpacing:'0.1em',marginBottom:4}}>{(b.service||'').toUpperCase()}</div>
                      <div style={{fontSize:10,color:'rgba(245,240,232,0.25)',fontFamily:'monospace'}}>#{b.id.slice(-8)} · {b.created_at}</div>
                    </div>
                    <span className="fd" style={{fontSize:20,color:'var(--gold)'}}>Rs.{b.price}</span>
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12,marginBottom:16}}>
                    <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid var(--border)',padding:'12px 14px'}}>
                      <div style={{fontSize:8,letterSpacing:'0.25em',color:'var(--gold)',marginBottom:6}}>CLIENT</div>
                      <div style={{fontSize:12,fontWeight:500}}>{b.client_name}</div>
                      <div style={{fontSize:10,color:'var(--dim)',marginTop:2}}>{b.client_email}</div>
                    </div>
                    <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid var(--border)',padding:'12px 14px'}}>
                      <div style={{fontSize:8,letterSpacing:'0.25em',color:'var(--gold)',marginBottom:6}}>CONTACT</div>
                      {b.phone?<div style={{fontSize:12,fontWeight:500}}>{b.phone}</div>:<div style={{fontSize:11,color:'rgba(245,240,232,0.2)'}}>No phone provided</div>}
                      {b.contact_note&&<div style={{fontSize:10,color:'var(--dim)',marginTop:4,lineHeight:1.5}}>{b.contact_note}</div>}
                    </div>
                    <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid var(--border)',padding:'12px 14px'}}>
                      <div style={{fontSize:8,letterSpacing:'0.25em',color:'var(--gold)',marginBottom:6}}>DESCRIPTION</div>
                      <div style={{fontSize:11,color:'var(--dim)',lineHeight:1.5}}>{b.description||'—'}</div>
                    </div>
                  </div>

                  {b.drive_link&&(
                    <div style={{marginBottom:14,padding:'12px 16px',background:'rgba(66,133,244,0.06)',border:'1px solid rgba(66,133,244,0.25)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
                      <div>
                        <div style={{fontSize:8,letterSpacing:'0.25em',color:'#4285f4',marginBottom:4}}>GOOGLE DRIVE LINK</div>
                        <div style={{fontSize:11,color:'var(--dim)',wordBreak:'break-all'}}>{b.drive_link}</div>
                      </div>
                      <a href={b.drive_link} target="_blank" rel="noopener noreferrer" style={{padding:'8px 16px',background:'rgba(66,133,244,0.15)',border:'1px solid rgba(66,133,244,0.35)',color:'#4285f4',fontSize:9,fontFamily:'Montserrat',fontWeight:600,letterSpacing:'0.15em',textDecoration:'none',flexShrink:0}}>OPEN DRIVE</a>
                    </div>
                  )}
                  {!b.drive_link&&(
                    <div style={{marginBottom:14,padding:'10px 14px',background:'rgba(255,180,0,0.04)',border:'1px solid rgba(255,180,0,0.15)',fontSize:10,color:'rgba(255,180,0,0.5)',letterSpacing:'0.1em'}}>NO DRIVE LINK PROVIDED</div>
                  )}

                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                    {b.status==='Rejected'?(
                      <div style={{flex:1,padding:'10px 16px',background:'rgba(255,107,107,0.08)',border:'1px solid rgba(255,107,107,0.25)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                        <div>
                          <div style={{fontSize:9,letterSpacing:'0.2em',color:'#ff6b6b',marginBottom:3}}>BOOKING REJECTED</div>
                          {b.reject_reason&&<div style={{fontSize:11,color:'var(--dim)'}}>{b.reject_reason}</div>}
                        </div>
                        <button style={{fontSize:9,padding:'6px 14px',background:'rgba(201,168,76,0.1)',border:'1px solid rgba(201,168,76,0.25)',color:'var(--gold)',cursor:'pointer',fontFamily:'Montserrat',letterSpacing:'0.1em'}}
                          onClick={async()=>{ await DB.updateBookingStatus(b.id,'Pending Payment'); setBookings(p=>p.map(x=>x.id===b.id?{...x,status:'Pending Payment',reject_reason:''}:x)); }}>
                          UNDO
                        </button>
                      </div>
                    ):(
                      <>
                        {/* Inline deliver form */}
                        {deliverState[b.id]?(
                          <div style={{flex:1,display:'flex',flexDirection:'column',gap:8,padding:'14px 16px',background:'rgba(201,168,76,0.04)',border:'1px solid rgba(201,168,76,0.2)'}}>
                            <div style={{fontSize:9,letterSpacing:'0.2em',color:'var(--gold)',marginBottom:2}}>DELIVER PROJECT</div>
                            <input className="input-field" placeholder="Delivery URL (Drive / YouTube / etc.)" value={deliverState[b.id].url||''} onChange={e=>setDeliverState(s=>({...s,[b.id]:{...s[b.id],url:e.target.value}}))} style={{fontSize:12,padding:'10px 12px'}}/>
                            <input className="input-field" placeholder="Note for client (e.g. Your project is ready!)" value={deliverState[b.id].note||''} onChange={e=>setDeliverState(s=>({...s,[b.id]:{...s[b.id],note:e.target.value}}))} style={{fontSize:12,padding:'10px 12px'}}/>
                            <div style={{display:'flex',gap:8}}>
                              <button style={{fontSize:9,padding:'8px 16px',background:'var(--gold)',border:'none',color:'#000',cursor:'pointer',fontFamily:'Montserrat',fontWeight:700,letterSpacing:'0.1em'}}
                                onClick={async()=>{
                                  const {url,note}=deliverState[b.id];
                                  if(!url) return;
                                  await DB.deliverBooking(b.id,url,note||'');
                                  setBookings(p=>p.map(x=>x.id===b.id?{...x,delivery_url:url,delivery_note:note,status:'Completed'}:x));
                                  setDeliverState(s=>{const n={...s};delete n[b.id];return n;});
                                }}>CONFIRM DELIVER</button>
                              <button style={{fontSize:9,padding:'8px 14px',background:'transparent',border:'1px solid var(--border)',color:'var(--dim)',cursor:'pointer',fontFamily:'Montserrat'}}
                                onClick={()=>setDeliverState(s=>{const n={...s};delete n[b.id];return n;})}>CANCEL</button>
                            </div>
                          </div>
                        ):(
                          /* Inline reject form */
                          rejectState[b.id]!==undefined?(
                            <div style={{flex:1,display:'flex',flexDirection:'column',gap:8,padding:'14px 16px',background:'rgba(255,107,107,0.04)',border:'1px solid rgba(255,107,107,0.2)'}}>
                              <div style={{fontSize:9,letterSpacing:'0.2em',color:'#ff6b6b',marginBottom:2}}>REJECT BOOKING</div>
                              <input className="input-field" placeholder="Reason for rejection (shown to client)" value={rejectState[b.id]} onChange={e=>setRejectState(s=>({...s,[b.id]:e.target.value}))} style={{fontSize:12,padding:'10px 12px'}}/>
                              <div style={{display:'flex',gap:8}}>
                                <button style={{fontSize:9,padding:'8px 16px',background:'#ff6b6b',border:'none',color:'#000',cursor:'pointer',fontFamily:'Montserrat',fontWeight:700,letterSpacing:'0.1em'}}
                                  onClick={async()=>{
                                    const reason=rejectState[b.id]||'';
                                    await DB.rejectBooking(b.id,reason);
                                    setBookings(p=>p.map(x=>x.id===b.id?{...x,status:'Rejected',reject_reason:reason}:x));
                                    setRejectState(s=>{const n={...s};delete n[b.id];return n;});
                                  }}>CONFIRM REJECT</button>
                                <button style={{fontSize:9,padding:'8px 14px',background:'transparent',border:'1px solid var(--border)',color:'var(--dim)',cursor:'pointer',fontFamily:'Montserrat'}}
                                  onClick={()=>setRejectState(s=>{const n={...s};delete n[b.id];return n;})}>CANCEL</button>
                              </div>
                            </div>
                          ):(
                            <>
                              <select style={{background:'var(--card)',border:'1px solid var(--border)',color:'var(--white)',fontSize:10,padding:'8px 12px',cursor:'pointer',outline:'none'}} value={b.status}
                                onChange={async e=>{ await DB.updateBookingStatus(b.id,e.target.value); setBookings(p=>p.map(x=>x.id===b.id?{...x,status:e.target.value}:x)); }}>
                                {['Pending Payment','Work Pending','Payment Under Review','Payment Received','In Progress','Completed'].map(s=><option key={s} style={{background:'#0d0d10'}}>{s}</option>)}
                              </select>
                              <button style={{fontSize:9,padding:'8px 14px',background:'rgba(201,168,76,0.1)',border:'1px solid rgba(201,168,76,0.25)',color:'var(--gold)',cursor:'pointer',fontFamily:'Montserrat',letterSpacing:'0.1em'}}
                                onClick={()=>setDeliverState(s=>({...s,[b.id]:{url:'',note:''}}))}>
                                DELIVER
                              </button>
                              <button style={{fontSize:9,padding:'8px 14px',background:'rgba(100,150,255,0.1)',border:'1px solid rgba(100,150,255,0.25)',color:'#7090ff',cursor:'pointer',fontFamily:'Montserrat',letterSpacing:'0.1em'}} onClick={()=>invoice(b)}>
                                INVOICE
                              </button>
                              <button style={{fontSize:9,padding:'8px 14px',background:'rgba(255,107,107,0.1)',border:'1px solid rgba(255,107,107,0.25)',color:'#ff6b6b',cursor:'pointer',fontFamily:'Montserrat',letterSpacing:'0.1em'}}
                                onClick={()=>setRejectState(s=>({...s,[b.id]:''}))}>
                                REJECT
                              </button>
                            </>
                          )
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {!loading&&tab==='payments'&&(
        <div style={{overflowX:'auto'}}>
          {payments.length===0?<div style={{textAlign:'center',padding:60,color:'var(--dim)'}}>No payments yet.</div>:(
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:600}}>
              <thead><tr>{['Booking','Amount','Date','Status','Action'].map(h=><th key={h} style={{textAlign:'left',padding:'12px 16px',fontSize:9,letterSpacing:'0.2em',color:'var(--dim)',borderBottom:'1px solid var(--border)'}}>{h}</th>)}</tr></thead>
              <tbody>
                {payments.map((p,i)=>(
                  <tr key={i} style={{borderBottom:'1px solid var(--border)'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'14px 16px',fontSize:11,fontFamily:'monospace',color:'var(--gold)'}}>#{(p.booking_id||'').slice(-8)}</td>
                    <td style={{padding:'14px 16px'}}><span className="fd" style={{fontSize:14,color:'var(--gold)'}}>Rs.{p.amount}</span></td>
                    <td style={{padding:'14px 16px',fontSize:11,color:'var(--dim)'}}>{p.created_at}</td>
                    <td style={{padding:'14px 16px'}}><span style={{fontSize:9,padding:'4px 12px',background:sColor(p.status)+'18',color:sColor(p.status),border:'1px solid '+sColor(p.status)+'40',letterSpacing:'0.15em'}}>{(p.status||'').toUpperCase()}</span></td>
                    <td style={{padding:'14px 16px'}}>
                      <button style={{fontSize:9,padding:'6px 12px',background:p.status==='Paid'?'rgba(255,180,0,0.1)':'rgba(0,200,100,0.1)',border:'1px solid '+(p.status==='Paid'?'rgba(255,180,0,0.3)':'rgba(0,200,100,0.3)'),color:p.status==='Paid'?'var(--yellow)':'var(--green)',cursor:'pointer',fontFamily:'Montserrat',letterSpacing:'0.1em'}}
                        onClick={async()=>{ const ns=p.status==='Paid'?'Pending':'Paid'; await DB.updatePaymentStatus(p.booking_id,ns); setPayments(prev=>prev.map(x=>x.booking_id===p.booking_id?{...x,status:ns}:x)); }}>
                        {p.status==='Paid'?'MARK PENDING':'MARK PAID'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {!loading&&tab==='samples'&&(
        <div>
          <div className="card" style={{padding:28,marginBottom:24}}>
            <h3 className="fd" style={{fontSize:12,marginBottom:16,letterSpacing:'0.15em'}}>ADD SAMPLE</h3>
            <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-end'}}>
              <input className="input-field" placeholder="Title" value={sTitle} onChange={e=>setSTitle(e.target.value)} style={{flex:1,minWidth:180}}/>
              <select className="input-field" value={sType} onChange={e=>setSType(e.target.value)} style={{background:'rgba(255,255,255,0.03)',minWidth:140}}>
                {['Wedding','Reel','Promo','Event','Photo'].map(t=><option key={t} style={{background:'#0d0d10'}}>{t}</option>)}
              </select>
              <button className="btn-primary" style={{padding:'14px 24px',fontSize:9}} onClick={async()=>{
                if(!sTitle) return;
                const icons={Wedding:'💍',Reel:'📱',Promo:'🎞️',Event:'🎉',Photo:'📸'};
                const s={id:'s_'+Date.now(),title:sTitle,type:sType,thumb:icons[sType]||'🎬',added_on:new Date().toISOString().slice(0,10)};
                await DB.addSample(s); setSamples(p=>[s,...p]); setSTitle(''); setMsg('Sample added!');
              }}>ADD</button>
            </div>
            {msg&&<div style={{color:'var(--green)',fontSize:11,marginTop:8}}>{msg}</div>}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12}}>
            {samples.map((s,i)=>(
              <div key={i} className="card" style={{padding:0,overflow:'hidden'}}>
                <div style={{height:100,background:'linear-gradient(135deg,#0a0a0a,#111)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:40}}>{s.thumb}</div>
                <div style={{padding:16}}>
                  <div style={{fontSize:8,color:'var(--gold)',letterSpacing:'0.3em',marginBottom:4}}>{s.type?.toUpperCase()}</div>
                  <div className="fd" style={{fontSize:10,fontWeight:700,marginBottom:8}}>{s.title}</div>
                  <button style={{fontSize:8,padding:'4px 10px',background:'rgba(255,107,107,0.1)',border:'1px solid rgba(255,107,107,0.3)',color:'#ff6b6b',cursor:'pointer',fontFamily:'Montserrat'}}
                    onClick={async()=>{ await DB.removeSample(s.id); setSamples(p=>p.filter(x=>x.id!==s.id)); }}>REMOVE</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {!loading&&tab==='users'&&(
        <div>
          <div style={{marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
            <p style={{color:'var(--dim)',fontSize:12}}>{profiles.length} registered clients</p>
          </div>
          {profiles.length===0?<div style={{textAlign:'center',padding:60,color:'var(--dim)'}}>No clients yet.</div>:(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {profiles.map((u,i)=>(
                <div key={i} className="card" style={{padding:'20px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
                  <div style={{display:'flex',alignItems:'center',gap:16}}>
                    <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,var(--gold),var(--gold2))',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Syncopate',fontSize:16,color:'#000',fontWeight:700}}>{u.avatar}</div>
                    <div>
                      <div style={{fontSize:13,fontWeight:500}}>{u.name}</div>
                      <div style={{fontSize:11,color:'var(--dim)',marginTop:2}}>{u.email}</div>
                    </div>
                  </div>
                  <div style={{fontSize:10,color:'var(--dim)',letterSpacing:'0.1em'}}>Joined {u.joined}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {!loading&&tab==='settings'&&(
        <div style={{maxWidth:480}}>
          <div className="card" style={{padding:36}}>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:9,letterSpacing:'0.3em',color:'var(--gold)',marginBottom:6}}>ACCOUNT SETTINGS</div>
              <h3 className="fd" style={{fontSize:14,letterSpacing:'0.12em'}}>CHANGE PASSWORD</h3>
              <p style={{fontSize:12,color:'var(--dim)',marginTop:8}}>Logged in as <span style={{color:'var(--gold)'}}>{user?.email}</span></p>
            </div>
            {cpErr&&<div style={{padding:'12px 16px',background:'rgba(255,107,107,0.1)',border:'1px solid rgba(255,107,107,0.3)',color:'#ff6b6b',fontSize:12,marginBottom:16,borderRadius:2}}>{cpErr}</div>}
            {cpMsg&&<div style={{padding:'12px 16px',background:'rgba(0,200,100,0.1)',border:'1px solid rgba(0,200,100,0.3)',color:'var(--green)',fontSize:12,marginBottom:16,borderRadius:2}}>{cpMsg}</div>}
            <label style={{fontSize:10,letterSpacing:'0.2em',color:'var(--dim)',display:'block',marginBottom:8}}>CURRENT PASSWORD</label>
            <input className="input-field" type="password" placeholder="Enter current password" value={cpOld} onChange={e=>setCpOld(e.target.value)} style={{marginBottom:16}}/>
            <label style={{fontSize:10,letterSpacing:'0.2em',color:'var(--dim)',display:'block',marginBottom:8}}>NEW PASSWORD</label>
            <input className="input-field" type="password" placeholder="Enter new password (min 6 chars)" value={cpNew} onChange={e=>setCpNew(e.target.value)} style={{marginBottom:16}}/>
            <label style={{fontSize:10,letterSpacing:'0.2em',color:'var(--dim)',display:'block',marginBottom:8}}>CONFIRM NEW PASSWORD</label>
            <input className="input-field" type="password" placeholder="Confirm new password" value={cpConf} onChange={e=>setCpConf(e.target.value)} style={{marginBottom:24}}/>
            <button className="btn-primary" style={{width:'100%'}} onClick={async()=>{
              setCpErr('');setCpMsg('');
              if(!cpOld||!cpNew||!cpConf){setCpErr('All fields are required.');return;}
              if(cpNew!==cpConf){setCpErr('New passwords do not match.');return;}
              if(cpNew.length<6){setCpErr('New password must be at least 6 characters.');return;}
              if(cpNew===cpOld){setCpErr('New password must be different from current.');return;}
              const res=await DB.changePassword(user.email,cpOld,cpNew);
              if(res.error){setCpErr(res.error);}
              else{setCpMsg('Password changed successfully!');setCpOld('');setCpNew('');setCpConf('');}
            }}>UPDATE PASSWORD</button>
          </div>
        </div>
      )}
    </div>
  );
}

const SOCIALS=[
  {name:'Instagram',handle:'@aj_edits_1455',url:'https://instagram.com/aj_edits_1455',color:'#E1306C',
    icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>},
  {name:'Discord',handle:'Join Server',url:'https://discord.gg/V6srdr4BQv',color:'#5865F2',
    icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.04.032.05a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>},
  {name:'Email',handle:'ajedits1455@gmail.com',url:'mailto:ajedits1455@gmail.com',color:'#EA4335',
    icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>},
];

function FloatingContact() {
  const [open,setOpen]=useState(false);
  return (
    <div style={{position:'fixed',bottom:28,right:28,zIndex:998}}>
      {open&&(
        <div style={{position:'absolute',bottom:64,right:0,width:280,background:'var(--card)',border:'1px solid rgba(201,168,76,0.3)',padding:24,animation:'slideDown 0.2s ease',boxShadow:'0 8px 40px rgba(0,0,0,0.6)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div className="fd" style={{fontSize:11,color:'var(--gold)',letterSpacing:'0.15em'}}>QUICK CONTACT</div>
            <button onClick={()=>setOpen(false)} style={{background:'none',border:'none',color:'var(--dim)',cursor:'pointer',fontSize:18,lineHeight:1}}>×</button>
          </div>
          <p style={{fontSize:12,color:'var(--dim)',marginBottom:20,lineHeight:1.7}}>Have a question? Reach us directly — we reply fast!</p>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <a href="mailto:ajedits1455@gmail.com"
              style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:'rgba(234,67,53,0.08)',border:'1px solid rgba(234,67,53,0.25)',color:'#EA4335',textDecoration:'none',fontSize:12,fontWeight:500,transition:'all 0.2s'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(234,67,53,0.15)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(234,67,53,0.08)'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>
              ajedits1455@gmail.com
            </a>
            <a href="https://instagram.com/aj_edits_1455" target="_blank" rel="noopener noreferrer"
              style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:'rgba(225,48,108,0.08)',border:'1px solid rgba(225,48,108,0.25)',color:'#E1306C',textDecoration:'none',fontSize:12,fontWeight:500,transition:'all 0.2s'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(225,48,108,0.15)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(225,48,108,0.08)'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
              DM on Instagram
            </a>
            <a href="https://discord.gg/V6srdr4BQv" target="_blank" rel="noopener noreferrer"
              style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:'rgba(88,101,242,0.08)',border:'1px solid rgba(88,101,242,0.25)',color:'#5865F2',textDecoration:'none',fontSize:12,fontWeight:500,transition:'all 0.2s'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(88,101,242,0.15)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(88,101,242,0.08)'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.04.032.05a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
              Chat on Discord
            </a>
          </div>
          <div style={{marginTop:16,padding:'10px 14px',background:'rgba(201,168,76,0.05)',border:'1px solid rgba(201,168,76,0.15)',fontSize:10,color:'var(--dim)',letterSpacing:'0.1em',textAlign:'center'}}>
            ⚡ Usually replies within 1 hour
          </div>
        </div>
      )}
      <button onClick={()=>setOpen(v=>!v)}
        style={{width:52,height:52,borderRadius:'50%',background:open?'var(--card)':'var(--gold)',border:open?'1px solid var(--gold)':'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 20px rgba(201,168,76,0.4)',transition:'all 0.3s',color:open?'var(--gold)':'#000'}}>
        {open
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        }
      </button>
    </div>
  );
}

function Footer() {
  return (
    <footer style={{borderTop:'1px solid var(--border)',padding:'60px clamp(20px,8vw,120px) 40px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:40,marginBottom:48}}>
        <div style={{maxWidth:320}}>
          <div style={{marginBottom:16}}>
            <span className="fd" style={{fontSize:24,fontWeight:700,letterSpacing:'0.2em',color:'var(--gold)'}}>AJ</span>
            <span className="fd" style={{fontSize:24,fontWeight:400,letterSpacing:'0.2em',marginLeft:8}}>EDITS</span>
          </div>
          <p className="fs" style={{fontStyle:'italic',color:'var(--dim)',fontSize:15,marginBottom:28}}>Turning Moments Into Cinematic Masterpieces</p>
          <div style={{display:'flex',gap:12}}>
            {SOCIALS.map(s=>(
              <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" title={s.name}
                style={{width:48,height:48,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.03)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--dim)',transition:'all 0.3s',textDecoration:'none'}}
                onMouseEnter={e=>{e.currentTarget.style.color=s.color;e.currentTarget.style.borderColor=s.color+'66';e.currentTarget.style.transform='translateY(-3px)';}}
                onMouseLeave={e=>{e.currentTarget.style.color='var(--dim)';e.currentTarget.style.borderColor='rgba(255,255,255,0.1)';e.currentTarget.style.transform='none';}}>
                {s.icon}
              </a>
            ))}
          </div>
        </div>
        <div style={{display:'flex',gap:60,flexWrap:'wrap'}}>
          <div>
            <div style={{fontSize:9,letterSpacing:'0.3em',color:'var(--gold)',marginBottom:16}}>NAVIGATE</div>
            {['Home','Services','Pricing'].map(l=>(
              <div key={l} style={{marginBottom:10}}><button className="nav-link" onClick={()=>document.getElementById(l.toLowerCase())?.scrollIntoView({behavior:'smooth'})}>{l}</button></div>
            ))}
          </div>
          <div>
            <div style={{fontSize:9,letterSpacing:'0.3em',color:'var(--gold)',marginBottom:16}}>CONNECT</div>
            {SOCIALS.map(s=>(
              <div key={s.name} style={{marginBottom:14}}>
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                  style={{display:'flex',alignItems:'center',gap:10,textDecoration:'none',color:'var(--dim)',fontSize:12,transition:'color 0.3s'}}
                  onMouseEnter={e=>e.currentTarget.style.color=s.color}
                  onMouseLeave={e=>e.currentTarget.style.color='var(--dim)'}>
                  <span style={{display:'flex',alignItems:'center'}}>{s.icon}</span>
                  <div>
                    <div style={{fontSize:11,fontWeight:500,letterSpacing:'0.1em'}}>{s.name}</div>
                    <div style={{fontSize:10,opacity:0.6,marginTop:1}}>{s.handle}</div>
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{borderTop:'1px solid var(--border)',paddingTop:24,display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:12,alignItems:'center'}}>
        <p style={{fontSize:11,color:'rgba(245,240,232,0.3)'}}>2025 AJ EDITS. All rights reserved.</p>
        <div style={{display:'flex',gap:16}}>
          {SOCIALS.map(s=>(
            <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
              style={{color:'rgba(245,240,232,0.2)',fontSize:10,letterSpacing:'0.15em',textDecoration:'none',transition:'color 0.3s'}}
              onMouseEnter={e=>e.currentTarget.style.color=s.color}
              onMouseLeave={e=>e.currentTarget.style.color='rgba(245,240,232,0.2)'}>
              {s.name.toUpperCase()}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const [intro,setIntro]=useState(true);
  const [page,setPage]=useState('home');
  const [user,setUser]=useState(null);
  const [newBookingsCount,setNewBookingsCount]=useState(0);

  // Poll for new bookings count for admin badge
  useEffect(()=>{
    if(!user||user.role!=='admin') return;
    const check=async()=>{
      const bookings=await DB.getBookings();
      const seen=await store.get('admin:seen_bookings')||0;
      setNewBookingsCount(Math.max(0,(bookings||[]).length-seen));
    };
    check();
    const t=setInterval(check,30000);
    return()=>clearInterval(t);
  },[user]);

  return (
    <>
      <style>{G}</style>
      <div className="noise-bg"/>
      {intro&&<IntroScreen onComplete={()=>setIntro(false)}/>}
      {!intro&&(
        <div style={{animation:'fadeIn 0.8s ease'}}>
          <Nav setPage={setPage} page={page} user={user} setUser={setUser} newBookingsCount={newBookingsCount}/>
          {page==='home'&&(
            <>
              <Hero setPage={setPage}/>
              <BeforeAfter/>
              <Services/>
              <Testimonials/>
              <Pricing setPage={setPage}/>
              <Footer/>
            </>
          )}
          {page==='login'&&<Login setPage={setPage} setUser={setUser}/>}
          {page==='dashboard'&&user&&<ClientDashboard user={user} setPage={setPage}/>}
          {page==='admin'&&user&&user.role==='admin'&&<AdminDashboard user={user}/>}
          <FloatingContact/>
        </div>
      )}
    </>
  );
}
