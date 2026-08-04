/* =========================================================
   EduManage — Administrator dashboard logic
   ========================================================= */

let SESSION;

document.addEventListener('DOMContentLoaded', ()=>{
  SESSION = requireRole('administrator');
  if(!SESSION) return;
  initAppChrome(SESSION);

  renderDashboard();
  renderStudents();
  renderTeachers();
  renderCourses();
  renderTimetable();
  renderAssignments();
  renderPayments();
  renderFeedbackComplaints();
  renderNotificationsSection();
  renderReports();
  renderSettings();

  wireStudentForm();
  wireTeacherForm();
  wireCourseForm();
  wireTimetableForm();
  wireAssignmentForm();
  wireNotifForm();
  wireRespondForm();
  wireProfileForm();
  wireSearchFilters();
  wireFeedbackTabs();
  wirePaymentForm();

  document.querySelectorAll('[data-section-jump]').forEach(el=>{
    el.addEventListener('click', ()=> document.querySelector(`.nav-link[data-section="${el.dataset.sectionJump}"]`).click());
  });
});

/* ================= DASHBOARD ================= */
function renderDashboard(){
  const students = db_get(DB_KEYS.students);
  const teachers = db_get(DB_KEYS.teachers);
  const courses = db_get(DB_KEYS.courses);
  const payments = db_get(DB_KEYS.payments);
  const outstanding = payments.filter(p=>p.status!=='paid').length;

  document.getElementById('statGrid').innerHTML = `
    ${statCard('bi-mortarboard-fill', 'var(--info)', 'var(--info-bg)', students.length, 'Total Students', `${students.filter(s=>s.status==='active').length} active`)}
    ${statCard('bi-person-workspace', 'var(--success)', 'var(--success-bg)', teachers.length, 'Teaching Staff', `${teachers.filter(t=>t.status==='active').length} active`)}
    ${statCard('bi-journal-bookmark-fill', 'var(--gold)', 'var(--gold-soft)', courses.length, 'Active Courses', `${courses.filter(c=>c.status==='ongoing').length} ongoing`)}
    ${statCard('bi-cash-coin', 'var(--danger)', 'var(--danger-bg)', outstanding, 'Outstanding Fees', 'Needs follow-up', true)}
  `;

  const recent = students.slice(-4).reverse();
  document.getElementById('dashRecentStudents').innerHTML = recent.map(s=>`
    <tr><td>${personCell(s.name, s.id)}</td><td>${s.course}</td><td>${s.batch}</td><td>${badge(s.status)}</td></tr>
  `).join('') || emptyRow(4);

  const activity = [
    {t:'New assignment published', d:'Binary Search Tree Implementation — DSA', when:'2 hours ago'},
    {t:'Payment received', d:'Dilini Rathnayake settled Semester 1 fees', when:'Yesterday'},
    {t:'Complaint logged', d:'Projector issue — Lecture Hall 2', when:'3 days ago'},
    {t:'New student enrolled', d:'Oshadha Perera joined BSc Software Engineering', when:'5 days ago'},
  ];
  document.getElementById('dashActivity').innerHTML = activity.map(a=>`
    <li><div class="t-dot"></div><div><div>${a.t}</div><div class="text-muted" style="font-size:12.5px;">${a.d}</div><div class="t-time">${a.when}</div></div></li>
  `).join('');
}

function statCard(icon,color,bg,num,label,delta,warn){
  return `<div class="stat-card">
    <div class="top-row"><div class="icon-wrap" style="background:${bg}; color:${color};"><i class="bi ${icon}"></i></div></div>
    <div class="num">${num}</div>
    <div class="lbl">${label}</div>
    <div class="delta ${warn?'down':'up'}">${delta}</div>
  </div>`;
}
function personCell(name,sub){
  return `<div class="cell-person"><div class="avatar-sm">${initials(name)}</div><div><b>${name}</b><span>${sub}</span></div></div>`;
}
function badge(status){
  const map = {active:'success', suspended:'danger', paid:'success', outstanding:'gold', overdue:'danger',
    ongoing:'success', upcoming:'info', completed:'slate', 'on leave':'gold', open:'success', closed:'slate',
    graded:'success', submitted:'info', new:'gold', 'in review':'info', resolved:'success', missing:'danger'};
  return `<span class="badge badge-${map[status]||'slate'}">${status}</span>`;
}
function emptyRow(cols){ return `<tr><td colspan="${cols}" style="text-align:center; color:var(--slate); padding:26px;">No records yet.</td></tr>`; }

