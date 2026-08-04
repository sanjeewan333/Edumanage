/* =========================================================
   EduManage — Shared runtime: seed data, session, UI chrome
   Storage is localStorage-backed so every action (add/edit/
   delete/submit/login) genuinely persists in the browser.
   ========================================================= */

const DB_KEYS = {
  users:'edu_users', students:'edu_students', teachers:'edu_teachers',
  courses:'edu_courses', timetable:'edu_timetable', assignments:'edu_assignments',
  submissions:'edu_submissions', payments:'edu_payments', feedback:'edu_feedback',
  complaints:'edu_complaints', notifications:'edu_notifications', attendance:'edu_attendance',
  session:'edu_session'
};

function db_get(key){ try{ return JSON.parse(localStorage.getItem(key)) || []; }catch(e){ return []; } }
function db_set(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
function uid(prefix){ return prefix + '-' + Math.random().toString(36).slice(2,7).toUpperCase(); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function initials(name){ return (name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(); }
function fmtDate(d){ if(!d) return '—'; const dt=new Date(d); return dt.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }
function fmtMoney(n){ return 'LKR ' + Number(n||0).toLocaleString('en-LK',{minimumFractionDigits:2,maximumFractionDigits:2}); }

/* ---------------- SEED DATA (first run only) ---------------- */
function seedDatabase(){
  if(localStorage.getItem('edu_seeded')) return;

  db_set(DB_KEYS.users, [
    {id:'U-ADM1', name:'Sanjeewan Perera', email:'admin@edumanage.lk', password:'admin123', role:'administrator'},
    {id:'U-TCH1', name:'Nadeesha Fernando', email:'teacher@edumanage.lk', password:'teach123', role:'teacher'},
    {id:'U-STU1', name:'Kasun Silva', email:'student@edumanage.lk', password:'stud123', role:'student'}
  ]);

  db_set(DB_KEYS.teachers, [
    {id:'T-1001', name:'Nadeesha Fernando', email:'teacher@edumanage.lk', phone:'077 214 5567', subject:'Data Structures & Algorithms', qualification:'MSc Computer Science', joined:'2021-03-14', status:'active'},
    {id:'T-1002', name:'Ruwan Jayasuriya', email:'ruwan.j@edumanage.lk', phone:'071 445 9021', subject:'Computer Networks', qualification:'BSc (Hons) SE', joined:'2019-08-02', status:'active'},
    {id:'T-1003', name:'Iresha Bandara', email:'iresha.b@edumanage.lk', phone:'070 332 1187', subject:'Database Systems', qualification:'MPhil IT', joined:'2022-01-20', status:'active'},
    {id:'T-1004', name:'Chamara Wickramasinghe', email:'chamara.w@edumanage.lk', phone:'076 908 4432', subject:'Software Engineering', qualification:'MSc SE', joined:'2018-06-11', status:'on leave'}
  ]);

  db_set(DB_KEYS.students, [
    {id:'S-2201', name:'Kasun Silva', email:'student@edumanage.lk', phone:'075 112 3345', batch:'Y2S1 — 2024', course:'BSc Software Engineering', status:'active', guardian:'W.M. Silva'},
    {id:'S-2202', name:'Dilini Rathnayake', email:'dilini.r@student.lk', phone:'077 998 2214', batch:'Y2S1 — 2024', course:'BSc Software Engineering', status:'active', guardian:'K.P. Rathnayake'},
    {id:'S-2203', name:'Tharindu Madushanka', email:'tharindu.m@student.lk', phone:'071 556 7789', batch:'Y2S1 — 2024', course:'BSc Computer Science', status:'active', guardian:'S. Madushanka'},
    {id:'S-2204', name:'Nimasha Gunaratne', email:'nimasha.g@student.lk', phone:'076 221 9087', batch:'Y1S2 — 2025', course:'BSc Computer Science', status:'suspended', guardian:'R.D. Gunaratne'},
    {id:'S-2205', name:'Oshadha Perera', email:'oshadha.p@student.lk', phone:'078 664 3321', batch:'Y2S1 — 2024', course:'BSc Software Engineering', status:'active', guardian:'A. Perera'}
  ]);

  db_set(DB_KEYS.courses, [
    {id:'C-301', name:'Data Structures & Algorithms', category:'Core', teacher:'Nadeesha Fernando', duration:'15 weeks', students:42, status:'ongoing'},
    {id:'C-302', name:'Computer Networks', category:'Core', teacher:'Ruwan Jayasuriya', duration:'12 weeks', students:38, status:'ongoing'},
    {id:'C-303', name:'Database Systems', category:'Core', teacher:'Iresha Bandara', duration:'14 weeks', students:45, status:'ongoing'},
    {id:'C-304', name:'Software Engineering Principles', category:'Core', teacher:'Chamara Wickramasinghe', duration:'13 weeks', students:40, status:'upcoming'}
  ]);

  db_set(DB_KEYS.timetable, [
    {id:uid('TT'), day:'Monday', time:'08:30 – 10:00', course:'Data Structures & Algorithms', teacher:'Nadeesha Fernando', room:'Lab 4B'},
    {id:uid('TT'), day:'Monday', time:'10:15 – 11:45', course:'Computer Networks', teacher:'Ruwan Jayasuriya', room:'Lecture Hall 2'},
    {id:uid('TT'), day:'Tuesday', time:'09:00 – 10:30', course:'Database Systems', teacher:'Iresha Bandara', room:'Lab 2A'},
    {id:uid('TT'), day:'Wednesday', time:'08:30 – 10:00', course:'Software Engineering Principles', teacher:'Chamara Wickramasinghe', room:'Lecture Hall 1'},
    {id:uid('TT'), day:'Thursday', time:'13:00 – 14:30', course:'Data Structures & Algorithms', teacher:'Nadeesha Fernando', room:'Lab 4B'}
  ]);

  db_set(DB_KEYS.assignments, [
    {id:'A-501', title:'Binary Search Tree Implementation', course:'Data Structures & Algorithms', teacher:'Nadeesha Fernando', due:'2026-08-14', maxMarks:100, status:'open', instructions:'Implement a self-balancing BST in Java with insert, delete and traversal methods. Submit source + a short report.'},
    {id:'A-502', title:'Subnetting & VLSM Worksheet', course:'Computer Networks', teacher:'Ruwan Jayasuriya', due:'2026-08-09', maxMarks:50, status:'open', instructions:'Complete the VLSM worksheet and simulate the topology in Cisco Packet Tracer.'},
    {id:'A-503', title:'Normalisation Case Study', course:'Database Systems', teacher:'Iresha Bandara', due:'2026-07-28', maxMarks:100, status:'closed', instructions:'Normalise the given schema to 3NF and justify each decomposition step.'}
  ]);

  db_set(DB_KEYS.submissions, [
    {id:uid('SUB'), assignmentId:'A-503', studentId:'S-2201', studentName:'Kasun Silva', fileName:'normalisation_kasun.pdf', submittedAt:'2026-07-26', marks:88, status:'graded', feedback:'Solid decomposition; minor issue with 3NF justification on table 2.'},
    {id:uid('SUB'), assignmentId:'A-503', studentId:'S-2202', studentName:'Dilini Rathnayake', fileName:'db_normalisation_dilini.pdf', submittedAt:'2026-07-27', marks:null, status:'submitted', feedback:''}
  ]);

  db_set(DB_KEYS.payments, [
    {id:uid('PAY'), studentId:'S-2201', studentName:'Kasun Silva', term:'2026 — Semester 1', amount:75000, status:'paid', date:'2026-01-15', method:'Bank Transfer'},
    {id:uid('PAY'), studentId:'S-2202', studentName:'Dilini Rathnayake', term:'2026 — Semester 1', amount:75000, status:'paid', date:'2026-01-18', method:'Card'},
    {id:uid('PAY'), studentId:'S-2203', studentName:'Tharindu Madushanka', term:'2026 — Semester 1', amount:75000, status:'outstanding', date:null, method:null},
    {id:uid('PAY'), studentId:'S-2205', studentName:'Oshadha Perera', term:'2026 — Semester 1', amount:75000, status:'overdue', date:null, method:null}
  ]);

  db_set(DB_KEYS.feedback, [
    {id:uid('FB'), from:'Kasun Silva', role:'student', subject:'Great lab sessions', message:'The DSA lab sessions have been very hands-on and helpful, thank you.', date:'2026-07-20', status:'new'}
  ]);

  db_set(DB_KEYS.complaints, [
    {id:uid('CMP'), from:'Dilini Rathnayake', role:'student', subject:'Projector issue in Lecture Hall 2', message:'The projector in Lecture Hall 2 has been flickering during Networks lectures for a week.', date:'2026-07-29', status:'in review', response:''}
  ]);

  db_set(DB_KEYS.notifications, [
    {id:uid('NTF'), title:'Semester 1 fee due', body:'Outstanding balances for Semester 1 must be settled by 15 Aug 2026.', audience:'students', date:'2026-08-01', read:false},
    {id:uid('NTF'), title:'Assignment posted: Binary Search Tree', body:'A new assignment has been posted for Data Structures & Algorithms.', audience:'students', date:'2026-07-31', read:false},
    {id:uid('NTF'), title:'Staff meeting — Friday 3pm', body:'All teaching staff to attend the curriculum review meeting.', audience:'teachers', date:'2026-07-30', read:true}
  ]);

  db_set(DB_KEYS.attendance, []);

  localStorage.setItem('edu_seeded','1');
}
seedDatabase();

/* ---------------- SESSION / AUTH GUARD ---------------- */
function getSession(){ try{ return JSON.parse(localStorage.getItem(DB_KEYS.session)); }catch(e){ return null; } }
function setSession(s){ localStorage.setItem(DB_KEYS.session, JSON.stringify(s)); }
function clearSession(){ localStorage.removeItem(DB_KEYS.session); }

function requireRole(role){
  const s = getSession();
  if(!s || s.role !== role){
    window.location.href = 'index.html';
    return null;
  }
  return s;
}

function logout(){
  clearSession();
  window.location.href = 'index.html';
}

/* ---------------- TOASTS ---------------- */
function toast(msg, type){
  let stack = document.querySelector('.toast-stack');
  if(!stack){
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const t = document.createElement('div');
  t.className = 'toast ' + (type || '');
  const icon = type==='success' ? 'bi-check-circle-fill' : (type==='error' ? 'bi-x-circle-fill' : 'bi-info-circle-fill');
  t.innerHTML = `<i class="bi ${icon}"></i><span>${msg}</span>`;
  stack.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transition='opacity .25s'; setTimeout(()=>t.remove(),250); }, 3200);
}

/* ---------------- APP CHROME (sidebar/topbar/nav/modals) ---------------- */
function initAppChrome(session){
  // profile
  const nameEl = document.getElementById('chromeUserName');
  const roleEl = document.getElementById('chromeUserRole');
  const avatarEls = document.querySelectorAll('.js-avatar-initials');
  if(nameEl) nameEl.textContent = session.name;
  if(roleEl) roleEl.textContent = session.role;
  avatarEls.forEach(el => el.textContent = initials(session.name));

  // mobile sidebar toggle
  const toggleBtn = document.getElementById('sidebarToggle');
  const sidebar = document.querySelector('.sidebar');
  const scrim = document.getElementById('scrim');
  if(toggleBtn){
    toggleBtn.addEventListener('click', ()=>{ sidebar.classList.toggle('open'); scrim.classList.toggle('open'); });
  }
  if(scrim){ scrim.addEventListener('click', ()=>{ sidebar.classList.remove('open'); scrim.classList.remove('open'); }); }

  // dropdowns (profile + notifications)
  document.querySelectorAll('[data-dropdown-trigger]').forEach(trigger=>{
    trigger.addEventListener('click', (e)=>{
      e.stopPropagation();
      const panel = document.getElementById(trigger.dataset.dropdownTrigger);
      document.querySelectorAll('.dropdown-panel').forEach(p=>{ if(p!==panel) p.classList.remove('open'); });
      panel.classList.toggle('open');
    });
  });
  document.addEventListener('click', ()=> document.querySelectorAll('.dropdown-panel').forEach(p=>p.classList.remove('open')));

  // logout buttons
  document.querySelectorAll('.js-logout').forEach(b=> b.addEventListener('click', logout));

  // section-based nav (SPA-style within a dashboard page)
  const navLinks = document.querySelectorAll('.sidebar .nav-link[data-section]');
  const sections = document.querySelectorAll('.content-section');
  function activateSection(name){
    sections.forEach(s => s.classList.toggle('active', s.id === 'section-' + name));
    navLinks.forEach(l => l.classList.toggle('active', l.dataset.section === name));
    const titleEl = document.getElementById('pageTitle');
    const activeLink = document.querySelector(`.nav-link[data-section="${name}"]`);
    if(titleEl && activeLink) titleEl.textContent = activeLink.dataset.title || activeLink.textContent.trim();
    window.location.hash = name;
    sidebar && sidebar.classList.remove('open');
    scrim && scrim.classList.remove('open');
    document.dispatchEvent(new CustomEvent('section:activated', {detail:{section:name}}));
  }
  navLinks.forEach(link=>{
    link.addEventListener('click', ()=> activateSection(link.dataset.section));
  });
  const startSection = (window.location.hash || '').replace('#','') || (navLinks[0] && navLinks[0].dataset.section);
  if(startSection) activateSection(startSection);

  renderNotificationBell(session);
}

/* ---------------- NOTIFICATIONS BELL ---------------- */
function renderNotificationBell(session){
  const list = db_get(DB_KEYS.notifications).filter(n => n.audience === 'all' || n.audience === session.role + 's' || n.audience === session.role);
  const panel = document.getElementById('notifPanel');
  const dot = document.getElementById('notifDot');
  if(!panel) return;
  const unread = list.filter(n=>!n.read).length;
  if(dot) dot.parentElement.classList.toggle('has-alert', unread > 0);
  panel.innerHTML = `<div class="dd-head">Notifications ${unread ? `(${unread} new)` : ''}</div>` +
    (list.length ? list.slice(0,6).map(n=>`
      <div class="dd-item ${n.read?'':'unread'}">
        <b>${n.title}</b>
        <small>${n.body}</small>
        <small>${fmtDate(n.date)}</small>
      </div>`).join('') : `<div class="dd-item text-muted">No notifications yet.</div>`);
}

/* ---------------- GENERIC MODAL HELPERS ---------------- */
function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }
document.addEventListener('click', (e)=>{
  if(e.target.classList && e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
});

/* ---------------- SIMPLE FORM VALIDATION HELPER ---------------- */
function validateForm(form){
  let valid = true;
  form.querySelectorAll('[required]').forEach(input=>{
    const field = input.closest('.field') || input.parentElement;
    const bad = !input.value || (input.type==='email' && !/^\S+@\S+\.\S+$/.test(input.value));
    if(bad){ field.classList.add('error'); valid = false; } else { field.classList.remove('error'); }
  });
  return valid;
}
