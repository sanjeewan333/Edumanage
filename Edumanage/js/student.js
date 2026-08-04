/* =========================================================
   EduManage — Student dashboard logic
   ========================================================= */

let SESSION;
let MY_STUDENT;

document.addEventListener('DOMContentLoaded', ()=>{
  SESSION = requireRole('student');
  if(!SESSION) return;
  initAppChrome(SESSION);

  MY_STUDENT = db_get(DB_KEYS.students).find(s=>s.email.toLowerCase()===SESSION.email.toLowerCase())
    || db_get(DB_KEYS.students)[0];

  renderDashboard();
  renderCourses();
  renderMaterials();
  renderTimetable();
  renderAssignments();
  setupSubmissionForm();
  renderMySubmissions();
  renderProgress();
  renderPayments();
  renderFeedback();
  renderComplaints();
  renderStudentNotifications();
  renderProfile();

  wireFeedbackForm();
  wireComplaintForm();
  wireProfileForm();

  document.querySelectorAll('[data-section-jump]').forEach(el=>{
    el.addEventListener('click', ()=> document.querySelector(`.nav-link[data-section="${el.dataset.sectionJump}"]`).click());
  });
});

function badge(status){
  const map = {active:'success', suspended:'danger', paid:'success', outstanding:'gold', overdue:'danger',
    ongoing:'success', upcoming:'info', completed:'slate', open:'success', closed:'slate',
    graded:'success', submitted:'info', new:'gold', 'in review':'info', resolved:'success', missing:'danger'};
  return `<span class="badge badge-${map[status]||'slate'}">${status}</span>`;
}
function sCard(icon,color,bg,num,label){
  return `<div class="stat-card"><div class="top-row"><div class="icon-wrap" style="background:${bg};color:${color};"><i class="bi ${icon}"></i></div></div><div class="num">${num}</div><div class="lbl">${label}</div></div>`;
}
function emptyRow(cols,msg){ return `<tr><td colspan="${cols}" style="text-align:center; color:var(--slate); padding:22px;">${msg||'Nothing here yet.'}</td></tr>`; }

/* ============ DASHBOARD ============ */
function renderDashboard(){
  const assignments = db_get(DB_KEYS.assignments).filter(a=>a.course===MY_STUDENT.course || true);
  const mySubs = db_get(DB_KEYS.submissions).filter(s=>s.studentId===MY_STUDENT.id);
  const graded = mySubs.filter(s=>s.status==='graded');
  const avg = graded.length ? Math.round(graded.reduce((sum,s)=>{
    const a = assignments.find(a=>a.id===s.assignmentId);
    return sum + (s.marks / (a?a.maxMarks:100) * 100);
  },0) / graded.length) : null;
  const payments = db_get(DB_KEYS.payments).filter(p=>p.studentId===MY_STUDENT.id);
  const dueCount = payments.filter(p=>p.status!=='paid').length;

  document.getElementById('statGrid').innerHTML = `
    ${sCard('bi-journal-bookmark-fill','var(--info)','var(--info-bg)', db_get(DB_KEYS.courses).length, 'Enrolled Courses')}
    ${sCard('bi-clipboard-check-fill','var(--gold)','var(--gold-soft)', assignments.filter(a=>a.status==='open').length, 'Open Assignments')}
    ${sCard('bi-graph-up-arrow','var(--success)','var(--success-bg)', avg!==null ? avg+'%' : '—', 'Grade Average')}
    ${sCard('bi-cash-coin', dueCount ? 'var(--danger)' : 'var(--success)', dueCount ? 'var(--danger-bg)':'var(--success-bg)', dueCount, 'Fees Due')}
  `;

  const openOnes = assignments.filter(a=>a.status==='open').sort((a,b)=> new Date(a.due)-new Date(b.due));
  document.getElementById('dashDeadlines').innerHTML = openOnes.slice(0,5).map(a=>`<tr><td><b>${a.title}</b></td><td>${a.course}</td><td>${fmtDate(a.due)}</td></tr>`).join('') || emptyRow(3,'No open assignments.');

  const today = new Date().toLocaleDateString('en-US',{weekday:'long'});
  const todays = db_get(DB_KEYS.timetable).filter(t=>t.day===today);
  document.getElementById('dashToday').innerHTML = todays.map(t=>`<tr><td>${t.time}</td><td>${t.course}</td><td>${t.room}</td></tr>`).join('') || emptyRow(3,'No classes today.');
}

/* ============ COURSES ============ */
function renderCourses(){
  const rows = db_get(DB_KEYS.courses);
  document.getElementById('coursesBody').innerHTML = rows.map(c=>`
    <tr><td><b>${c.name}</b></td><td>${c.category}</td><td>${c.teacher}</td><td>${c.duration}</td><td>${badge(c.status)}</td></tr>
  `).join('') || emptyRow(5);
}