/* ================= STUDENTS ================= */
function renderStudents(){
  const q = (document.getElementById('studentSearch')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('studentStatusFilter')?.value || '';
  let students = db_get(DB_KEYS.students);
  if(q) students = students.filter(s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
  if(statusFilter) students = students.filter(s => s.status === statusFilter);

  const body = document.getElementById('studentTableBody');
  body.innerHTML = students.map(s=>`
    <tr>
      <td>${personCell(s.name, s.email)}</td>
      <td>${s.course}</td>
      <td>${s.batch}</td>
      <td>${s.guardian}</td>
      <td>${badge(s.status)}</td>
      <td><div class="row-actions">
        <button onclick="openStudentModal('${s.id}')" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="danger" onclick="deleteRecord('${DB_KEYS.students}','${s.id}', renderStudents, renderDashboard)" title="Delete"><i class="bi bi-trash"></i></button>
      </div></td>
    </tr>
  `).join('');
  document.getElementById('studentEmptyState').style.display = students.length ? 'none' : 'block';
}

function courseOptionsHTML(selected){
  return db_get(DB_KEYS.courses).map(c=>`<option value="${c.name}" ${c.name===selected?'selected':''}>${c.name}</option>`).join('');
}
function teacherOptionsHTML(selected){
  return db_get(DB_KEYS.teachers).map(t=>`<option value="${t.name}" ${t.name===selected?'selected':''}>${t.name}</option>`).join('');
}

function openStudentModal(id){
  document.getElementById('studentCourse').innerHTML = courseOptionsHTML();
  const form = document.getElementById('studentForm');
  form.reset();
  document.querySelectorAll('#studentForm .field').forEach(f=>f.classList.remove('error'));
  if(id){
    const s = db_get(DB_KEYS.students).find(x=>x.id===id);
    document.getElementById('studentModalTitle').textContent = 'Edit Student';
    document.getElementById('studentId').value = s.id;
    document.getElementById('studentName').value = s.name;
    document.getElementById('studentEmail').value = s.email;
    document.getElementById('studentPhone').value = s.phone;
    document.getElementById('studentGuardian').value = s.guardian;
    document.getElementById('studentCourse').value = s.course;
    document.getElementById('studentBatch').value = s.batch;
    document.getElementById('studentStatus').value = s.status;
  } else {
    document.getElementById('studentModalTitle').textContent = 'Add Student';
    document.getElementById('studentId').value = '';
  }
  openModal('studentModal');
}

function wireStudentForm(){
  document.getElementById('studentForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    if(!validateForm(e.target)) return;
    const id = document.getElementById('studentId').value;
    let students = db_get(DB_KEYS.students);
    const record = {
      id: id || uid('S'),
      name: document.getElementById('studentName').value,
      email: document.getElementById('studentEmail').value,
      phone: document.getElementById('studentPhone').value,
      guardian: document.getElementById('studentGuardian').value,
      course: document.getElementById('studentCourse').value,
      batch: document.getElementById('studentBatch').value,
      status: document.getElementById('studentStatus').value,
    };
    if(id){ students = students.map(s=>s.id===id?record:s); toast('Student details updated.', 'success'); }
    else { students.push(record); toast('Student added.', 'success'); }
    db_set(DB_KEYS.students, students);
    closeModal('studentModal');
    renderStudents(); renderDashboard(); renderReports(); populatePaymentSelectsIfAny();
  });
}

/* ================= TEACHERS ================= */
function renderTeachers(){
  const q = (document.getElementById('teacherSearch')?.value || '').toLowerCase();
  let teachers = db_get(DB_KEYS.teachers);
  if(q) teachers = teachers.filter(t => t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q));
  document.getElementById('teacherTableBody').innerHTML = teachers.map(t=>`
    <tr>
      <td>${personCell(t.name, t.email)}</td>
      <td>${t.subject}</td>
      <td>${t.qualification}</td>
      <td>${fmtDate(t.joined)}</td>
      <td>${badge(t.status)}</td>
      <td><div class="row-actions">
        <button onclick="openTeacherModal('${t.id}')"><i class="bi bi-pencil"></i></button>
        <button class="danger" onclick="deleteRecord('${DB_KEYS.teachers}','${t.id}', renderTeachers, renderDashboard)"><i class="bi bi-trash"></i></button>
      </div></td>
    </tr>
  `).join('') || emptyRow(6);
}

