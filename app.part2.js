"use strict";
/* ============================================================
   GLOSSMITH CRM — frontend part 2
   Job detail · payments · clear balance · WhatsApp · PDF ·
   More (promos/commission/reports/dev) · Demo backend.
   Modules defined here are Object.assign'd onto the const
   placeholders declared in index.html.
   ============================================================ */

/* ===================== MODAL HELPER ===================== */
function openModal(html){
  const root=$("modalRoot");
  root.innerHTML=`<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-grab"></div>${html}</div></div>`;
}
function closeModal(){ $("modalRoot").innerHTML=""; }

/* ===================== CLEAR BALANCE / ADD PAYMENT ===================== */
Object.assign(ClearBalance,{
  state:null,
  open(jobId){
    const j=State.job(jobId); if(!j)return;
    this.state={jobId,method:"M-Pesa",amount:j.balance,mpesaCode:""};
    this.render();
  },
  render(){
    const s=this.state; const j=State.job(s.jobId); if(!j)return;
    const c=State.customer(j.customerId)||{};
    openModal(`
      <h3>Receive payment</h3>
      <div style="font-size:12.5px;color:var(--muted);margin-bottom:16px">${esc(c.name||"")} · ${esc(j.jobNo||"")}</div>
      <div class="card" style="margin-bottom:16px">
        <div class="row-line"><span class="muted">Total</span><strong>${money(j.finalAmount)}</strong></div>
        <div class="row-line"><span class="muted">Already paid</span><strong>${money(j.totalPaid)}</strong></div>
        <div class="row-line"><span class="muted">Outstanding balance</span><strong style="color:var(--warn)">${money(j.balance)}</strong></div>
      </div>
      <label>Payment method</label>
      <div class="method-row">
        <button type="button" class="method-btn ${s.method==="Cash"?"active":""}" onclick="ClearBalance.method('Cash')">Cash</button>
        <button type="button" class="method-btn ${s.method==="M-Pesa"?"active":""}" onclick="ClearBalance.method('M-Pesa')">M-Pesa</button>
      </div>
      <label>Amount received (KSh)<input id="cb_amount" type="number" inputmode="numeric" value="${esc(s.amount)}"></label>
      <div id="cb_mpesaWrap"></div>
      <div id="cb_note" style="font-size:12px;color:var(--muted);margin:2px 0 14px"></div>
      <div class="btn-row">
        <button class="btn-2" onclick="closeModal()">Cancel</button>
        <button class="btn" style="flex:2" id="cb_go" onclick="ClearBalance.submit()">Receive payment</button>
      </div>`);
    this.mpesaField();
    $("cb_amount").addEventListener("input",e=>this.state.amount=e.target.value);
  },
  method(m){ this.state.method=m; this.render(); },
  mpesaField(){ const w=$("cb_mpesaWrap"); if(!w)return; if(this.state.method==="M-Pesa"){ w.innerHTML=`<label>M-Pesa transaction code<input id="cb_code" placeholder="e.g. QCH7XXXXX" style="text-transform:uppercase" value="${esc(this.state.mpesaCode)}"></label>`; $("cb_code").addEventListener("input",e=>this.state.mpesaCode=e.target.value.toUpperCase()); } else w.innerHTML=""; },
  async submit(){
    const s=this.state; const j=State.job(s.jobId); const note=$("cb_note");
    const amount=num(s.amount);
    if(amount<=0){ note.textContent="Enter an amount greater than zero."; note.style.color="var(--danger)"; return; }
    if(amount>j.balance+0.5){ note.textContent="Amount is more than the outstanding balance."; note.style.color="var(--danger)"; return; }
    if(s.method==="M-Pesa" && !s.mpesaCode.trim()){ note.textContent="Enter the M-Pesa transaction code."; note.style.color="var(--danger)"; return; }
    await act(async()=>{
      $("cb_go").disabled=true; note.textContent="Recording payment…"; note.style.color="var(--muted)";
      const res=await Api.call("addPayment",{jobId:s.jobId,amount,method:s.method,mpesaCode:s.mpesaCode,kind:j.totalPaid>0?"Final Payment":"Deposit",receivedBy:State.role});
      if(!handle(res)){ note.textContent=res&&res.message||"Failed"; note.style.color="var(--danger)"; const g=$("cb_go"); if(g)g.disabled=false; return; }
      await Api.load(); closeModal(); toast("Payment received");
      if(JobDetail.currentId===s.jobId) JobDetail.open(s.jobId); else Screens.render();
    });
  }
});