/* ============ MATERIALS ============ */
function renderMaterials(){
  const all = db_get('edu_materials') || [];
  document.getElementById('materialsBody').innerHTML = all.map(m=>`
    <tr><td><i class="bi bi-file-earmark-text"></i> ${m.title}</td><td>${m.course}</td><td>${fmtDate(m.date)}</td>
    <td><button class="btn btn-outline btn-sm" onclick="toast('Downloading ${m.fileName.replace(/'/g,"")}…','info')"><i class="bi bi-download"></i></button></td></tr>
  `).join('') || emptyRow(4,'No materials have been posted yet.');
}

/* ============ TIMETABLE ============ */
function renderTimetable(){
  const order = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const rows = db_get(DB_KEYS.timetable).slice().sort((a,b)=>order.indexOf(a.day)-order.indexOf(b.day));
  document.getElementById('timetableBody').innerHTML = rows.map(t=>`
    <tr><td><b>${t.day}</b></td><td>${t.time}</td><td>${t.course}</td><td>${t.teacher}</td><td>${t.room}</td></tr>
  `).join('') || emptyRow(5);
}

/* ============ ASSIGNMENTS ============ */
function renderAssignments(){
  const items = db_get(DB_KEYS.assignments);
  const mySubs = db_get(DB_KEYS.submissions).filter(s=>s.studentId===MY_STUDENT.id);
  document.getElementById('assignmentsBody').innerHTML = items.map(a=>{
    const sub = mySubs.find(s=>s.assignmentId===a.id);
    return `<tr>
      <td><b>${a.title}</b><div class="text-muted" style="font-size:12px;">${a.instructions}</div></td>
      <td>${a.course}</td><td>${fmtDate(a.due)}</td><td>${a.maxMarks}</td><td>${badge(a.status)}</td>
      <td>${sub ? badge(sub.status) : '<span class="badge badge-danger">not submitted</span>'}</td>
    </tr>`;
  }).join('') || emptyRow(6);
}

/* ============ ASSIGNMENT SUBMISSION ============ */
function setupSubmissionForm(){
  const select = document.getElementById('subAssignment');
  const open = db_get(DB_KEYS.assignments).filter(a=>a.status==='open');
  select.innerHTML = open.map(a=>`<option value="${a.id}">${a.title} — ${a.course} (due ${fmtDate(a.due)})</option>`).join('') || `<option value="">No open assignments</option>`;
}
function wireFeedbackForm(){} // placeholder to keep function ordering readable (feedback wired below)

document.addEventListener('DOMContentLoaded', ()=>{
  const submitForm = document.getElementById('submitForm');
  if(submitForm){
    submitForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const asgId = document.getElementById('subAssignment').value;
      if(!asgId){ toast('There is no open assignment to submit to.', 'error'); return; }
      const fileInput = document.getElementById('subFile');
      if(!fileInput.files[0]){ toast('Please choose a file to upload.', 'error'); return; }

      const subs = db_get(DB_KEYS.submissions);
      const already = subs.find(s=>s.assignmentId===asgId && s.studentId===MY_STUDENT.id);
      if(already){
        toast('You have already submitted this assignment.', 'error');
        return;
      }
      subs.push({
        id: uid('SUB'), assignmentId: asgId, studentId: MY_STUDENT.id, studentName: MY_STUDENT.name,
        fileName: fileInput.files[0].name, submittedAt: todayISO(), marks: null, status: 'submitted', feedback: ''
      });
      db_set(DB_KEYS.submissions, subs);
      toast('Assignment submitted successfully.', 'success');
      submitForm.reset();
      renderMySubmissions(); renderAssignments(); renderDashboard();
    });
  }
});

function renderMySubmissions(){
  const mine = db_get(DB_KEYS.submissions).filter(s=>s.studentId===MY_STUDENT.id);
  const assignments = db_get(DB_KEYS.assignments);
  document.getElementById('mySubmissionsBody').innerHTML = mine.map(s=>{
    const a = assignments.find(a=>a.id===s.assignmentId);
    return `<tr><td>${a?a.title:'—'}</td><td><i class="bi bi-paperclip"></i> ${s.fileName}</td><td>${fmtDate(s.submittedAt)}</td>
      <td>${s.marks!=null ? s.marks+' / '+(a?a.maxMarks:100) : '—'}</td><td>${badge(s.status)}</td></tr>`;
  }).join('') || emptyRow(5,'You haven\'t submitted anything yet.');
}