function openTeacherModal(id){
  const form = document.getElementById('teacherForm');
  form.reset();
  document.querySelectorAll('#teacherForm .field').forEach(f=>f.classList.remove('error'));
  if(id){
    const t = db_get(DB_KEYS.teachers).find(x=>x.id===id);
    document.getElementById('teacherModalTitle').textContent = 'Edit Teacher';
    document.getElementById('teacherId').value = t.id;
    document.getElementById('teacherName').value = t.name;
    document.getElementById('teacherEmail').value = t.email;
    document.getElementById('teacherPhone').value = t.phone;
    document.getElementById('teacherQualification').value = t.qualification;
    document.getElementById('teacherSubject').value = t.subject;
    document.getElementById('teacherStatus').value = t.status;
  } else {
    document.getElementById('teacherModalTitle').textContent = 'Add Teacher';
    document.getElementById('teacherId').value = '';
  }
  openModal('teacherModal');
}

function wireTeacherForm(){
  document.getElementById('teacherForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    if(!validateForm(e.target)) return;
    const id = document.getElementById('teacherId').value;
    let teachers = db_get(DB_KEYS.teachers);
    const record = {
      id: id || uid('T'),
      name: document.getElementById('teacherName').value,
      email: document.getElementById('teacherEmail').value,
      phone: document.getElementById('teacherPhone').value,
      qualification: document.getElementById('teacherQualification').value,
      subject: document.getElementById('teacherSubject').value,
      status: document.getElementById('teacherStatus').value,
      joined: id ? teachers.find(t=>t.id===id).joined : todayISO(),
    };
    if(id){ teachers = teachers.map(t=>t.id===id?record:t); toast('Teacher details updated.', 'success'); }
    else { teachers.push(record); toast('Teacher added.', 'success'); }
    db_set(DB_KEYS.teachers, teachers);
    closeModal('teacherModal');
    renderTeachers(); renderDashboard();
  });
}

/* ================= COURSES ================= */
function renderCourses(){
  const q = (document.getElementById('courseSearch')?.value || '').toLowerCase();
  let courses = db_get(DB_KEYS.courses);
  if(q) courses = courses.filter(c => c.name.toLowerCase().includes(q));
  document.getElementById('courseTableBody').innerHTML = courses.map(c=>`
    <tr>
      <td><b>${c.name}</b></td>
      <td>${c.category}</td>
      <td>${c.teacher}</td>
      <td>${c.duration}</td>
      <td>${c.students}</td>
      <td>${badge(c.status)}</td>
      <td><div class="row-actions">
        <button onclick="openCourseModal('${c.id}')"><i class="bi bi-pencil"></i></button>
        <button class="danger" onclick="deleteRecord('${DB_KEYS.courses}','${c.id}', renderCourses, renderDashboard)"><i class="bi bi-trash"></i></button>
      </div></td>
    </tr>
  `).join('') || emptyRow(7);
}

function openCourseModal(id){
  document.getElementById('courseTeacher').innerHTML = teacherOptionsHTML();
  const form = document.getElementById('courseForm');
  form.reset();
  if(id){
    const c = db_get(DB_KEYS.courses).find(x=>x.id===id);
    document.getElementById('courseModalTitle').textContent = 'Edit Course';
    document.getElementById('courseId').value = c.id;
    document.getElementById('courseName').value = c.name;
    document.getElementById('courseCategory').value = c.category;
    document.getElementById('courseDuration').value = c.duration;
    document.getElementById('courseTeacher').value = c.teacher;
    document.getElementById('courseStatus').value = c.status;
  } else {
    document.getElementById('courseModalTitle').textContent = 'Add Course';
    document.getElementById('courseId').value = '';
  }
  openModal('courseModal');
}