/* ===================== JOB DETAIL ===================== */
Object.assign(JobDetail,{
  currentId:null,
  open(jobId){
    const j=State.job(jobId); if(!j)return;
    this.currentId=jobId;
    const c=State.customer(j.customerId)||{}; const v=State.vehicle(j.vehicleId)||{};
    const idx=STAGES.indexOf(j.stage);
    const photos={before:[],during:[],after:[]};
    (j.photos||[]).forEach(p=>{ (photos[p.phase]||photos.before).push(p); });
    openModal(`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div><h3>${esc(c.name||"—")}</h3><div style="font-size:12.5px;color:var(--muted)">${esc(j.jobNo||"")} · ${esc(fmtPlate(v.plate))||"no plate"} · ${esc(v.make||"")} ${esc(v.model||"")}</div></div>
        <button onclick="closeModal()" style="background:none;border:none;color:var(--muted);font-size:26px;cursor:pointer;line-height:1">×</button>
      </div>
      <div style="margin:14px 0">${stageChip(j.stage)} <span class="chip ${j.balance>0?"warn":"lime"}" style="margin-left:6px">${esc(j.paymentStatus)}</span></div>

      <div class="section-title" style="margin-top:6px">Stage</div>
      <div class="stepper">${STAGES.map((st,i)=>`<div class="step ${i<idx?"done":""} ${i===idx?"current":""}" onclick="JobDetail.move('${j.id}','${st}')">${esc(STAGE_SHORT[st])}</div>`).join("")}</div>

      <div class="section-title">Financial summary</div>
      <div class="card">
        <div class="row-line"><span class="muted">${esc(j.services||"Service")}</span><strong>${money(j.amount)}</strong></div>
        ${num(j.discount)>0?`<div class="row-line"><span class="muted">Promo discount</span><strong>−${money(j.discount)}</strong></div>`:""}
        <div class="row-line"><span class="muted">Total</span><strong>${money(j.finalAmount)}</strong></div>
        <div class="row-line"><span class="muted">Paid</span><strong>${money(j.totalPaid)}</strong></div>
        <div class="row-line"><span class="muted">Balance</span><strong style="color:${balColor(j)}">${j.balance>0?money(j.balance):"PAID IN FULL"}</strong></div>
      </div>
      ${j.balance>0?`<button class="btn" style="margin-top:10px" onclick="ClearBalance.open('${j.id}')">Receive payment · ${money(j.balance)}</button>`:""}

      <div class="section-title">Payment history</div>
      ${(j.payments||[]).length?j.payments.map(p=>`<div class="row-line"><div><div>${money(p.amount)} · ${esc(p.method)}</div><div style="font-size:11px;color:var(--muted2)">${esc(p.kind||"")} ${p.mpesaCode?"· "+esc(p.mpesaCode):""} · ${shortDate(p.createdAt)}</div></div></div>`).join(""):`<div style="font-size:12.5px;color:var(--muted2);padding:6px 0">No payments recorded.</div>`}

      ${this.photoSection("Before",photos.before,"before",j.id)}
      ${this.photoSection("During",photos.during,"during",j.id)}
      ${this.photoSection("After",photos.after,"after",j.id)}

      <div class="section-title">Technician notes</div>
      <div id="jd_notes">${(j.notes||[]).length?j.notes.map(n=>`<div class="note-item"><div class="note-dot"></div><div><div>${esc(n.message)}</div><div style="font-size:10.5px;color:var(--muted2)">${esc(n.user||"")} · ${new Date(n.createdAt).toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</div></div></div>`).join(""):`<div style="font-size:12.5px;color:var(--muted2);padding:4px 0">No notes yet.</div>`}</div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <input id="jd_note" placeholder="Add a timeline note…">
        <button class="btn-2" style="flex:0 0 auto;padding:0 16px" onclick="JobDetail.addNote('${j.id}')">Add</button>
      </div>

      <div class="section-title">Share &amp; export</div>
      <div class="btn-row">
        <button class="btn-2" onclick="Wa.menu('${j.id}')">WhatsApp</button>
        <button class="btn-2" onclick="Pdf.jobCard('${j.id}')">Job card PDF</button>
        <button class="btn-2" onclick="Pdf.receipt('${j.id}')">Receipt PDF</button>
      </div>
      ${can("deleteJobs")?`<button class="btn-2" style="width:100%;margin-top:8px;color:var(--danger);border-color:rgba(224,112,104,0.3)" onclick="JobDetail.del('${j.id}')">Delete job</button>`:""}
      <div id="jd_note_status" style="font-size:12px;color:var(--muted);margin-top:10px"></div>
    `);
  },
  photoSection(label,photos,phase,jobId){
    return `<div class="section-title">${label} photos <span style="color:var(--muted2);font-weight:400">(${photos.length})</span></div>
      <div class="photo-strip">
        ${photos.map(p=>`<div class="photo-thumb"><img src="${esc(p.url)}" loading="lazy"><span style="position:absolute;bottom:3px;left:3px;background:rgba(0,0,0,.6);color:var(--lime);font-size:8px;font-weight:700;padding:1px 4px;border-radius:4px">✓ SAVED</span><button class="del" onclick="JobDetail.delPhoto('${p.id}')">×</button></div>`).join("")||`<div style="font-size:11.5px;color:var(--muted2);padding:8px 0">None yet.</div>`}
      </div>
      <div class="btn-row" style="margin-top:6px">
        <button class="btn-2" onclick="JobDetail.capture('${jobId}','${phase}',true)">📷 Camera</button>
        <button class="btn-2" onclick="JobDetail.capture('${jobId}','${phase}',false)">🖼️ Gallery</button>
      </div>
      <div id="ph_${phase}_status" style="font-size:11.5px;margin-top:6px"></div>`;
  },
  async move(id,stage){
    const j=State.job(id); if(stage===j.stage)return;
    if(stage==="Closed" && j.balance>0){ toast("This job still has an outstanding balance.",true); return; }
    await act(async()=>{ const res=await Api.call("setStage",{id,stage}); if(!handle(res))return; await Api.load(); toast("Moved to "+stage); this.open(id);
      if(stage==="In Progress")Wa.auto(id,"inprogress"); else if(stage==="Ready for Collection")Wa.auto(id,"ready"); });
  },
  async addNote(id){
    const inp=$("jd_note"); const msg=(inp.value||"").trim(); if(!msg)return;
    await act(async()=>{ const res=await Api.call("addNote",{jobId:id,message:msg,user:State.role}); if(!handle(res))return; await Api.load(); this.open(id); });
  },
  capture(jobId,phase,useCamera){
    const input=document.createElement("input"); input.type="file"; input.accept="image/*"; input.multiple=true;
    if(useCamera)input.capture="environment";
    input.onchange=async e=>{
      const files=[...(e.target.files||[])]; if(!files.length)return;
      const st=$("ph_"+phase+"_status");
      let saved=0, failed=0;
      for(let i=0;i<files.length;i++){
        if(st){st.textContent=`Uploading ${i+1} of ${files.length}…`;st.style.color="var(--muted)";}
        let ok=false;
        for(let attempt=0;attempt<2 && !ok;attempt++){
          try{
            const dataUrl=await compressImage(files[i],1280,0.7);
            const res=await Api.call("uploadPhoto",{jobId,phase,dataUrl});
            if(res && res.success){ ok=true; saved++; }
            else if(attempt===1){ failed++; if(st){st.textContent=(res&&res.message)||"Upload failed";} }
          }catch(err){ if(attempt===1){ failed++; if(st){st.textContent="Failed: "+(err.message||err);st.style.color="var(--danger)";} } }
        }
      }
      await Api.load();
      this.open(jobId); // re-render — the photos now render from the server = proof they saved
      const st2=$("ph_"+phase+"_status");
      if(st2){ if(failed){ st2.textContent=`✓ ${saved} saved · ${failed} failed — tap to retry the failed one(s).`; st2.style.color="var(--warn)"; }
               else { st2.textContent=`✓ ${saved} photo${saved===1?"":"s"} saved`+(State.demo?" (demo: on this device)":" to Google Drive"); st2.style.color="var(--lime)"; } }
      toast(failed?`${saved} saved, ${failed} failed`:`✓ ${saved} photo${saved===1?"":"s"} saved`, failed>0);
    };
    input.click();
  },
  async delPhoto(id){
    if(!confirm("Remove this photo?"))return;
    await act(async()=>{ const res=await Api.call("deletePhoto",{id}); if(!handle(res))return; await Api.load(); this.open(this.currentId); });
  },
  async del(id){
    if(!confirm("Delete this job and all its payments, photos and notes?"))return;
    await act(async()=>{ const res=await Api.call("deleteJob",{id}); if(!handle(res))return; await Api.load(); closeModal(); toast("Job deleted"); Screens.render(); });
  }
});

function compressImage(file,maxDim,quality){
  return new Promise((resolve,reject)=>{
    const img=new Image(); const reader=new FileReader();
    reader.onload=()=>{img.src=reader.result;}; reader.onerror=reject;
    img.onload=()=>{ let{width,height}=img;
      if(width>height&&width>maxDim){height=height*maxDim/width;width=maxDim;}
      else if(height>maxDim){width=width*maxDim/height;height=maxDim;}
      const cv=document.createElement("canvas"); cv.width=width; cv.height=height;
      cv.getContext("2d").drawImage(img,0,0,width,height);
      resolve(cv.toDataURL("image/jpeg",quality));
    }; img.onerror=reject; reader.readAsDataURL(file);
  });
}

/* ===================== WHATSAPP ===================== */
Object.assign(Wa,{
  menu(jobId){
    const j=State.job(jobId); if(!j)return; const c=State.customer(j.customerId)||{};
    const phones=[c.primaryPhone].concat(JSON.parse(c.extraPhones||"[]")).filter(Boolean);
    openModal(`
      <h3>Share via WhatsApp</h3>
      <div style="font-size:12.5px;color:var(--muted);margin-bottom:14px">${esc(c.name||"")} · sends to ${esc(normPhoneIntl(c.primaryPhone))||"no number"}</div>
      ${phones.length>1?`<label>Send to<select id="wa_phone">${phones.map((p,i)=>`<option value="${esc(p)}" ${i===0?"selected":""}>${esc(normPhoneIntl(p))}</option>`).join("")}</select></label>`:``}
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px">
        <button class="btn-2" onclick="Wa.send('${jobId}','jobcard')">📋 Share job card</button>
        <button class="btn-2" onclick="Wa.send('${jobId}','receipt')">🧾 Share receipt</button>
        <button class="btn-2" onclick="Wa.send('${jobId}','inprogress')">🔧 Work in progress</button>
        <button class="btn-2" onclick="Wa.send('${jobId}','ready')">✅ Ready for collection</button>
        <button class="btn-2" onclick="Wa.send('${jobId}','completed')">🏁 Job completed</button>
        <button class="btn-2" onclick="Wa.send('${jobId}','payment')">💳 Payment confirmation</button>
        <button class="btn-2" onclick="Wa.send('${jobId}','photos')">📸 Progress photos</button>
      </div>
      <button class="btn-2" style="width:100%;margin-top:12px" onclick="closeModal()">Close</button>`);
  },
  phone(c){ const sel=$("wa_phone"); return sel?sel.value:c.primaryPhone; },
  msg(type,j,c,v){
    const car=[v.make,v.model].filter(Boolean).join(" ")+" ("+fmtPlate(v.plate)+")";
    const bal=j.balance>0?money(j.balance):"nil — paid in full";
    switch(type){
      case "jobcard": return `Hello ${c.name||""}, here is your Glossmith job card.\n\nJob: ${j.jobNo}\nVehicle: ${car}\nServices: ${j.services}\n\nTotal: ${money(j.finalAmount)}\nPaid: ${money(j.totalPaid)}\nBalance: ${bal}\n\nThank you for choosing Glossmith.`;
      case "receipt": return `Glossmith receipt — ${j.jobNo}\n\n${j.services}\nTotal: ${money(j.finalAmount)}\nPaid: ${money(j.totalPaid)}\nBalance: ${bal}\n\nWe appreciate your business. ✨`;
      case "inprogress": return `Hello ${c.name||""}, good news — work has started on your ${car} at Glossmith. 🔧✨\n\nService: ${j.services}\nWe'll let you know the moment it's ready for collection.\n\nGlossmith`;
      case "ready": return `Hello ${c.name||""}, your ${car} is ready for collection at Glossmith! 🚗✨\n\nOutstanding balance: ${bal}.\nSee you soon.`;
      case "completed": return `Hello ${c.name||""}, the work on your ${car} is complete. ${j.services}.\n\nBalance: ${bal}. Thank you for trusting Glossmith.`;
      case "payment": return `Payment confirmed — thank you ${c.name||""}!\n\nJob ${j.jobNo} · ${car}\nPaid to date: ${money(j.totalPaid)}\nBalance: ${bal}\n\nGlossmith`;
      case "photos": { const urls=(j.photos||[]).map(p=>p.url); return `Hello ${c.name||""}, progress photos for your ${car}:\n\n`+(urls.length?urls.join("\n"):"(photos will be shared shortly)")+`\n\nGlossmith`; }
      default: return "";
    }
  },
  open(digits,msg){ const enc=encodeURIComponent(msg); const url=isMobile()?`https://wa.me/${digits}?text=${enc}`:`https://web.whatsapp.com/send?phone=${digits}&text=${enc}`; window.open(url,"_blank"); },
  // Auto-prepare a message to the customer's PRIMARY number (used on stage change).
  auto(jobId,type){
    const j=State.job(jobId); if(!j)return; const c=State.customer(j.customerId)||{}; const v=State.vehicle(j.vehicleId)||{};
    const digits=waDigits(c.primaryPhone); if(!digits){ toast("Stage updated — no phone on file to message",false); return; }
    this.open(digits,this.msg(type,j,c,v));
    toast(type==="ready"?"Opening 'ready for collection' WhatsApp…":"Opening 'work started' WhatsApp…");
  },
  send(jobId,type){
    const j=State.job(jobId); const c=State.customer(j.customerId)||{}; const v=State.vehicle(j.vehicleId)||{};
    const digits=waDigits(this.phone(c));
    if(!digits){ toast("No phone number on file",true); return; }
    const msg=this.msg(type,j,c,v);
    this.open(digits,msg); closeModal();
  }
});

/* ===================== PDF (branded) ===================== */
Object.assign(Pdf,{
  shell(title,body){
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
    <style>
      *{box-sizing:border-box;} body{font-family:'Helvetica Neue',Arial,sans-serif;color:#111;margin:0;padding:34px;max-width:720px;margin:auto;}
      .hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0d0d0d;padding-bottom:16px;margin-bottom:8px;}
      .logo{width:44px;height:44px;border-radius:11px;background:#B8FF00;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;color:#0d0d0d;font-family:Arial;}
      .brand{font-weight:700;font-size:20px;letter-spacing:-0.5px;} .brand span{color:#7a9e00;}
      .muted{color:#666;font-size:12px;} h2{font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#0d0d0d;margin:22px 0 8px;border-bottom:1px solid #eee;padding-bottom:5px;}
      table{width:100%;border-collapse:collapse;} td{padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:13.5px;} .tot td{font-weight:700;border-bottom:2px solid #0d0d0d;}
      .paid{color:#3a8a1f;font-weight:700;} .due{color:#c47a1a;font-weight:700;}
      .grid{display:flex;flex-wrap:wrap;gap:6px;} .grid img{width:31.5%;height:120px;object-fit:cover;border-radius:6px;}
      .foot{margin-top:26px;display:flex;justify-content:space-between;align-items:flex-end;} .qr{text-align:center;font-size:10px;color:#888;}
      ul{margin:6px 0;padding-left:18px;font-size:13px;} .badge{display:inline-block;background:#0d0d0d;color:#B8FF00;font-size:11px;font-weight:700;padding:3px 9px;border-radius:5px;}
    </style></head><body>${body}<script>setTimeout(function(){window.print();},500);<\/script></body></html>`;
  },
  header(j,c,v,sub){
    return `<div class="hd"><div style="display:flex;gap:12px;align-items:center"><div class="logo">G</div><div><div class="brand">Gloss<span>mith</span></div><div class="muted">Premium automotive detailing</div></div></div>
      <div style="text-align:right"><div class="badge">${esc(sub)}</div><div class="muted" style="margin-top:6px">${esc(j.jobNo||"")}<br>${shortDate(j.createdAt)}</div></div></div>
      <div style="margin:14px 0;font-size:13.5px"><strong>${esc(c.name||"—")}</strong> · ${esc(normPhoneIntl(c.primaryPhone))}<br>
      <span class="muted">${esc([v.make,v.model,v.year,v.colour].filter(Boolean).join(" · "))} · ${esc(fmtPlate(v.plate))||"no plate"}</span></div>`;
  },
  qr(j){
    const data=encodeURIComponent("Glossmith "+(j.jobNo||"")+" | "+money(j.finalAmount)+" | bal "+money(j.balance));
    return `<div class="qr"><img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${data}" width="90" height="90"><br>${esc(j.jobNo||"")}</div>`;
  },
  finance(j){
    return `<h2>Financial summary</h2><table>
      <tr><td>${esc(j.services||"Service")}</td><td style="text-align:right">${money(j.amount)}</td></tr>
      ${num(j.discount)>0?`<tr><td>Promo discount</td><td style="text-align:right">−${money(j.discount)}</td></tr>`:""}
      <tr class="tot"><td>Total</td><td style="text-align:right">${money(j.finalAmount)}</td></tr>
      <tr><td>Paid</td><td style="text-align:right">${money(j.totalPaid)}</td></tr>
      <tr class="tot"><td>Balance</td><td style="text-align:right" class="${j.balance>0?"due":"paid"}">${j.balance>0?money(j.balance):"PAID IN FULL"}</td></tr>
    </table>
    ${(j.payments||[]).length?`<h2>Payment history</h2><table>${j.payments.map(p=>`<tr><td>${shortDate(p.createdAt)} · ${esc(p.method)} ${p.mpesaCode?"· "+esc(p.mpesaCode):""}<br><span class="muted">${esc(p.kind||"")}</span></td><td style="text-align:right">${money(p.amount)}</td></tr>`).join("")}</table>`:""}`;
  },
  print(html){ const w=window.open("","_blank"); if(!w){ toast("Allow pop-ups to export PDF",true); return; } w.document.write(html); w.document.close(); },
  jobCard(id){
    const j=State.job(id); const c=State.customer(j.customerId)||{}; const v=State.vehicle(j.vehicleId)||{};
    const photos={before:[],during:[],after:[]}; (j.photos||[]).forEach(p=>{(photos[p.phase]||photos.before).push(p);});
    const notes=(j.notes||[]);
    const photoBlock=(label,arr)=>arr.length?`<h2>${label} photos</h2><div class="grid">${arr.map(p=>`<img src="${esc(p.url)}">`).join("")}</div>`:"";
    const body=this.header(j,c,v,"Job card")+
      `<div style="font-size:13px"><span class="muted">Technician:</span> ${esc(j.technician||"—")} &nbsp;·&nbsp; <span class="muted">Stage:</span> ${esc(j.stage)}</div>`+
      this.finance(j)+
      (notes.length?`<h2>Technician timeline</h2><ul>${notes.map(n=>`<li>${esc(n.message)} <span class="muted">— ${shortDate(n.createdAt)}</span></li>`).join("")}</ul>`:"")+
      photoBlock("Before",photos.before)+photoBlock("During",photos.during)+photoBlock("After",photos.after)+
      `<div class="foot"><div class="muted">Glossmith · app.glossmith.com<br>Thank you for your business.</div>${this.qr(j)}</div>`;
    this.print(this.shell("Job card "+(j.jobNo||""),body));
  },
  receipt(id){
    const j=State.job(id); const c=State.customer(j.customerId)||{}; const v=State.vehicle(j.vehicleId)||{};
    const body=this.header(j,c,v,"Receipt")+this.finance(j)+
      `<div class="foot"><div class="muted">Glossmith · app.glossmith.com<br>Payment method: ${esc((j.payments||[]).map(p=>p.method).join(", ")||"—")}</div>${this.qr(j)}</div>`;
    this.print(this.shell("Receipt "+(j.jobNo||""),body));
  }
});

/* ===================== MORE (promos / commission / reports / dev) ===================== */
Object.assign(More,{
  tab:"reports",
  view(){
    const tabs=[];
    if(can("viewReports"))tabs.push(["reports","Reports"]);
    if(can("accounting"))tabs.push(["accounting","Accounting"]);
    if(can("viewPartners"))tabs.push(["partners","Partners"]);
    tabs.push(["members","Members"]);
    if(can("financials"))tabs.push(["promos","Promos"]);
    if(can("manageAccounts"))tabs.push(["accounts","Accounts"]);
    if(State.role==="owner")tabs.push(["dev","Developer"]);
    if(tabs.length&&!tabs.find(t=>t[0]===this.tab))this.tab=tabs[0][0];
    return `<div class="screen-title">More</div>
    ${tabs.length?`<div class="switch-tabs" style="flex-wrap:wrap">${tabs.map(t=>`<button class="switch-tab ${this.tab===t[0]?"active":""}" onclick="More.set('${t[0]}')">${t[1]}</button>`).join("")}</div>
    <div id="more_body">${this.body()}</div>`:`<div class="empty">Nothing here for your role. Use Home, Pipeline, ＋ and Vehicles.</div>`}`;
  },
  set(t){ this.tab=t; Screens.render(); },
  after(){ if(this.tab==="promos")this.wirePromo(); if(this.tab==="accounting")this.wireAccounting(); if(this.tab==="accounts")this.wireAccounts(); if(this.tab==="members")this.wireMembers(); if(this.tab==="partners")this.wirePartners(); },
  body(){ return this[this.tab]?this[this.tab]():""; },
  /* --- members (all roles view; only owner deletes) --- */
  members(){
    const members=(State.snapshot.members||[]).slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const clubs={}; members.forEach(m=>{const k=m.club||"Glossmith Club";clubs[k]=(clubs[k]||0)+1;});
    return `<div class="hint">Members enjoy an automatic discount on every job — applied the moment their phone is recognised. Club codes enrol customers automatically; you can also add members by hand.</div>
    <div style="max-width:520px"><div class="section-title" style="margin-top:0">Add member manually</div>
      <label>Name<input id="mb_name"></label>
      <label>Phone<input id="mb_phone" placeholder="07XX XXX XXX" inputmode="tel"></label>
      <div style="display:flex;gap:10px"><label style="flex:1">Club<input id="mb_club" value="Glossmith Club"></label><label style="flex:1">Discount (%)<input id="mb_disc" type="number" value="5"></label></div>
      <button class="btn" id="mb_add">Add member</button><div id="mb_note" style="font-size:12px;color:var(--muted);margin-top:8px"></div></div>
    <div class="section-title">Members <span style="color:var(--muted2);font-weight:400">(${members.length})</span></div>
    ${Object.keys(clubs).length?`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${Object.keys(clubs).map(k=>`<span class="chip lime">${esc(k)} · ${clubs[k]}</span>`).join("")}</div>`:""}
    ${members.length?members.map(m=>`<div class="card"><div style="display:flex;justify-content:space-between;gap:8px"><div><div style="font-weight:700">${esc(m.name||"—")}</div><div style="font-size:11.5px;color:var(--muted);margin-top:2px">${esc(m.phone||"")} · ${esc(m.club||"Glossmith Club")}</div><div style="font-size:11px;color:var(--muted2);margin-top:3px">${Math.round(num(m.discountRate)*100)}% off · ${m.source==="promo"?"via code "+esc(m.promoCode):"added manually"} · ${shortDate(m.createdAt)}</div></div><div style="text-align:right"><span class="chip lime">${Math.round(num(m.discountRate)*100)}%</span>${can("deleteJobs")?`<br><button class="btn-2" style="margin-top:8px;padding:4px 10px;color:var(--danger);border-color:rgba(224,112,104,0.3)" onclick="More.delMember('${m.id}')">Remove</button>`:""}</div></div></div>`).join(""):`<div class="empty">No members yet.</div>`}`;
  },
  wireMembers(){ const b=$("mb_add"); if(b)b.addEventListener("click",async()=>{
    const name=$("mb_name").value.trim(), phone=$("mb_phone").value.trim(), club=$("mb_club").value.trim()||"Glossmith Club", discountRate=num($("mb_disc").value||5)/100, note=$("mb_note");
    if(!name||!phone){ note.textContent="Enter name and phone."; note.style.color="var(--danger)"; return; }
    await act(async()=>{ const res=await Api.call("addMember",{name,phone,club,discountRate,source:"manual"}); if(!handle(res)){note.textContent=res&&res.message;note.style.color="var(--danger)";return;} await Api.load(); toast("Member added"); this.set("members"); });
  }); },
  async delMember(id){ if(!confirm("Remove this member? They'll lose their automatic discount."))return; await act(async()=>{ const res=await Api.call("deleteMember",{id}); if(!handle(res))return; await Api.load(); toast("Member removed"); this.set("members"); }); },
  /* --- partners (owner + manager; kept away from full financials) --- */
  partnerSel:"",
  partners(){
    const partners=(State.snapshot.partners||[]).filter(p=>p.jobs>0||p.commissionAccrued>0||p.paid>0);
    const pays=(State.snapshot.commissionPayments||[]).slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const totalOwed=partners.reduce((a,p)=>a+p.owed,0);
    const viewList=this.partnerSel?partners.filter(p=>p.code===this.partnerSel):partners;
    return `<div class="hint">Partner performance &amp; commissions only — no company financials here.</div>
    <div class="metric-grid">
      ${metric("Partners",partners.length,"with activity")}
      ${metric("Commission owed",money(totalOwed),"across all partners","warn")}
    </div>
    <div class="section-title">View partner</div>
    <select id="pt_view" style="margin-bottom:12px"><option value="">All partners</option>${partners.map(p=>`<option value="${esc(p.code)}" ${this.partnerSel===p.code?"selected":""}>${esc(p.partner)} (${esc(p.code)})</option>`).join("")}</select>
    ${viewList.length?viewList.map(p=>`<div class="card"><div style="display:flex;justify-content:space-between;gap:8px"><div><div style="font-weight:700">${esc(p.partner)}</div><div style="font-size:11.5px;color:var(--muted);margin-top:2px">${esc(p.code)}${p.club?" · "+esc(p.club):""} · ${Math.round(p.rate*100)}% commission</div></div><span class="chip">${p.jobs} job${p.jobs===1?"":"s"}</span></div>
      <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:12.5px;flex-wrap:wrap;gap:6px">
        <span>Revenue <strong>${money(p.revenue)}</strong></span>
        <span>Earned <strong>${money(p.commissionAccrued)}</strong></span>
        <span>Paid <strong>${money(p.paid)}</strong></span>
        <span>Owed <strong style="color:${p.owed>0?"var(--warn)":"var(--lime)"}">${money(p.owed)}</strong></span></div></div>`).join(""):`<div class="empty">No partner activity yet.</div>`}

    <div class="section-title">Pay commission</div>
    <div style="max-width:520px">
      <label>Partner<select id="pc_partner"><option value="">— Select partner —</option>${partners.map(p=>`<option value="${esc(p.code)}">${esc(p.partner)} — owed ${money(p.owed)}</option>`).join("")}</select></label>
      <div style="display:flex;gap:10px"><label style="flex:1">Amount (KSh)<input id="pc_amount" type="number" inputmode="numeric"></label><label style="flex:1">M-Pesa code<input id="pc_code" placeholder="confirm code" style="text-transform:uppercase"></label></div>
      <label>Note (optional)<input id="pc_note" placeholder="e.g. June payout"></label>
      <button class="btn" id="pc_pay">Record payment</button><div id="pc_msg" style="font-size:12px;color:var(--muted);margin-top:8px"></div></div>
    <div class="section-title">Recent payouts</div>
    ${pays.length?pays.map(c=>`<div class="card"><div style="display:flex;justify-content:space-between;gap:8px"><div><div style="font-weight:700;font-size:13.5px">${esc(c.partner)}</div><div style="font-size:11px;color:var(--muted);margin-top:2px">${esc(c.mpesaCode)}${c.note?" · "+esc(c.note):""} · ${shortDate(c.createdAt)}</div></div><div style="text-align:right"><strong>${money(c.amount)}</strong>${can("deleteJobs")?`<br><button class="btn-2" style="margin-top:6px;padding:4px 10px;color:var(--danger);border-color:rgba(224,112,104,0.3)" onclick="More.delPayout('${c.id}')">Delete</button>`:""}</div></div></div>`).join(""):`<div class="empty">No payouts recorded yet.</div>`}`;
  },
  wirePartners(){
    const v=$("pt_view"); if(v)v.addEventListener("change",e=>{ this.partnerSel=e.target.value; this.set("partners"); });
    const b=$("pc_pay"); if(b)b.addEventListener("click",async()=>{
      const promoCode=$("pc_partner").value, amount=num($("pc_amount").value), mpesaCode=$("pc_code").value.trim(), note=$("pc_note").value.trim(), msg=$("pc_msg");
      if(!promoCode){ msg.textContent="Select a partner."; msg.style.color="var(--danger)"; return; }
      if(amount<=0){ msg.textContent="Enter an amount."; msg.style.color="var(--danger)"; return; }
      if(!mpesaCode){ msg.textContent="Enter the M-Pesa code you paid with."; msg.style.color="var(--danger)"; return; }
      await act(async()=>{ const res=await Api.call("payCommission",{promoCode,amount,mpesaCode,note}); if(!handle(res)){msg.textContent=res&&res.message;msg.style.color="var(--danger)";return;} await Api.load(); toast("Commission payment recorded"); this.set("partners"); });
    });
  },
  async delPayout(id){ if(!confirm("Delete this payout? It will increase the amount owed again."))return; await act(async()=>{ const res=await Api.call("deleteCommissionPayment",{id}); if(!handle(res))return; await Api.load(); toast("Payout deleted"); this.set("partners"); }); },
  /* --- reports --- */
  reports(){
    const jobs=State.jobs(); const d=State.snapshot.dashboard||{};
    const cleared=jobs.filter(j=>j.balance<=0&&j.finalAmount>0);
    const outstanding=jobs.filter(j=>j.balance>0);
    return `<div class="metric-grid">
      ${metric("M-Pesa",money(d.mpesa),"collected")}
      ${metric("Cash",money(d.cash),"collected")}
      ${metric("Cleared",money(cleared.reduce((a,j)=>a+j.finalAmount,0)),cleared.length+" paid in full","lime")}
      ${metric("Outstanding",money(outstanding.reduce((a,j)=>a+j.balance,0)),outstanding.length+" owing",outstanding.length?"warn":"lime")}
    </div>
    <button class="btn-2" style="width:100%;margin:14px 0" onclick="Pdf.financial()">📄 Export financial summary (PDF)</button>
    <div class="section-title">Volume by influencer / partner</div>
    ${this.partnerVolume()}
    <div class="section-title">Outstanding balances</div>
    ${outstanding.length?outstanding.sort((a,b)=>b.balance-a.balance).map(j=>this.repRow(j)).join(""):`<div class="empty">All clear — nothing outstanding.</div>`}
    <div class="section-title">Recently cleared</div>
    ${cleared.length?cleared.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,8).map(j=>this.repRow(j)).join(""):`<div class="empty">Nothing cleared yet.</div>`}`;
  },
  partnerVolume(){
    const partners=(State.snapshot.partners||[]).filter(p=>p.jobs>0);
    if(!partners.length)return `<div class="empty">No promo-linked jobs yet.</div>`;
    const max=Math.max(1,...partners.map(p=>p.jobs));
    return partners.sort((a,b)=>b.jobs-a.jobs).map(p=>`<div class="card"><div style="display:flex;justify-content:space-between;gap:8px"><div style="font-weight:700;font-size:13.5px">${esc(p.partner)}</div><span class="chip">${p.jobs} job${p.jobs===1?"":"s"}</span></div>
      <div style="height:8px;background:#0f0f0f;border-radius:6px;margin-top:9px;overflow:hidden"><div style="height:100%;width:${Math.round(p.jobs/max*100)}%;background:var(--lime)"></div></div>
      <div style="font-size:11.5px;color:var(--muted);margin-top:7px">${esc(p.code)}${p.club?" · "+esc(p.club):""} · revenue ${money(p.revenue)}</div></div>`).join("");
  },
  repRow(j){ const c=State.customer(j.customerId)||{}; const v=State.vehicle(j.vehicleId)||{};
    return `<div class="card" onclick="JobDetail.open('${j.id}')" style="cursor:pointer"><div style="display:flex;justify-content:space-between;gap:8px"><div><div style="font-weight:700;font-size:13.5px">${esc(c.name||"—")} · ${esc(fmtPlate(v.plate))}</div><div style="font-size:11px;color:var(--muted);margin-top:2px">${esc(j.services||"—")} · ${shortDate(j.createdAt)}</div></div><span class="chip ${j.balance>0?"warn":"lime"}">${j.balance>0?money(j.balance):"PAID"}</span></div></div>`;
  },
  /* --- promos --- */
  promos(){
    const promos=State.snapshot.promos||[];
    return `<div style="max-width:520px"><div class="section-title" style="margin-top:0">Add promo code</div>
      <label>Code<input id="pr_code" placeholder="e.g. NAIROBICLUB" style="text-transform:uppercase"></label>
      <label>Partner / owner<input id="pr_owner" placeholder="e.g. Nairobi Car Club"></label>
      <label>Club (optional) — customers who use this code auto-join this club<input id="pr_club" placeholder="e.g. Nairobi Car Club"></label>
      <label>Category<select id="pr_cat">${C.CATEGORIES.map(c=>`<option>${c}</option>`).join("")}</select></label>
      <label>Customer discount (%) — taken off the customer's price<input id="pr_disc" type="number" value="8" min="0" max="100"></label>
      <label>Partner commission (%) — paid to the partner<input id="pr_rate" type="number" value="10" min="0" max="100"></label>
      <button class="btn" id="pr_add">Add code</button><div id="pr_note" style="font-size:12px;color:var(--muted);margin-top:8px"></div></div>
      <div class="section-title">Active codes</div>
      ${promos.length?promos.map(p=>{const uses=State.jobs().filter(j=>String(j.promoCode).toUpperCase()===String(p.code).toUpperCase()).length;const dr=p.discountRate===undefined?0.08:num(p.discountRate);return `<div class="card"><div style="display:flex;justify-content:space-between"><div><div style="font-weight:700">${esc(p.code)}</div><div style="font-size:11.5px;color:var(--muted)">${esc(p.owner)} · ${esc(p.category)}</div><div style="font-size:11px;color:var(--muted2);margin-top:3px">${Math.round(dr*100)}% customer discount · ${Math.round(num(p.rate)*100)}% partner commission</div></div><span class="chip">${uses} use${uses===1?"":"s"}</span></div>${can("deleteJobs")?`<button class="btn-2" style="margin-top:8px;color:var(--danger);border-color:rgba(224,112,104,0.3)" onclick="More.delPromo('${p.id}')">Delete</button>`:""}</div>`;}).join(""):`<div class="empty">No promo codes yet.</div>`}`;
  },
  wirePromo(){ const b=$("pr_add"); if(b)b.addEventListener("click",async()=>{
    const code=$("pr_code").value.trim(), owner=$("pr_owner").value.trim(), club=$("pr_club").value.trim(), category=$("pr_cat").value, rate=num($("pr_rate").value||10)/100, discountRate=num($("pr_disc").value||8)/100, note=$("pr_note");
    if(!code||!owner){ note.textContent="Enter code and partner."; note.style.color="var(--danger)"; return; }
    await act(async()=>{ const res=await Api.call("addPromo",{code,owner,club,category,rate,discountRate}); if(!handle(res)){note.textContent=res&&res.message;note.style.color="var(--danger)";return;} await Api.load(); toast("Promo added"); this.set("promos"); });
  }); },
  async delPromo(id){ if(!confirm("Delete this promo?"))return; await act(async()=>{ const res=await Api.call("deletePromo",{id}); if(!handle(res))return; await Api.load(); toast("Deleted"); this.set("promos"); }); },
  /* --- accounting 360 --- */
  accounting(){
    const a=State.snapshot.accounting||{};
    const cats=EXPENSE_CATS;
    const showProfit=can("viewProfit");
    const flow=[
      ["Revenue earned",a.revenue||0,"var(--lime)","+"],
      ["Customer discounts",-(a.discounts||0),"var(--warn)","−"],
      ["Job cost / COGS",-(a.cogs||0),"var(--warn)","−"],
      ["Partner commissions",-(a.commissions||0),"var(--warn)","−"],
      ["Operating expenses",-(a.expenses||0),"var(--warn)","−"],
    ];
    const netTone=(a.netProfit||0)>=0?"var(--lime)":"var(--danger)";
    const byCat=a.expenseByCat||{};
    return `<div class="metric-grid">
      ${showProfit?metric("Net profit",money(a.netProfit),(a.margin||0)+"% margin",(a.netProfit||0)>=0?"lime":"warn"):metric("Expenses",money(a.expenses),"total logged","warn")}
      ${metric("Revenue",money(a.revenue),"paid-in-full jobs","lime")}
      ${showProfit?metric("Gross profit",money(a.grossProfit),"after discounts + COGS"):metric("Commissions",money(a.commissions),"partner payouts")}
      ${metric("Collected",money(a.collected),"cash in the door")}
    </div>
    ${showProfit?`<div class="section-title">Where the money goes</div>
    <div class="card">
      ${flow.map(f=>`<div class="row-line"><span class="muted">${f[3]} ${esc(f[0])}</span><strong style="color:${f[2]}">${money(Math.abs(f[1]))}</strong></div>`).join("")}
      <div class="row-line" style="border-top:2px solid var(--border2)"><span style="font-weight:700">= Net profit</span><strong style="color:${netTone};font-size:16px">${money(a.netProfit)}</strong></div>
    </div>`:""}

    <div class="section-title">Revenue by service</div>
    ${this.serviceChart(a.revenueByService||[])}

    <div class="section-title">💡 Insights</div>
    <div class="card" style="font-size:13px;line-height:1.6;color:#d2d2d2">${showProfit?this.insights(a).map(t=>`<div style="display:flex;gap:8px;margin-bottom:6px"><span style="color:var(--lime)">•</span><span>${t}</span></div>`).join(""):`<div style="color:var(--muted)">Profit insights are visible to the owner only.</div>`}</div>

    <div class="section-title">Expenses ledger</div>
    ${can("manageExpenses")?`<div style="max-width:520px">
      <label>Category<select id="ex_cat">${cats.map(c=>`<option>${c}</option>`).join("")}</select></label>
      <label>Description<input id="ex_desc" placeholder="e.g. Ceramic coating stock"></label>
      <div style="display:flex;gap:10px"><label style="flex:1">Amount (KSh)<input id="ex_amt" type="number" inputmode="numeric"></label><label style="flex:1">Method<select id="ex_method"><option>Cash</option><option>M-Pesa</option></select></label></div>
      <label>Type<select id="ex_rec"><option value="one-off">One-off</option><option value="monthly">Monthly / recurring</option></select></label>
      <button class="btn" id="ex_add">Add expense</button><div id="ex_note" style="font-size:12px;color:var(--muted);margin-top:8px"></div></div>`:""}
    ${Object.keys(byCat).length?`<div class="card" style="margin-top:12px">${Object.keys(byCat).sort((x,y)=>byCat[y]-byCat[x]).map(k=>`<div class="row-line"><span class="muted">${esc(k)}</span><strong>${money(byCat[k])}</strong></div>`).join("")}<div class="row-line" style="border-top:2px solid var(--border2)"><span style="font-weight:700">Total expenses</span><strong style="color:var(--warn)">${money(a.expenses)}</strong></div></div>`:""}
    <div style="margin-top:10px">${this.expenseList()}</div>

    <div class="section-title">Commissions</div>
    ${this.commissionBlock()}`;
  },
  serviceChart(rows){
    if(!rows.length)return `<div class="empty">No earned revenue yet.</div>`;
    const total=rows.reduce((a,r)=>a+r.revenue,0)||1;
    const palette=["#B8FF00","#7aa8ff","#e0a94a","#e07068","#66d9c2","#c79bff","#8a8a8a"];
    let acc=0; const segs=rows.slice(0,7).map((r,i)=>{const start=acc/total*360;acc+=r.revenue;const end=acc/total*360;return `${palette[i%palette.length]} ${start}deg ${end}deg`;}).join(",");
    return `<div class="card"><div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
      <div style="width:120px;height:120px;border-radius:50%;background:conic-gradient(${segs});flex:0 0 auto"></div>
      <div style="flex:1;min-width:180px">${rows.slice(0,7).map((r,i)=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:12.5px"><span style="width:11px;height:11px;border-radius:3px;background:${palette[i%palette.length]};flex:0 0 auto"></span><span style="flex:1;color:#d2d2d2">${esc(r.service)}</span><strong>${money(r.revenue)}</strong><span style="color:var(--muted2);width:36px;text-align:right">${Math.round(r.revenue/total*100)}%</span></div>`).join("")}</div>
    </div></div>`;
  },
  insights(a){
    const out=[]; const rbs=a.revenueByService||[];
    if(rbs.length){ const top=rbs[0]; const share=a.revenue?Math.round(top.revenue/a.revenue*100):0; out.push(`<strong>${esc(top.service)}</strong> is your top earner at ${money(top.revenue)} (${share}% of revenue).`); }
    if((a.margin||0)<20 && a.revenue>0) out.push(`Net margin is <strong>${a.margin}%</strong> — below a healthy 20%. Trim expenses or raise prices on low-margin services.`);
    else if(a.revenue>0) out.push(`Net margin is a healthy <strong>${a.margin}%</strong>.`);
    if((a.expenses||0) > (a.revenue||0)*0.4 && a.revenue>0) out.push(`Expenses are ${Math.round(a.expenses/a.revenue*100)}% of revenue — watch overheads.`);
    if((a.commissions||0)>0) out.push(`Partner commissions cost ${money(a.commissions)} — factor this into promo discount %.`);
    const outstanding=(State.snapshot.dashboard||{}).outstanding||0;
    if(outstanding>0) out.push(`${money(outstanding)} is still owed across open jobs — chase balances to lift cash flow.`);
    if(!out.length) out.push("Log a few jobs and expenses to unlock insights.");
    return out;
  },
  expenseList(){
    const ex=(State.snapshot.expenses||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
    if(!ex.length)return `<div class="empty">No expenses logged yet.</div>`;
    return ex.map(e=>`<div class="card"><div style="display:flex;justify-content:space-between;gap:8px"><div><div style="font-weight:700;font-size:13.5px">${esc(e.category)} <span class="chip" style="margin-left:4px">${esc(e.recurring||"one-off")}</span></div><div style="font-size:11.5px;color:var(--muted);margin-top:2px">${esc(e.description||"—")} · ${esc(e.method||"")} · ${shortDate(e.date)}</div></div><div style="text-align:right"><strong style="color:var(--warn)">${money(e.amount)}</strong>${can("manageExpenses")?`<br><button class="btn-2" style="margin-top:6px;padding:4px 10px;color:var(--danger);border-color:rgba(224,112,104,0.3)" onclick="More.delExpense('${e.id}')">Delete</button>`:""}</div></div></div>`).join("");
  },
  commissionBlock(){
    const jobs=State.jobs(); const promos=State.snapshot.promos||[]; const staff=State.snapshot.staff||[];
    const rateOf=p=>{const r=num(p&&p.rate);return r>1?r/100:(r>0?r:0.10);};
    const pMap={}; jobs.forEach(j=>{ if(!j.promoCode)return; const p=promos.find(x=>String(x.code).toUpperCase()===String(j.promoCode).toUpperCase()); if(!p)return; const comm=Math.round(j.finalAmount*rateOf(p)); const k=p.owner||p.code; (pMap[k]=pMap[k]||{owner:p.owner||p.code,code:p.code,rate:rateOf(p),pending:0,payable:0}); if(j.balance<=0&&j.finalAmount>0)pMap[k].payable+=comm; else pMap[k].pending+=comm; });
    const partners=Object.values(pMap);
    return `${partners.length?partners.map(r=>`<div class="card"><div style="display:flex;justify-content:space-between"><div><div style="font-weight:700">${esc(r.owner)}</div><div style="font-size:11.5px;color:var(--muted)">${esc(r.code)} · ${Math.round(r.rate*100)}%</div></div></div><div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12.5px"><span>Payable now <strong style="color:var(--lime)">${money(r.payable)}</strong></span><span>Pending <strong style="color:var(--warn)">${money(r.pending)}</strong></span></div></div>`).join(""):`<div class="empty">No partner commissions yet.</div>`}`;
  },
  wireAccounting(){
    const b=$("ex_add"); if(b)b.addEventListener("click",async()=>{
      const category=$("ex_cat").value, description=$("ex_desc").value.trim(), amount=num($("ex_amt").value), method=$("ex_method").value, recurring=$("ex_rec").value, note=$("ex_note");
      if(amount<=0){ note.textContent="Enter an amount greater than zero."; note.style.color="var(--danger)"; return; }
      await act(async()=>{ const res=await Api.call("addExpense",{category,description,amount,method,recurring}); if(!handle(res)){note.textContent=res&&res.message;note.style.color="var(--danger)";return;} await Api.load(); toast("Expense added"); this.set("accounting"); });
    });
  },
  async delExpense(id){ if(!confirm("Delete this expense?"))return; await act(async()=>{ const res=await Api.call("deleteExpense",{id}); if(!handle(res))return; await Api.load(); toast("Deleted"); this.set("accounting"); }); },
  /* --- accounts (owner only) --- */
  accounts(){
    const users=State.snapshot.users||[];
    return `<div style="max-width:520px"><div class="section-title" style="margin-top:0">Create account</div>
      <label>Username<input id="ac_user" autocapitalize="none" placeholder="e.g. james"></label>
      <label>Password<input id="ac_pass" type="text" placeholder="min 4 characters"></label>
      <label>Role<select id="ac_role"><option value="sales">Sales — log jobs & take payments</option><option value="manager">Manager — money & accounting, no account admin</option><option value="owner">Owner — full access</option></select></label>
      <button class="btn" id="ac_add">Create account</button><div id="ac_note" style="font-size:12px;color:var(--muted);margin-top:8px"></div></div>
      <div class="section-title">Access levels</div>
      <div class="card" style="font-size:12px;color:#c2c2c2;line-height:1.6">
        <div style="margin-bottom:6px"><strong style="color:var(--lime)">Owner</strong> — everything, incl. accounts, delete, all financials.</div>
        <div style="margin-bottom:6px"><strong style="color:var(--info)">Manager</strong> — reports, accounting, expenses, promos; cannot delete records or manage accounts.</div>
        <div><strong>Sales</strong> — log jobs, take payments, photos, notes, WhatsApp. No financial dashboards, reports, accounting or delete.</div>
      </div>
      <div class="section-title">Accounts</div>
      ${State.demo?`<div class="hint warn">In demo mode accounts are stored on this device only.</div>`:""}
      ${users.length?users.map(u=>this.userCard(u)).join(""):`<div class="empty">No accounts.</div>`}`;
  },
  userCard(u){
    const me=State.username&&String(State.username).toLowerCase()===String(u.username).toLowerCase();
    const revoked=u.active===false;
    const locked=u.protected===true;
    const desc={owner:"Owner · full access",manager:"Manager · money & accounting",sales:"Sales · standard access"}[u.role]||"Sales · standard access";
    return `<div class="card" style="${revoked?"opacity:.6":""}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div><div style="font-weight:700">${esc(u.username)} ${me?`<span style="font-size:10px;color:var(--muted2)">(you)</span>`:""}</div>
        <div style="font-size:11.5px;color:var(--muted);margin-top:2px">${desc}</div></div>
        <span class="chip ${locked?"lime":revoked?"danger":"lime"}">${locked?"🔒 Locked":revoked?"Revoked":"Active"}</span></div>
      ${locked?`<div style="font-size:11.5px;color:var(--muted2);margin-top:8px">Primary owner — username, role & status are permanent. You can still change its password below.</div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <input id="pw_${u.id}" type="text" placeholder="New owner password" style="flex:1">
        <button class="btn-2" style="flex:0 0 auto;padding:0 14px" onclick="More.changePw('${u.id}')">Change</button>
      </div>`:`
      <div style="display:flex;gap:8px;margin-top:10px">
        <input id="pw_${u.id}" type="text" placeholder="New password" style="flex:1">
        <button class="btn-2" style="flex:0 0 auto;padding:0 14px" onclick="More.changePw('${u.id}')">Change</button>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <select id="rl_${u.id}" style="flex:1">${ROLES.map(r=>`<option value="${r}" ${r===u.role?"selected":""}>${ROLE_LABEL[r]}</option>`).join("")}</select>
        <button class="btn-2" style="flex:0 0 auto;padding:0 14px" onclick="More.changeRole('${u.id}')">Set role</button>
      </div>
      <div class="btn-row" style="margin-top:8px">
        <button class="btn-2" onclick="More.toggleRevoke('${u.id}',${revoked})">${revoked?"Restore access":"Revoke access"}</button>
        ${me?"":`<button class="btn-2" style="color:var(--danger);border-color:rgba(224,112,104,0.3)" onclick="More.delUser('${u.id}')">Delete</button>`}
      </div>`}
    </div>`;
  },
  wireAccounts(){ const b=$("ac_add"); if(b)b.addEventListener("click",async()=>{
    const username=$("ac_user").value.trim(), password=$("ac_pass").value, role=$("ac_role").value, note=$("ac_note");
    if(!username||!password){ note.textContent="Enter username and password."; note.style.color="var(--danger)"; return; }
    if(password.length<4){ note.textContent="Password must be at least 4 characters."; note.style.color="var(--danger)"; return; }
    await act(async()=>{ const res=await Api.call("addUser",{username,password,role}); if(!handle(res)){note.textContent=res&&res.message;note.style.color="var(--danger)";return;} await Api.load(); toast("Account created"); this.set("accounts"); });
  }); },
  async changePw(id){ const inp=$("pw_"+id); const pw=(inp.value||"").trim(); if(pw.length<4){ toast("Password must be at least 4 characters",true); return; }
    await act(async()=>{ const res=await Api.call("updateUser",{id,password:pw}); if(!handle(res))return; await Api.load(); toast("Password changed"); this.set("accounts"); }); },
  async changeRole(id){ const sel=$("rl_"+id); const role=sel?sel.value:null; if(!role)return;
    await act(async()=>{ const res=await Api.call("updateUser",{id,role}); if(!handle(res))return; await Api.load(); toast("Role updated"); this.set("accounts"); }); },
  async toggleRevoke(id,currentlyRevoked){ if(!currentlyRevoked && !confirm("Revoke this account's access? They won't be able to sign in."))return;
    await act(async()=>{ const res=await Api.call("updateUser",{id,active:currentlyRevoked}); if(!handle(res))return; await Api.load(); toast(currentlyRevoked?"Access restored":"Access revoked"); this.set("accounts"); }); },
  async delUser(id){ if(!confirm("Delete this account permanently?"))return;
    await act(async()=>{ const res=await Api.call("deleteUser",{id}); if(!handle(res))return; await Api.load(); toast("Account deleted"); this.set("accounts"); }); },
  /* --- dev --- */
  dev(){
    const s=State.snapshot;
    return `<div class="section-title" style="margin-top:0">Developer mode</div>
      <div class="card">
        <div class="row-line"><span class="muted">Environment</span><strong>${State.demo?"DEMO (no backend)":esc(s.environment||"—")}</strong></div>
        <div class="row-line"><span class="muted">App version</span><strong>${APP_VERSION}</strong></div>
        <div class="row-line"><span class="muted">Backend version</span><strong style="color:${!State.demo&&s.version!==EXPECTED_BACKEND?"var(--danger)":"var(--lime)"}">${esc(s.version||"—")}</strong></div>
        <div class="row-line"><span class="muted">Backend build</span><strong>${esc(s.build||"—")}</strong></div>
        <div class="row-line"><span class="muted">Expected backend</span><strong>${EXPECTED_BACKEND}</strong></div>
        <div class="row-line"><span class="muted">Records</span><strong>${(s.jobs||[]).length} jobs · ${(s.vehicles||[]).length} veh · ${(s.customers||[]).length} cust</strong></div>
      </div>
      <button class="btn-2" style="width:100%;margin-top:12px" onclick="UI.connect()">🔌 Connect / change backend</button>
      <button class="btn-2" style="width:100%;margin-top:8px" onclick="UI.health()">🩺 Run health check</button>
      ${State.demo?`<div class="hint warn" style="margin-top:12px">You're in demo mode with sample data stored on this device. Connect a backend to go live.</div>`:""}
      <div id="dev_health" style="font-size:12px;color:var(--muted);margin-top:10px;white-space:pre-wrap"></div>`;
  }
});
Pdf.financial=function(){
  const jobs=State.jobs(); const d=State.snapshot.dashboard||{};
  const outstanding=jobs.filter(j=>j.balance>0); const cleared=jobs.filter(j=>j.balance<=0&&j.finalAmount>0);
  const body=`<div class="hd"><div style="display:flex;gap:12px;align-items:center"><div class="logo">G</div><div><div class="brand">Gloss<span>mith</span></div><div class="muted">Financial summary</div></div></div><div class="muted" style="text-align:right">${new Date().toISOString().slice(0,10)}</div></div>
    <h2>Collections</h2><table><tr><td>M-Pesa</td><td style="text-align:right">${money(d.mpesa)}</td></tr><tr><td>Cash</td><td style="text-align:right">${money(d.cash)}</td></tr><tr class="tot"><td>Total collected</td><td style="text-align:right">${money((d.mpesa||0)+(d.cash||0))}</td></tr></table>
    <h2>Balances</h2><table><tr><td>Cleared (${cleared.length})</td><td style="text-align:right">${money(cleared.reduce((a,j)=>a+j.finalAmount,0))}</td></tr><tr><td>Outstanding (${outstanding.length})</td><td style="text-align:right" class="due">${money(outstanding.reduce((a,j)=>a+j.balance,0))}</td></tr></table>
    <h2>Outstanding detail</h2>${outstanding.length?`<table>${outstanding.map(j=>{const c=State.customer(j.customerId)||{};const v=State.vehicle(j.vehicleId)||{};return `<tr><td>${esc(c.name||"—")} · ${esc(fmtPlate(v.plate))}</td><td style="text-align:right">${money(j.balance)}</td></tr>`;}).join("")}</table>`:`<div class="muted">All clear.</div>`}`;
  Pdf.print(Pdf.shell("Financial summary",body));
};

/* ===================== CONNECT / HEALTH ===================== */
Object.assign(UI,{
  connect(){
    openModal(`<h3>Connect backend</h3>
      <div style="font-size:12px;color:var(--muted);margin:6px 0 14px;line-height:1.5">In Apps Script: <b>Deploy → New deployment → Web app → Execute as: Me → Anyone</b>. Copy the URL (ends in <b>/exec</b>) and paste it below. Leave blank to use demo data.</div>
      <label>Web App URL<input id="cn_url" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(getUrl())}"></label>
      <div class="btn-row"><button class="btn-2" onclick="closeModal()">Cancel</button><button class="btn" style="flex:2" onclick="UI.saveUrl()">Test &amp; save</button></div>
      <button class="btn-2" style="width:100%;margin-top:8px" onclick="UI.useDemo()">Use demo data (no backend)</button>
      <div id="cn_note" style="font-size:12px;color:var(--muted);margin-top:10px"></div>`);
  },
  async saveUrl(){
    const url=$("cn_url").value.trim(); const note=$("cn_note");
    if(!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(url)){ note.textContent="That doesn't look like an Apps Script /exec URL."; note.style.color="var(--danger)"; return; }
    note.textContent="Testing…"; note.style.color="var(--muted)";
    try{
      const r=await fetch(url+"?health=1"); const d=await r.json();
      if(!d||!d.version){ note.textContent="Reached it, but it's not the current backend. Paste the latest Code.gs and redeploy."; note.style.color="var(--danger)"; return; }
      if(d.version!==EXPECTED_BACKEND){ note.textContent="Backend is "+d.version+", app expects "+EXPECTED_BACKEND+". Redeploy latest Code.gs."; note.style.color="var(--danger)"; return; }
      setUrl(url); note.textContent="✅ Connected to "+d.version+". Reloading…"; note.style.color="var(--lime)";
      setTimeout(()=>location.reload(),800);
    }catch(e){ note.textContent="Could not reach that URL: "+(e.message||e); note.style.color="var(--danger)"; }
  },
  useDemo(){ try{localStorage.setItem("gm_url","demo");}catch(e){} location.reload(); },
  async health(){
    const el=$("dev_health"); if(!el)return; el.textContent="Checking…";
    if(State.demo){ el.textContent="Demo mode — no backend to check. Jobs: "+State.jobs().length; return; }
    try{ const r=await fetch(getUrl()+"?health=1"); const d=await r.json(); el.textContent=JSON.stringify(d,null,2); }
    catch(e){ el.textContent="Health check failed: "+(e.message||e); el.style.color="var(--danger)"; }
  }
});

/* ===================== DEMO BACKEND (mirrors Code.gs) ===================== */
Object.assign(Demo,{
  KEY:"gm_demo_db_v7",
  db:null,
  load(){ if(this.db)return this.db; try{ const raw=localStorage.getItem(this.KEY); if(raw){this.db=JSON.parse(raw); if(!this.db.users||!this.db.users.length)this.db.users=this.seed().users; return this.db;} }catch(e){} this.db=this.seed(); this.save(); return this.db; },
  save(){ try{ localStorage.setItem(this.KEY,JSON.stringify(this.db)); }catch(e){} },
  uuid(){ return Math.random().toString(36).slice(2,10); },
  now(){ return new Date().toISOString(); },
  seed(){
    const now=Date.now(); const iso=d=>new Date(d).toISOString();
    const c1={id:"cust0001",name:"Wanjiru Kamau",primaryPhone:"+254722112233",extraPhones:"[]",notes:"",createdAt:iso(now-86400000*40),updatedAt:iso(now)};
    const c2={id:"cust0002",name:"David Otieno",primaryPhone:"+254733445566",extraPhones:'["+254720999888"]',notes:"",createdAt:iso(now-86400000*20),updatedAt:iso(now)};
    const c3={id:"cust0003",name:"Aisha Mohamed",primaryPhone:"+254711223344",extraPhones:"[]",notes:"",createdAt:iso(now-86400000*8),updatedAt:iso(now)};
    const v1={id:"veh00001",customerId:c1.id,plate:"KDS112Z",make:"Toyota",model:"Land Cruiser Prado",year:"2020",colour:"Pearl white",vehicleClass:1,createdAt:iso(now-86400000*40),updatedAt:iso(now)};
    const v2={id:"veh00002",customerId:c1.id,plate:"KCA089A",make:"Mazda",model:"CX-5",year:"2019",colour:"Soul red",vehicleClass:1,createdAt:iso(now-86400000*30),updatedAt:iso(now)};
    const v3={id:"veh00003",customerId:c2.id,plate:"KDG455P",make:"Subaru",model:"Forester",year:"2018",colour:"Grey",vehicleClass:1,createdAt:iso(now-86400000*20),updatedAt:iso(now)};
    const v4={id:"veh00004",customerId:c3.id,plate:"KDK777Q",make:"Mercedes-Benz",model:"C200",year:"2021",colour:"Obsidian black",vehicleClass:0,createdAt:iso(now-86400000*8),updatedAt:iso(now)};
    const jobs=[
      {id:"job00001",jobNo:"GS-1001",customerId:c1.id,vehicleId:v1.id,services:"Gold — Complete Detail",channel:"WhatsApp",technician:"Peter",amount:50000,promoCode:"",discount:0,finalAmount:50000,cost:5953,stage:"Closed",loggedBy:"Peter",createdAt:iso(now-86400000*35),updatedAt:iso(now)},
      {id:"job00002",jobNo:"GS-1002",customerId:c2.id,vehicleId:v3.id,services:"Silver — Household Detail",channel:"Walk-in",technician:"James",amount:20000,promoCode:"",discount:0,finalAmount:20000,cost:1935,stage:"In Progress",loggedBy:"James",createdAt:iso(now-86400000*3),updatedAt:iso(now)},
      {id:"job00003",jobNo:"GS-1003",customerId:c3.id,vehicleId:v4.id,services:"Full Front — 3M Scotchgard Pro 200 — Glossy",channel:"Website",technician:"Peter",amount:170000,promoCode:"",discount:0,finalAmount:170000,cost:29313,stage:"Ready for Collection",loggedBy:"Peter",createdAt:iso(now-86400000*2),updatedAt:iso(now)},
      {id:"job00004",jobNo:"GS-1004",customerId:c1.id,vehicleId:v2.id,services:"Bronze — Express Wash & Shine",channel:"WhatsApp",technician:"James",amount:7000,promoCode:"",discount:0,finalAmount:7000,cost:910,stage:"New",loggedBy:"James",createdAt:iso(now-3600000*5),updatedAt:iso(now)},
    ];
    const payments=[
      {id:"pay00001",jobId:"job00001",amount:20000,method:"M-Pesa",mpesaCode:"QCH7ABCDE",kind:"Deposit",receivedBy:"Peter",createdAt:iso(now-86400000*35)},
      {id:"pay00002",jobId:"job00001",amount:30000,method:"Cash",mpesaCode:"",kind:"Final Payment",receivedBy:"Peter",createdAt:iso(now-86400000*30)},
      {id:"pay00003",jobId:"job00002",amount:8000,method:"M-Pesa",mpesaCode:"QDL9ZZZZZ",kind:"Deposit",receivedBy:"James",createdAt:iso(now-86400000*3)},
      {id:"pay00004",jobId:"job00003",amount:100000,method:"M-Pesa",mpesaCode:"QFM2YYYYY",kind:"Deposit",receivedBy:"Peter",createdAt:iso(now-86400000*2)},
    ];
    const notes=[
      {id:"not00001",jobId:"job00002",message:"Vehicle received, walk-around done.",user:"James",createdAt:iso(now-86400000*3)},
      {id:"not00002",jobId:"job00002",message:"Interior shampoo started.",user:"James",createdAt:iso(now-86400000*2)},
      {id:"not00003",jobId:"job00003",message:"PPF installed on bumper & hood.",user:"Peter",createdAt:iso(now-86400000*1)},
    ];
    const promos=[
      {id:"pro00001",code:"NAIROBICLUB",owner:"Nairobi Car Club",club:"Nairobi Car Club",category:"Car Club",rate:0.10,discountRate:0.08,createdAt:iso(now-86400000*50)},
      {id:"pro00002",code:"SPEEDGARAGE",owner:"Speed Garage",club:"Speed Garage Owners",category:"Car Club",rate:0.12,discountRate:0.10,createdAt:iso(now-86400000*30)}
    ];
    const staff=[{id:"stf00001",name:"Peter",rate:0.10,createdAt:iso(now)},{id:"stf00002",name:"James",rate:0.08,createdAt:iso(now)}];
    const users=[{id:"usr00001",username:"owner",password:"glossmith",role:"owner",active:true,protected:true},{id:"usr00002",username:"manager",password:"glossmith",role:"manager",active:true},{id:"usr00003",username:"sales",password:"glossmith",role:"sales",active:true}];
    const expenses=[
      {id:"exp00001",date:iso(now-86400000*20).slice(0,10),category:"Rent",description:"Workshop rent",amount:45000,method:"M-Pesa",recurring:"monthly",loggedBy:"owner",createdAt:iso(now-86400000*20)},
      {id:"exp00002",date:iso(now-86400000*10).slice(0,10),category:"Materials & products",description:"Ceramic coating stock",amount:32000,method:"Cash",recurring:"one-off",loggedBy:"owner",createdAt:iso(now-86400000*10)},
      {id:"exp00003",date:iso(now-86400000*4).slice(0,10),category:"Utilities",description:"Electricity + water",amount:8500,method:"M-Pesa",recurring:"monthly",loggedBy:"manager",createdAt:iso(now-86400000*4)},
    ];
    const members=[{id:"mem00001",customerId:c1.id,name:"Wanjiru Kamau",phone:"+254722112233",club:"Glossmith Club",source:"manual",promoCode:"",discountRate:0.05,addedBy:"owner",active:true,createdAt:iso(now-86400000*40)}];
    const commissionPayments=[{id:"cpay0001",promoCode:"NAIROBICLUB",partner:"Nairobi Car Club",amount:2000,mpesaCode:"QGX1PAYAB",note:"June payout",paidBy:"owner",createdAt:iso(now-86400000*12)}];
    return {customers:[c1,c2,c3],vehicles:[v1,v2,v3,v4],jobs,payments,photos:[],notes,promos,staff,users,expenses,members,commissionPayments,mpesa:[]};
  },
  /* --- compute (mirror of backend) --- */
  computeJob(job){
    const db=this.db; const pays=db.payments.filter(p=>p.jobId===job.id);
    const photos=db.photos.filter(p=>p.jobId===job.id); const notes=db.notes.filter(n=>n.jobId===job.id);
    const finalAmount=num(job.finalAmount)||num(job.amount);
    const totalPaid=pays.reduce((a,p)=>a+num(p.amount),0);
    const balance=Math.max(0,finalAmount-totalPaid);
    const status=balance<=0&&finalAmount>0?"Paid in full":totalPaid>0?"Partly paid":"Unpaid";
    return Object.assign({},job,{finalAmount,totalPaid,balance,paymentStatus:status,
      payments:pays.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)),photos,
      notes:notes.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt))});
  },
  dashboard(){
    const db=this.db; const jobs=db.jobs.map(j=>this.computeJob(j)); const pays=db.payments;
    const today=new Date();today.setHours(0,0,0,0);
    let cash=0,mpesa=0; pays.forEach(p=>{ if(p.method==="Cash")cash+=num(p.amount); else mpesa+=num(p.amount); });
    const trend=[]; const now=new Date();
    for(let i=5;i>=0;i--){ const dt=new Date(now.getFullYear(),now.getMonth()-i,1); const key=dt.getFullYear()+"-"+("0"+(dt.getMonth()+1)).slice(-2); trend.push({key,label:dt.toLocaleString("en",{month:"short"}),value:pays.filter(p=>String(p.createdAt).slice(0,7)===key).reduce((a,p)=>a+num(p.amount),0)}); }
    return {todaysSales:pays.filter(p=>new Date(p.createdAt)>=today).reduce((a,p)=>a+num(p.amount),0),
      revenueClosed:jobs.filter(j=>j.stage==="Closed").reduce((a,j)=>a+j.finalAmount,0),
      collected:pays.reduce((a,p)=>a+num(p.amount),0),
      outstanding:jobs.reduce((a,j)=>a+j.balance,0),
      deposits:pays.filter(p=>p.kind==="Deposit").reduce((a,p)=>a+num(p.amount),0),
      openJobs:jobs.filter(j=>j.stage!=="Closed").length,completedJobs:jobs.filter(j=>j.stage==="Closed").length,
      vehicles:db.vehicles.length,customers:db.customers.length,cash,mpesa,trend};
  },
  snapshot(){
    const db=this.load();
    if(!db.users||!db.users.length)db.users=this.seed().users;
    if(!db.expenses)db.expenses=[];
    if(!db.members)db.members=[];
    if(!db.commissionPayments)db.commissionPayments=[];
    const jobs=db.jobs.map(j=>this.computeJob(j));
    return {version:EXPECTED_BACKEND,build:"demo",environment:"demo",timestamp:this.now(),
      customers:db.customers,vehicles:db.vehicles,jobs:jobs,
      promos:db.promos,staff:db.staff,expenses:db.expenses,access:ACCESS_FALLBACK,
      members:db.members,commissionPayments:db.commissionPayments,partners:this.partners(jobs),
      users:db.users.map(u=>({id:u.id,username:u.username,role:u.role,active:u.active!==false,protected:u.protected===true||String(u.username).trim().toLowerCase()==="owner"})),
      dashboard:this.dashboard(),accounting:this.accounting(jobs)};
  },
  promoRate(p){ const r=num(p&&p.rate); return r>1?r/100:(r>0?r:0.10); },
  memberByPhone(phone){ const np=normPhoneIntl(phone); if(!np)return null; return (this.db.members||[]).find(m=>m.active!==false&&normPhoneIntl(m.phone)===np)||null; },
  partners(jobs){
    const db=this.db; const byCode={};
    (db.promos||[]).forEach(p=>{ byCode[String(p.code).toUpperCase()]={code:p.code,partner:p.owner||p.code,club:p.club||"",rate:this.promoRate(p),discountRate:num(p.discountRate),jobs:0,revenue:0,commissionAccrued:0,paid:0,owed:0}; });
    jobs.forEach(j=>{ if(!j.promoCode)return; const e=byCode[String(j.promoCode).toUpperCase()]; if(!e)return; e.jobs++; if(j.balance<=0&&j.finalAmount>0){ e.revenue+=j.finalAmount; e.commissionAccrued+=Math.round(j.finalAmount*e.rate); } });
    (db.commissionPayments||[]).forEach(c=>{ const e=byCode[String(c.promoCode).toUpperCase()]; if(e)e.paid+=num(c.amount); });
    return Object.keys(byCode).map(k=>{const e=byCode[k];e.owed=Math.max(0,e.commissionAccrued-e.paid);return e;}).sort((a,b)=>b.revenue-a.revenue);
  },
  accounting(jobs){
    const db=this.db;
    const earned=jobs.filter(j=>j.balance<=0&&j.finalAmount>0);
    const revenue=earned.reduce((a,j)=>a+j.finalAmount,0);
    const collected=db.payments.reduce((a,p)=>a+num(p.amount),0);
    const discounts=jobs.reduce((a,j)=>a+num(j.discount),0);
    let commissions=0; earned.forEach(j=>{ if(!j.promoCode)return; const p=db.promos.find(x=>String(x.code).toUpperCase()===String(j.promoCode).toUpperCase()); if(p)commissions+=Math.round(j.finalAmount*this.promoRate(p)); });
    const cogs=earned.reduce((a,j)=>a+num(j.cost),0);
    const expenseTotal=(db.expenses||[]).reduce((a,e)=>a+num(e.amount),0);
    const expenseByCat={}; (db.expenses||[]).forEach(e=>{const k=e.category||"Other";expenseByCat[k]=(expenseByCat[k]||0)+num(e.amount);});
    const grossProfit=revenue-discounts-cogs; const netProfit=grossProfit-commissions-expenseTotal;
    const svc={}; earned.forEach(j=>{const l=String(j.services||"Other").split(" + ")[0].trim()||"Other"; svc[l]=(svc[l]||0)+num(j.finalAmount);});
    const revenueByService=Object.keys(svc).map(k=>({service:k,revenue:svc[k]})).sort((a,b)=>b.revenue-a.revenue);
    return {revenue,collected,discounts,commissions,cogs,expenses:expenseTotal,expenseByCat,grossProfit,netProfit,margin:revenue>0?Math.round(netProfit/revenue*100):0,revenueByService};
  },
  ok(msg,upd,extra){ return Object.assign({success:true,message:msg||"OK",version:EXPECTED_BACKEND,timestamp:this.now(),updatedObject:upd||null},extra||{}); },
  fail(msg,code){ return {success:false,message:msg||"Failed",code:code||"ERROR",version:EXPECTED_BACKEND,timestamp:this.now()}; },
  jobComputed(id){ const j=this.db.jobs.find(x=>x.id===id); return j?this.computeJob(j):null; },
  nextJobNo(){ const max=this.db.jobs.reduce((m,j)=>{const n=parseInt(String(j.jobNo||"").replace(/\D/g,""),10);return isNaN(n)?m:Math.max(m,n);},1000); return "GS-"+(max+1); },
  /* --- action handler (mirror of doPost) --- */
  async handle(action,p){
    const db=this.load(); p=p||{};
    // mirror the backend's capability gate (uses the logged-in demo role)
    var capOf={deleteJob:"deleteJobs",deletePhoto:"deleteJobs",deletePromo:"deleteJobs",deleteStaff:"deleteJobs",
      addPromo:"financials",addStaff:"accounting",updateStaff:"accounting",addExpense:"manageExpenses",deleteExpense:"manageExpenses",
      deleteMember:"deleteJobs",payCommission:"viewPartners",deleteCommissionPayment:"deleteJobs",
      addUser:"manageAccounts",updateUser:"manageAccounts",deleteUser:"manageAccounts"};
    if(capOf[action] && State.role){ var A=ACCESS_FALLBACK[State.role]||ACCESS_FALLBACK.sales; if(!A[capOf[action]]) return this.fail("You don't have permission for that.","FORBIDDEN"); }
    switch(action){
      case "health": return Object.assign(this.ok("health"),{service:"Glossmith CRM (demo)",database:"demo",mpesa:"not-configured"});
      case "checkPin": {
        const props={owner:"9999",staff:"1234"};
        const role=String(p.pin)===props.owner?"owner":String(p.pin)===props.staff?"staff":null;
        return role?this.ok("Unlocked",null,{role,token:"demo-token"}):this.fail("Wrong PIN","AUTH");
      }
      case "login": {
        if(!db.users||!db.users.length)db.users=this.seed().users;
        const u=String(p.username||"").trim().toLowerCase();
        const user=db.users.find(x=>String(x.username).trim().toLowerCase()===u);
        if(!user||String(user.password)!==String(p.password))return this.fail("Wrong username or password","AUTH");
        if(user.active===false)return this.fail("This account has been revoked. Contact the owner.","REVOKED");
        return this.ok("Signed in",null,{role:user.role,username:user.username,token:"demo-token"});
      }
      case "addUser": {
        const username=String(p.username||"").trim();
        if(!username)return this.fail("Username is required.","VALIDATION");
        if(String(p.password||"").length<4)return this.fail("Password must be at least 4 characters.","VALIDATION");
        if(ROLES.indexOf(p.role)===-1)return this.fail("Role must be owner, manager or sales.","VALIDATION");
        if(db.users.find(x=>String(x.username).toLowerCase()===username.toLowerCase()))return this.fail("That username already exists.","DUPLICATE");
        const user={id:this.uuid(),username,password:String(p.password),role:p.role,active:true}; db.users.push(user); this.save();
        return this.ok("Account created",{id:user.id,username:user.username,role:user.role,active:true});
      }
      case "updateUser": {
        const user=db.users.find(x=>x.id===p.id); if(!user)return this.fail("Account not found.","NOT_FOUND");
        const prot=user.protected===true||String(user.username).trim().toLowerCase()==="owner";
        if(prot){
          if(p.username!==undefined||p.role!==undefined||p.active!==undefined)return this.fail("The primary owner's username, role and status are locked. Only the password can be changed.","LOCKED");
          if(p.password===undefined||String(p.password)==="")return this.fail("Enter a new password.","VALIDATION");
          if(String(p.password).length<4)return this.fail("Password must be at least 4 characters.","VALIDATION");
          user.password=String(p.password); this.save(); return this.ok("Owner password updated",{id:user.id,username:user.username,role:user.role,active:true,protected:true});
        }
        const activeOwners=()=>db.users.filter(x=>x.role==="owner"&&x.active!==false).length;
        if(p.username!==undefined){ const nu=String(p.username).trim(); if(!nu)return this.fail("Username is required.","VALIDATION"); if(db.users.find(x=>x.id!==p.id&&String(x.username).toLowerCase()===nu.toLowerCase()))return this.fail("That username already exists.","DUPLICATE"); user.username=nu; }
        if(p.password!==undefined&&String(p.password)!==""){ if(String(p.password).length<4)return this.fail("Password must be at least 4 characters.","VALIDATION"); user.password=String(p.password); }
        if(p.role!==undefined){ if(ROLES.indexOf(p.role)===-1)return this.fail("Role must be owner, manager or sales.","VALIDATION"); if(user.role==="owner"&&p.role!=="owner"&&activeOwners()<=1)return this.fail("Cannot demote the last owner.","VALIDATION"); user.role=p.role; }
        if(p.active!==undefined){ if(user.role==="owner"&&p.active===false&&activeOwners()<=1)return this.fail("Cannot revoke the last active owner.","VALIDATION"); user.active=!!p.active; }
        this.save(); return this.ok("Account updated",{id:user.id,username:user.username,role:user.role,active:user.active!==false});
      }
      case "deleteUser": {
        const user=db.users.find(x=>x.id===p.id); if(!user)return this.fail("Account not found.","NOT_FOUND");
        if(user.protected===true||String(user.username).trim().toLowerCase()==="owner")return this.fail("The primary owner account is locked and cannot be deleted.","LOCKED");
        if(user.role==="owner"&&db.users.filter(x=>x.role==="owner").length<=1)return this.fail("Cannot delete the last owner account.","VALIDATION");
        db.users=db.users.filter(x=>x.id!==p.id); this.save(); return this.ok("Account removed");
      }
      case "validatePromo": { const m=db.promos.find(x=>String(x.code).toUpperCase()===String(p.code).toUpperCase()); return m?{valid:true,code:m.code,owner:m.owner,rate:num(m.rate),discountRate:m.discountRate===undefined?0.08:num(m.discountRate)}:{valid:false}; }
      case "createJob": return this.createJob(p);
      case "addPayment": return this.addPayment(p);
      case "setStage": return this.setStage(p);
      case "addNote": { if(!p.jobId||!String(p.message||"").trim())return this.fail("Message required","VALIDATION"); db.notes.push({id:this.uuid(),jobId:p.jobId,message:p.message.trim(),user:p.user||"",createdAt:this.now()}); this.save(); return this.ok("Note added",this.jobComputed(p.jobId)); }
      case "uploadPhoto": { const job=db.jobs.find(j=>j.id===p.jobId); if(!job)return this.fail("Job not found","NOT_FOUND"); const phase=["before","during","after"].indexOf(p.phase)!==-1?p.phase:"before"; const row={id:this.uuid(),jobId:p.jobId,phase,url:p.dataUrl,driveId:"",createdAt:this.now()}; db.photos.push(row); this.save(); return this.ok("Photo uploaded",this.jobComputed(p.jobId),{photo:row}); }
      case "deletePhoto": { const ph=db.photos.find(x=>x.id===p.id); db.photos=db.photos.filter(x=>x.id!==p.id); this.save(); return this.ok("Removed",ph?this.jobComputed(ph.jobId):null); }
      case "deleteJob": { db.payments=db.payments.filter(x=>x.jobId!==p.id); db.photos=db.photos.filter(x=>x.jobId!==p.id); db.notes=db.notes.filter(x=>x.jobId!==p.id); db.jobs=db.jobs.filter(x=>x.id!==p.id); this.save(); return this.ok("Job deleted"); }
      case "addPromo": { const code=String(p.code||"").trim().toUpperCase(); if(db.promos.find(x=>String(x.code).toUpperCase()===code))return this.fail("That code already exists","DUPLICATE"); const row={id:this.uuid(),code,owner:p.owner||"",club:p.club||"",category:p.category||"",rate:num(p.rate)||0.10,discountRate:p.discountRate===undefined||p.discountRate===""?0.08:num(p.discountRate),createdAt:this.now()}; db.promos.push(row); this.save(); return this.ok("Promo added",row); }
      case "addMember": { const name=String(p.name||"").trim(); const ph=normPhoneIntl(p.phone); if(!name)return this.fail("Member name is required.","VALIDATION"); if(!ph)return this.fail("A phone number is required.","VALIDATION"); if(this.memberByPhone(ph))return this.fail("That phone is already a member.","DUPLICATE"); const cust=db.customers.find(c=>c.primaryPhone===ph); const row={id:this.uuid(),customerId:cust?cust.id:"",name,phone:ph,club:p.club||"Glossmith Club",source:p.source||"manual",promoCode:p.promoCode||"",discountRate:p.discountRate!==undefined&&p.discountRate!==""?num(p.discountRate):0.05,addedBy:p.addedBy||State.username||"",active:true,createdAt:this.now()}; db.members.push(row); this.save(); return this.ok("Member added",row); }
      case "deleteMember": { db.members=(db.members||[]).filter(x=>x.id!==p.id); this.save(); return this.ok("Member removed"); }
      case "payCommission": { const code=String(p.promoCode||"").trim().toUpperCase(); const promo=db.promos.find(x=>String(x.code).toUpperCase()===code); if(!promo)return this.fail("Choose a partner to pay.","VALIDATION"); if(num(p.amount)<=0)return this.fail("Enter an amount greater than zero.","VALIDATION"); if(!String(p.mpesaCode||"").trim())return this.fail("Enter the M-Pesa code you paid with.","VALIDATION"); const row={id:this.uuid(),promoCode:promo.code,partner:promo.owner||promo.code,amount:num(p.amount),mpesaCode:String(p.mpesaCode).toUpperCase(),note:p.note||"",paidBy:State.username||"",createdAt:this.now()}; db.commissionPayments.push(row); this.save(); return this.ok("Commission payment recorded",row); }
      case "deleteCommissionPayment": { db.commissionPayments=(db.commissionPayments||[]).filter(x=>x.id!==p.id); this.save(); return this.ok("Deleted"); }
      case "addExpense": { if(num(p.amount)<=0)return this.fail("Expense amount must be greater than zero.","VALIDATION"); if(!String(p.category||"").trim())return this.fail("Choose a category.","VALIDATION"); if(!db.expenses)db.expenses=[]; const row={id:this.uuid(),date:p.date||this.now().slice(0,10),category:p.category,description:p.description||"",amount:num(p.amount),method:p.method||"Cash",recurring:p.recurring||"one-off",loggedBy:p.loggedBy||"",createdAt:this.now()}; db.expenses.push(row); this.save(); return this.ok("Expense recorded",row); }
      case "deleteExpense": { db.expenses=(db.expenses||[]).filter(x=>x.id!==p.id); this.save(); return this.ok("Deleted"); }
      case "deletePromo": { db.promos=db.promos.filter(x=>x.id!==p.id); this.save(); return this.ok("Deleted"); }
      case "addStaff": { const row={id:this.uuid(),name:String(p.name).trim(),rate:num(p.rate)||0.10,createdAt:this.now()}; db.staff.push(row); this.save(); return this.ok("Staff added",row); }
      case "updateStaff": { const s=db.staff.find(x=>x.id===p.id); if(!s)return this.fail("Not found","NOT_FOUND"); if(p.name!==undefined)s.name=String(p.name).trim(); if(p.rate!==undefined)s.rate=num(p.rate); this.save(); return this.ok("Staff updated",s); }
      case "deleteStaff": { db.staff=db.staff.filter(x=>x.id!==p.id); this.save(); return this.ok("Deleted"); }
      case "stkPush": return this.fail("M-Pesa STK push needs the live backend + Daraja keys.","MPESA");
      case "stkStatus": return this.ok("status",null,{status:"none"});
      default: return this.fail("Unknown action: "+action);
    }
  },
  createJob(p){
    const db=this.db;
    for(const f of ["customerName","primaryPhone","plate","make","model"]) if(!String(p[f]||"").trim())return this.fail(f+" is required","VALIDATION");
    let finalAmount=num(p.finalAmount)||num(p.amount);
    const phone=normPhoneIntl(p.primaryPhone); const plate=normPlate(p.plate);
    let cust=db.customers.find(c=>phone&&c.primaryPhone===phone);
    if(!cust){ cust={id:this.uuid(),name:p.customerName.trim(),primaryPhone:phone,extraPhones:"[]",notes:"",createdAt:this.now(),updatedAt:this.now()}; db.customers.push(cust); }
    else if(p.customerName.trim()&&cust.name!==p.customerName.trim()){ cust.name=p.customerName.trim(); }
    let veh=db.vehicles.find(v=>v.plate===plate);
    if(!veh){ veh={id:this.uuid(),customerId:cust.id,plate,make:p.make||"",model:p.model||"",year:p.year||"",colour:p.colour||"",vehicleClass:num(p.vehicleClass),createdAt:this.now(),updatedAt:this.now()}; db.vehicles.push(veh); }
    else{ veh.customerId=cust.id; veh.make=p.make||veh.make; veh.model=p.model||veh.model; veh.year=p.year||veh.year; veh.colour=p.colour||veh.colour; if(p.vehicleClass!==undefined)veh.vehicleClass=num(p.vehicleClass); }
    // discount = max(member, club promo) — backend is source of truth
    const amount=num(p.amount); let effRate=0, promoCode="";
    const existingMember=this.memberByPhone(phone);
    if(existingMember)effRate=Math.max(effRate,num(existingMember.discountRate));
    let promo=null;
    if(p.promoCode){ promo=db.promos.find(x=>String(x.code).toUpperCase()===String(p.promoCode).toUpperCase()); if(promo){promoCode=promo.code;effRate=Math.max(effRate,num(promo.discountRate));} }
    finalAmount=amount>0?Math.round(amount*(1-effRate)):finalAmount;
    const discount=Math.max(0,amount-finalAmount);
    if(num(p.deposit)>finalAmount)return this.fail("Deposit cannot exceed the total.","VALIDATION");
    const deposit=num(p.deposit);
    const job={id:this.uuid(),jobNo:this.nextJobNo(),customerId:cust.id,vehicleId:veh.id,services:p.services||"",channel:p.channel||"",technician:p.technician||"",amount,promoCode,discount,finalAmount,cost:num(p.cost),stage:deposit>0?"Deposit Paid":"New",loggedBy:p.loggedBy||"",createdAt:this.now(),updatedAt:this.now()};
    db.jobs.push(job);
    // auto-enrol club member on club promo use
    if(promo&&String(promo.club||"").trim()&&!existingMember){ db.members.push({id:this.uuid(),customerId:cust.id,name:cust.name,phone,club:promo.club,source:"promo",promoCode:promo.code,discountRate:num(promo.discountRate),addedBy:p.loggedBy||"auto",active:true,createdAt:this.now()}); }
    if(deposit>0){ if(p.paymentMethod==="M-Pesa"&&!String(p.mpesaCode||"").trim())return this.fail("Enter the M-Pesa code.","VALIDATION"); db.payments.push({id:this.uuid(),jobId:job.id,amount:deposit,method:p.paymentMethod||"M-Pesa",mpesaCode:(p.mpesaCode||"").toUpperCase(),kind:"Deposit",receivedBy:p.loggedBy||"",createdAt:this.now()}); }
    this.save();
    return this.ok("Job created",this.jobComputed(job.id),{jobId:job.id,jobNo:job.jobNo});
  },
  addPayment(p){
    const db=this.db; const job=db.jobs.find(j=>j.id===p.jobId); if(!job)return this.fail("Job not found","NOT_FOUND");
    const computed=this.computeJob(job); const amount=num(p.amount);
    if(["Cash","M-Pesa"].indexOf(p.method)===-1)return this.fail("Choose a payment method.","VALIDATION");
    if(amount<=0)return this.fail("Amount must be greater than zero.","VALIDATION");
    if(p.method==="M-Pesa"&&!String(p.mpesaCode||"").trim())return this.fail("Enter the M-Pesa transaction code.","VALIDATION");
    if(amount>computed.balance+0.5)return this.fail("Amount is more than the outstanding balance.","VALIDATION");
    db.payments.push({id:this.uuid(),jobId:job.id,amount,method:p.method,mpesaCode:(p.mpesaCode||"").toUpperCase(),kind:p.kind||(computed.totalPaid===0?"Deposit":"Final Payment"),receivedBy:p.receivedBy||"",createdAt:this.now()});
    if(job.stage==="New"&&this.computeJob(job).totalPaid>0)job.stage="Deposit Paid";
    this.save();
    return this.ok("Payment recorded",this.jobComputed(job.id));
  },
  setStage(p){
    const db=this.db; const job=db.jobs.find(j=>j.id===p.id); if(!job)return this.fail("Job not found","NOT_FOUND");
    if(STAGES.indexOf(p.stage)===-1)return this.fail("Unknown stage","VALIDATION");
    if(p.stage==="Closed"&&this.computeJob(job).balance>0)return this.fail("This job still has an outstanding balance.","BALANCE_DUE");
    job.stage=p.stage; job.updatedAt=this.now(); this.save();
    return this.ok("Moved to "+p.stage,this.jobComputed(job.id));
  }
});