/* ============ PROGRESS ============ */
function renderProgress(){
  const mine = db_get(DB_KEYS.submissions).filter(s=>s.studentId===MY_STUDENT.id);
  const assignments = db_get(DB_KEYS.assignments);
  document.getElementById('progressBody').innerHTML = mine.map(s=>{
    const a = assignments.find(a=>a.id===s.assignmentId);
    return `<tr><td>${a?a.title:'—'}</td><td>${a?a.course:'—'}</td><td>${s.marks!=null ? s.marks+' / '+(a?a.maxMarks:100) : 'Not graded'}</td><td>${badge(s.status)}</td></tr>`;
  }).join('') || emptyRow(4,'No graded work yet.');

  const graded = mine.filter(s=>s.status==='graded');
  if(graded.length){
    const avg = Math.round(graded.reduce((sum,s)=>{ const a=assignments.find(a=>a.id===s.assignmentId); return sum + (s.marks/(a?a.maxMarks:100)*100); },0)/graded.length);
    document.getElementById('progressAvgLabel').textContent = avg + '%';
    document.getElementById('progressAvgBar').style.width = avg + '%';
  } else {
    document.getElementById('progressAvgLabel').textContent = 'No grades yet';
    document.getElementById('progressAvgBar').style.width = '0%';
  }
}

/* ============ PAYMENTS ============ */
function renderPayments(){
  const mine = db_get(DB_KEYS.payments).filter(p=>p.studentId===MY_STUDENT.id);
  document.getElementById('paymentsBody').innerHTML = mine.map(p=>`
    <tr><td>${p.term}</td><td>${fmtMoney(p.amount)}</td><td>${fmtDate(p.date)}</td><td>${p.method||'—'}</td><td>${badge(p.status)}</td></tr>
  `).join('') || emptyRow(5,'No payment records yet.');
}

/* ============ FEEDBACK ============ */
function renderFeedback(){
  const mine = db_get(DB_KEYS.feedback).filter(f=>f.from===MY_STUDENT.name);
  document.getElementById('myFeedbackBody').innerHTML = mine.map(f=>`
    <tr><td>${f.subject}</td><td>${f.message}</td><td>${fmtDate(f.date)}</td><td>${badge(f.status)}</td></tr>
  `).join('') || emptyRow(4,'You haven\'t sent any feedback yet.');
}
function wireFeedbackForm(){
  document.getElementById('feedbackForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    if(!validateForm(e.target)) return;
    const items = db_get(DB_KEYS.feedback);
    items.push({id:uid('FB'), from:MY_STUDENT.name, role:'student', subject:document.getElementById('fbSubject').value, message:document.getElementById('fbMessage').value, date:todayISO(), status:'new'});
    db_set(DB_KEYS.feedback, items);
    toast('Feedback sent, thank you.', 'success');
    e.target.reset();
    renderFeedback();
  });
}

/* ============ COMPLAINTS ============ */
function renderComplaints(){
  const mine = db_get(DB_KEYS.complaints).filter(c=>c.from===MY_STUDENT.name);
  document.getElementById('myComplaintsBody').innerHTML = mine.map(c=>`
    <tr><td>${c.subject}</td><td>${c.message}</td><td>${badge(c.status)}</td><td>${c.response || '<span class="text-muted">Awaiting response</span>'}</td></tr>
  `).join('') || emptyRow(4,'No complaints filed.');
}
function wireComplaintForm(){
  document.getElementById('complaintForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    if(!validateForm(e.target)) return;
    const items = db_get(DB_KEYS.complaints);
    items.push({id:uid('CMP'), from:MY_STUDENT.name, role:'student', subject:document.getElementById('cxSubject').value, message:document.getElementById('cxMessage').value, date:todayISO(), status:'in review', response:''});
    db_set(DB_KEYS.complaints, items);
    toast('Complaint submitted. Admin will respond soon.', 'success');
    e.target.reset();
    renderComplaints();
  });
}

/* ============ NOTIFICATIONS ============ */
function renderStudentNotifications(){
  const list = db_get(DB_KEYS.notifications).filter(n=>n.audience==='all'||n.audience==='students').slice().reverse();
  document.getElementById('studentNotifBody').innerHTML = list.map(n=>`<tr><td><b>${n.title}</b></td><td>${n.body}</td><td>${fmtDate(n.date)}</td></tr>`).join('') || emptyRow(3);
}

/* ============ PROFILE ============ */
function renderProfile(){
  document.getElementById('profName').value = SESSION.name;
  document.getElementById('profEmail').value = SESSION.email;
}
function wireProfileForm(){
  document.getElementById('profileForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const users = db_get(DB_KEYS.users).map(u => u.id===SESSION.userId ? {...u, name:document.getElementById('profName').value, email:document.getElementById('profEmail').value} : u);
    db_set(DB_KEYS.users, users);
    SESSION.name = document.getElementById('profName').value;
    setSession(SESSION);
    document.getElementById('chromeUserName').textContent = SESSION.name;
    toast('Profile updated.', 'success');
  });
}