function wireCourseForm(){
  document.getElementById('courseForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    if(!validateForm(e.target)) return;
    const id = document.getElementById('courseId').value;
    let courses = db_get(DB_KEYS.courses);
    const record = {
      id: id || uid('C'),
      name: document.getElementById('courseName').value,
      category: document.getElementById('courseCategory').value,
      duration: document.getElementById('courseDuration').value,
      teacher: document.getElementById('courseTeacher').value,
      status: document.getElementById('courseStatus').value,
      students: id ? courses.find(c=>c.id===id).students : 0,
    };
    if(id){ courses = courses.map(c=>c.id===id?record:c); toast('Course updated.', 'success'); }
    else { courses.push(record); toast('Course created.', 'success'); }
    db_set(DB_KEYS.courses, courses);
    closeModal('courseModal');
    renderCourses(); renderDashboard(); renderReports();
  });
}

/* ================= TIMETABLE ================= */
function renderTimetable(){
  const rows = db_get(DB_KEYS.timetable);
  const order = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
  rows.sort((a,b)=> order.indexOf(a.day)-order.indexOf(b.day));
  document.getElementById('timetableTableBody').innerHTML = rows.map(t=>`
    <tr>
      <td><b>${t.day}</b></td><td>${t.time}</td><td>${t.course}</td><td>${t.teacher}</td><td>${t.room}</td>
      <td><div class="row-actions"><button class="danger" onclick="deleteRecord('${DB_KEYS.timetable}','${t.id}', renderTimetable)"><i class="bi bi-trash"></i></button></div></td>
    </tr>
  `).join('') || emptyRow(6);
}

function openTimetableModal(){
  document.getElementById('ttCourse').innerHTML = courseOptionsHTML();
  document.getElementById('timetableForm').reset();
  openModal('timetableModal');
}
function wireTimetableForm(){
  document.getElementById('timetableForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    if(!validateForm(e.target)) return;
    const courseName = document.getElementById('ttCourse').value;
    const teacher = db_get(DB_KEYS.courses).find(c=>c.name===courseName)?.teacher || '—';
    const rows = db_get(DB_KEYS.timetable);
    rows.push({ id:uid('TT'), day:document.getElementById('ttDay').value, time:document.getElementById('ttTime').value,
      course:courseName, teacher, room:document.getElementById('ttRoom').value });
    db_set(DB_KEYS.timetable, rows);
    toast('Class scheduled.', 'success');
    closeModal('timetableModal');
    renderTimetable();
  });
}

/* ================= ASSIGNMENTS ================= */
function renderAssignments(){
  const q = (document.getElementById('assignmentSearch')?.value || '').toLowerCase();
  let items = db_get(DB_KEYS.assignments);
  if(q) items = items.filter(a=>a.title.toLowerCase().includes(q) || a.course.toLowerCase().includes(q));
  const subs = db_get(DB_KEYS.submissions);
  document.getElementById('assignmentTableBody').innerHTML = items.map(a=>{
    const count = subs.filter(s=>s.assignmentId===a.id).length;
    return `<tr>
      <td><b>${a.title}</b></td><td>${a.course}</td><td>${fmtDate(a.due)}</td><td>${a.maxMarks}</td>
      <td>${count}</td><td>${badge(a.status)}</td>
      <td><div class="row-actions"><button class="danger" onclick="deleteRecord('${DB_KEYS.assignments}','${a.id}', renderAssignments)"><i class="bi bi-trash"></i></button></div></td>
    </tr>`;
  }).join('') || emptyRow(7);
}
function openAssignmentModal(){
  document.getElementById('asgCourse').innerHTML = courseOptionsHTML();
  document.getElementById('assignmentForm').reset();
  document.getElementById('asgMarks').value = 100;
  openModal('assignmentModal');
}
function wireAssignmentForm(){
  document.getElementById('assignmentForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    if(!validateForm(e.target)) return;
    const courseName = document.getElementById('asgCourse').value;
    const teacher = db_get(DB_KEYS.courses).find(c=>c.name===courseName)?.teacher || '—';
    const items = db_get(DB_KEYS.assignments);
    items.push({
      id: uid('A'), title:document.getElementById('asgTitle').value, course:courseName, teacher,
      due:document.getElementById('asgDue').value, maxMarks:Number(document.getElementById('asgMarks').value),
      status:document.getElementById('asgStatus').value, instructions:document.getElementById('asgInstructions').value
    });
    db_set(DB_KEYS.assignments, items);
    toast('Assignment published.', 'success');
    closeModal('assignmentModal');
    renderAssignments();

    const notifs = db_get(DB_KEYS.notifications);
    notifs.push({id:uid('NTF'), title:'New assignment: '+document.getElementById('asgTitle').value, body:'Posted for '+courseName, audience:'students', date:todayISO(), read:false});
    db_set(DB_KEYS.notifications, notifs);
    renderNotificationsSection();
  });
}

/* ================= PAYMENTS ================= */
function renderPayments(){
  const q = (document.getElementById('paymentSearch')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('paymentStatusFilter')?.value || '';
  let items = db_get(DB_KEYS.payments);
  if(q) items = items.filter(p=>p.studentName.toLowerCase().includes(q));
  if(statusFilter) items = items.filter(p=>p.status===statusFilter);

  document.getElementById('paymentTableBody').innerHTML = items.map(p=>`
    <tr>
      <td>${personCell(p.studentName, p.studentId)}</td><td>${p.term}</td><td>${fmtMoney(p.amount)}</td>
      <td>${fmtDate(p.date)}</td><td>${p.method||'—'}</td><td>${badge(p.status)}</td>
      <td><div class="row-actions">
        ${p.status!=='paid' ? `<button onclick="markPaid('${p.id}')" title="Mark as paid"><i class="bi bi-check-lg"></i></button>` : ''}
        <button onclick="openPaymentModal('${p.id}')" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="danger" onclick="deleteRecord('${DB_KEYS.payments}','${p.id}', renderPayments, renderReports)" title="Delete"><i class="bi bi-trash"></i></button>
      </div></td>
    </tr>
  `).join('') || emptyRow(7);

  const all = db_get(DB_KEYS.payments);
  const paidTotal = all.filter(p=>p.status==='paid').reduce((s,p)=>s+p.amount,0);
  const outTotal = all.filter(p=>p.status!=='paid').reduce((s,p)=>s+p.amount,0);
  document.getElementById('paymentStatGrid').innerHTML = `
    ${statCard('bi-check-circle-fill','var(--success)','var(--success-bg)', fmtMoney(paidTotal), 'Collected', all.filter(p=>p.status==='paid').length+' payments')}
    ${statCard('bi-hourglass-split','var(--gold)','var(--gold-soft)', fmtMoney(outTotal), 'Outstanding', all.filter(p=>p.status!=='paid').length+' invoices')}
    ${statCard('bi-receipt','var(--info)','var(--info-bg)', all.length, 'Total Invoices', 'This term')}
  `;
}
function markPaid(id){
  let payments = db_get(DB_KEYS.payments);
  payments = payments.map(p=> p.id===id ? {...p, status:'paid', date:todayISO(), method:p.method||'Cash'} : p);
  db_set(DB_KEYS.payments, payments);
  toast('Payment marked as settled.', 'success');
  renderPayments(); renderReports();
}

function openPaymentModal(id){
  document.getElementById('paymentStudent').innerHTML = db_get(DB_KEYS.students)
    .map(s=>`<option value="${s.id}">${s.name} (${s.id})</option>`).join('');
  const form = document.getElementById('paymentForm');
  form.reset();
  document.querySelectorAll('#paymentForm .field').forEach(f=>f.classList.remove('error'));
  if(id){
    const p = db_get(DB_KEYS.payments).find(x=>x.id===id);
    document.getElementById('paymentModalTitle').textContent = 'Edit Payment';
    document.getElementById('paymentId').value = p.id;
    document.getElementById('paymentStudent').value = p.studentId;
    document.getElementById('paymentTerm').value = p.term;
    document.getElementById('paymentAmount').value = p.amount;
    document.getElementById('paymentStatus').value = p.status;
    document.getElementById('paymentMethod').value = p.method || '';
    document.getElementById('paymentDate').value = p.date || '';
  } else {
    document.getElementById('paymentModalTitle').textContent = 'Add Payment';
    document.getElementById('paymentId').value = '';
    document.getElementById('paymentTerm').value = '2026 — Semester 2';
    document.getElementById('paymentAmount').value = 75000;
  }
  openModal('paymentModal');
}

function wirePaymentForm(){
  document.getElementById('paymentForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    if(!validateForm(e.target)) return;
    const id = document.getElementById('paymentId').value;
    const studentId = document.getElementById('paymentStudent').value;
    const student = db_get(DB_KEYS.students).find(s=>s.id===studentId);
    let payments = db_get(DB_KEYS.payments);
    const record = {
      id: id || uid('PAY'),
      studentId,
      studentName: student ? student.name : '—',
      term: document.getElementById('paymentTerm').value,
      amount: Number(document.getElementById('paymentAmount').value),
      status: document.getElementById('paymentStatus').value,
      method: document.getElementById('paymentMethod').value || null,
      date: document.getElementById('paymentDate').value || null,
    };
    if(id){ payments = payments.map(p=>p.id===id?record:p); toast('Payment updated.', 'success'); }
    else { payments.push(record); toast('Payment record added.', 'success'); }
    db_set(DB_KEYS.payments, payments);
    closeModal('paymentModal');
    renderPayments(); renderReports(); renderDashboard();
  });
}
function populatePaymentSelectsIfAny(){ /* placeholder for future student-linked selects */ }

/* ================= FEEDBACK & COMPLAINTS ================= */
function renderFeedbackComplaints(){
  const fb = db_get(DB_KEYS.feedback);
  document.getElementById('feedbackTableBody').innerHTML = fb.map(f=>`
    <tr><td><b>${f.from}</b></td><td>${f.subject}</td><td>${f.message}</td><td>${fmtDate(f.date)}</td><td>${badge(f.status)}</td></tr>
  `).join('') || emptyRow(5);

  const cx = db_get(DB_KEYS.complaints);
  document.getElementById('complaintsTableBody').innerHTML = cx.map(c=>`
    <tr>
      <td><b>${c.from}</b></td><td>${c.subject}</td><td>${c.message}</td><td>${fmtDate(c.date)}</td><td>${badge(c.status)}</td>
      <td><button class="btn btn-outline btn-sm" onclick="openRespondModal('${c.id}')">Respond</button></td>
    </tr>
  `).join('') || emptyRow(6);
}
function wireFeedbackTabs(){
  document.querySelectorAll('[data-fbtab]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('[data-fbtab]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const isFb = btn.dataset.fbtab === 'feedback';
      document.getElementById('feedbackTable').style.display = isFb ? '' : 'none';
      document.getElementById('complaintsTable').style.display = isFb ? 'none' : '';
    });
  });
}
function openRespondModal(id){
  const c = db_get(DB_KEYS.complaints).find(x=>x.id===id);
  document.getElementById('respondId').value = id;
  document.getElementById('respondContext').textContent = `"${c.message}" — ${c.from}`;
  document.getElementById('respondText').value = c.response || '';
  document.getElementById('respondStatus').value = c.status === 'resolved' ? 'resolved' : 'in review';
  openModal('respondModal');
}
function wireRespondForm(){
  document.getElementById('respondForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const id = document.getElementById('respondId').value;
    let cx = db_get(DB_KEYS.complaints);
    cx = cx.map(c=> c.id===id ? {...c, response:document.getElementById('respondText').value, status:document.getElementById('respondStatus').value} : c);
    db_set(DB_KEYS.complaints, cx);
    toast('Response sent to student.', 'success');
    closeModal('respondModal');
    renderFeedbackComplaints();
  });
}

/* ================= NOTIFICATIONS ================= */
function renderNotificationsSection(){
  const list = db_get(DB_KEYS.notifications).slice().reverse();
  document.getElementById('notifHistoryBody').innerHTML = list.map(n=>`
    <tr><td><b>${n.title}</b><div class="text-muted" style="font-size:12px;">${n.body}</div></td><td>${badge(n.audience)}</td><td>${fmtDate(n.date)}</td></tr>
  `).join('') || emptyRow(3);
  renderNotificationBell(SESSION);
}
function wireNotifForm(){
  document.getElementById('notifForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const items = db_get(DB_KEYS.notifications);
    items.push({id:uid('NTF'), title:document.getElementById('notifTitle').value, body:document.getElementById('notifBody').value,
      audience:document.getElementById('notifAudience').value, date:todayISO(), read:false});
    db_set(DB_KEYS.notifications, items);
    toast('Notification sent.', 'success');
    e.target.reset();
    renderNotificationsSection();
  });
}

/* ================= REPORTS ================= */
function renderReports(){
  const students = db_get(DB_KEYS.students), teachers = db_get(DB_KEYS.teachers), courses = db_get(DB_KEYS.courses), payments = db_get(DB_KEYS.payments);
  document.getElementById('reportStatGrid').innerHTML = `
    ${statCard('bi-mortarboard-fill','var(--info)','var(--info-bg)', students.length, 'Students')}
    ${statCard('bi-person-workspace','var(--success)','var(--success-bg)', teachers.length, 'Teachers')}
    ${statCard('bi-journal-bookmark-fill','var(--gold)','var(--gold-soft)', courses.length, 'Courses')}
    ${statCard('bi-cash-coin','var(--danger)','var(--danger-bg)', fmtMoney(payments.reduce((s,p)=>s+(p.status==='paid'?p.amount:0),0)), 'Fees Collected')}
  `;
  document.getElementById('reportCoursesBody').innerHTML = courses.map(c=>`<tr><td>${c.name}</td><td>${c.students}</td><td>${badge(c.status)}</td></tr>`).join('') || emptyRow(3);

  const groups = {};
  payments.forEach(p=>{ groups[p.status] = groups[p.status] || {count:0,total:0}; groups[p.status].count++; groups[p.status].total += p.amount; });
  document.getElementById('reportPaymentsBody').innerHTML = Object.keys(groups).map(k=>`<tr><td>${badge(k)}</td><td>${groups[k].count}</td><td>${fmtMoney(groups[k].total)}</td></tr>`).join('') || emptyRow(3);
}
function exportReport(type){
  const dataMap = { students: db_get(DB_KEYS.students), teachers: db_get(DB_KEYS.teachers), payments: db_get(DB_KEYS.payments) };
  const rows = dataMap[type];
  if(!rows || !rows.length){ toast('No data to export yet.', 'error'); return; }
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(',')].concat(rows.map(r=>headers.map(h=>`"${String(r[h]??'').replace(/"/g,'""')}"`).join(','))).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${type}_report_${todayISO()}.csv`;
  link.click();
  toast('Report exported.', 'success');
}

/* ================= SETTINGS ================= */
function renderSettings(){
  document.getElementById('profName').value = SESSION.name;
  document.getElementById('profEmail').value = SESSION.email;
  const users = db_get(DB_KEYS.users);
  document.getElementById('settingsUsersBody').innerHTML = users.map(u=>`
    <tr><td>${personCell(u.name, u.id)}</td><td>${u.email}</td><td>${badge(u.role==='administrator'?'gold':u.role)}</td></tr>
  `).join('');
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

/* ================= SHARED HELPERS ================= */
function deleteRecord(key, id, ...rerenders){
  if(!confirm('Are you sure you want to delete this record? This cannot be undone.')) return;
  const items = db_get(key).filter(x=>x.id!==id);
  db_set(key, items);
  toast('Record deleted.', 'success');
  rerenders.forEach(fn=>fn && fn());
}

function wireSearchFilters(){
  ['studentSearch','studentStatusFilter'].forEach(id=> document.getElementById(id)?.addEventListener('input', renderStudents));
  document.getElementById('studentStatusFilter')?.addEventListener('change', renderStudents);
  document.getElementById('teacherSearch')?.addEventListener('input', renderTeachers);
  document.getElementById('courseSearch')?.addEventListener('input', renderCourses);
  document.getElementById('assignmentSearch')?.addEventListener('input', renderAssignments);
  document.getElementById('paymentSearch')?.addEventListener('input', renderPayments);
  document.getElementById('paymentStatusFilter')?.addEventListener('change', renderPayments);
}
