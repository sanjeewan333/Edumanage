/* =========================================================
   EduManage — Teacher dashboard logic
   ========================================================= */

let SESSION;

document.addEventListener('DOMContentLoaded', ()=>{
  SESSION = requireRole('teacher');
  if(!SESSION) return;
  initAppChrome(SESSION);

  renderTeacherDashboard();
  renderMyTimetable();
  renderMyCourses();
  renderMaterials();
  renderTeacherAssignments();
  renderSubmissions();
  renderProgress();
  setupAttendance();
  renderTeacherNotifications();
  renderTeacherProfile();

  wireMaterialForm();
  wireTeacherAssignmentForm();
  wireGradeForm();
  wireTeacherProfileForm();

  document.querySelectorAll('[data-section-jump]').forEach(el=>{
    el.addEventListener('click', ()=> document.querySelector(`.nav-link[data-section="${el.dataset.sectionJump}"]`).click());
  });
});

function myCourseNames(){
  return db_get(DB_KEYS.courses).filter(c=>c.teacher===SESSION.name).map(c=>c.name);
}
function courseOptionsForMe(){
  return db_get(DB_KEYS.courses).filter(c=>c.teacher===SESSION.name).map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
}

/* ============ DASHBOARD ============ */
function renderTeacherDashboard(){
  const myCourses = db_get(DB_KEYS.courses).filter(c=>c.teacher===SESSION.name);
  const myAssignments = db_get(DB_KEYS.assignments).filter(a=>a.teacher===SESSION.name);
  const subs = db_get(DB_KEYS.submissions);
  const pending = subs.filter(s => myAssignments.some(a=>a.id===s.assignmentId) && s.status==='submitted');
  const totalStudents = myCourses.reduce((s,c)=>s+c.students,0);

  document.getElementById('statGrid').innerHTML = `
    ${sCard('bi-journal-bookmark-fill','var(--gold)','var(--gold-soft)', myCourses.length, 'My Courses')}
    ${sCard('bi-people-fill','var(--info)','var(--info-bg)', totalStudents, 'Total Students')}
    ${sCard('bi-clipboard-check-fill','var(--success)','var(--success-bg)', myAssignments.length, 'Assignments Set')}
    ${sCard('bi-hourglass-split','var(--danger)','var(--danger-bg)', pending.length, 'Pending Grading')}
  `;

  const today = new Date().toLocaleDateString('en-US',{weekday:'long'});
  const todays = db_get(DB_KEYS.timetable).filter(t=>t.teacher===SESSION.name && t.day===today);
  document.getElementById('dashToday').innerHTML = todays.map(t=>`<tr><td>${t.time}</td><td>${t.course}</td><td>${t.room}</td></tr>`).join('') || `<tr><td colspan="3" style="text-align:center; color:var(--slate); padding:20px;">No classes scheduled for today.</td></tr>`;

  document.getElementById('dashPending').innerHTML = pending.slice(0,5).map(s=>{
    const a = myAssignments.find(a=>a.id===s.assignmentId);
    return `<tr><td>${s.studentName}</td><td>${a?a.title:'—'}</td><td>${fmtDate(s.submittedAt)}</td></tr>`;
  }).join('') || `<tr><td colspan="3" style="text-align:center; color:var(--slate); padding:20px;">All caught up.</td></tr>`;
}
function sCard(icon,color,bg,num,label){
  return `<div class="stat-card"><div class="top-row"><div class="icon-wrap" style="background:${bg};color:${color};"><i class="bi ${icon}"></i></div></div><div class="num">${num}</div><div class="lbl">${label}</div></div>`;
}
function badge(status){
  const map = {active:'success', suspended:'danger', paid:'success', outstanding:'gold', overdue:'danger',
    ongoing:'success', upcoming:'info', completed:'slate', open:'success', closed:'slate',
    graded:'success', submitted:'info', present:'success', absent:'danger', late:'gold'};
  return `<span class="badge badge-${map[status]||'slate'}">${status}</span>`;
}

/* ============ MY TIMETABLE ============ */
function renderMyTimetable(){
  const order = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const rows = db_get(DB_KEYS.timetable).filter(t=>t.teacher===SESSION.name).sort((a,b)=>order.indexOf(a.day)-order.indexOf(b.day));
  document.getElementById('myTimetableBody').innerHTML = rows.map(t=>`<tr><td><b>${t.day}</b></td><td>${t.time}</td><td>${t.course}</td><td>${t.room}</td></tr>`).join('')
    || `<tr><td colspan="4" style="text-align:center; color:var(--slate); padding:20px;">No classes scheduled yet.</td></tr>`;
}

/* ============ MY COURSES ============ */
function renderMyCourses(){
  const rows = db_get(DB_KEYS.courses).filter(c=>c.teacher===SESSION.name);
  document.getElementById('myCoursesBody').innerHTML = rows.map(c=>`
    <tr><td><b>${c.name}</b></td><td>${c.category}</td><td>${c.duration}</td><td>${c.students}</td><td>${badge(c.status)}</td></tr>
  `).join('') || `<tr><td colspan="5" style="text-align:center; color:var(--slate); padding:20px;">No courses assigned yet.</td></tr>`;
}

/* ============ MATERIALS ============ */
function renderMaterials(){
  const all = db_get('edu_materials') || [];
  const mine = all.filter(m=>myCourseNames().includes(m.course));
  document.getElementById('materialsBody').innerHTML = mine.map(m=>`
    <tr><td><i class="bi bi-file-earmark-text"></i> ${m.title}</td><td>${m.course}</td><td>${fmtDate(m.date)}</td>
    <td><div class="row-actions"><button class="danger" onclick="deleteMaterial('${m.id}')"><i class="bi bi-trash"></i></button></div></td></tr>
  `).join('') || `<tr><td colspan="4" style="text-align:center; color:var(--slate); padding:20px;">No materials uploaded yet.</td></tr>`;
}
function openMaterialModal(){
  document.getElementById('matCourse').innerHTML = courseOptionsForMe();
  document.getElementById('materialForm').reset();
  openModal('materialModal');
}
function wireMaterialForm(){
  document.getElementById('materialForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    if(!validateForm(e.target)) return;
    const fileInput = document.getElementById('matFile');
    const fileName = fileInput.files[0] ? fileInput.files[0].name : 'material.pdf';
    const all = db_get('edu_materials') || [];
    all.push({id:uid('MAT'), title:document.getElementById('matTitle').value, course:document.getElementById('matCourse').value, fileName, date:todayISO()});
    db_set('edu_materials', all);
    toast('Material uploaded.', 'success');
    closeModal('materialModal');
    renderMaterials();
  });
}
function deleteMaterial(id){
  if(!confirm('Delete this material?')) return;
  db_set('edu_materials', (db_get('edu_materials')||[]).filter(m=>m.id!==id));
  toast('Material removed.', 'success');
  renderMaterials();
}

/* ============ ASSIGNMENTS ============ */
function renderTeacherAssignments(){
  const items = db_get(DB_KEYS.assignments).filter(a=>a.teacher===SESSION.name);
  const subs = db_get(DB_KEYS.submissions);
  document.getElementById('teacherAssignmentsBody').innerHTML = items.map(a=>{
    const count = subs.filter(s=>s.assignmentId===a.id).length;
    return `<tr><td><b>${a.title}</b></td><td>${a.course}</td><td>${fmtDate(a.due)}</td><td>${count}</td><td>${badge(a.status)}</td>
      <td><div class="row-actions"><button class="danger" onclick="deleteTeacherAssignment('${a.id}')"><i class="bi bi-trash"></i></button></div></td></tr>`;
  }).join('') || `<tr><td colspan="6" style="text-align:center; color:var(--slate); padding:20px;">No assignments yet.</td></tr>`;
}
function openTeacherAssignmentModal(){
  document.getElementById('tAsgCourse').innerHTML = courseOptionsForMe();
  document.getElementById('teacherAssignmentForm').reset();
  document.getElementById('tAsgMarks').value = 100;
  openModal('teacherAssignmentModal');
}
function wireTeacherAssignmentForm(){
  document.getElementById('teacherAssignmentForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    if(!validateForm(e.target)) return;
    const items = db_get(DB_KEYS.assignments);
    const courseName = document.getElementById('tAsgCourse').value;
    items.push({id:uid('A'), title:document.getElementById('tAsgTitle').value, course:courseName, teacher:SESSION.name,
      due:document.getElementById('tAsgDue').value, maxMarks:Number(document.getElementById('tAsgMarks').value),
      status:'open', instructions:document.getElementById('tAsgInstructions').value});
    db_set(DB_KEYS.assignments, items);

    const notifs = db_get(DB_KEYS.notifications);
    notifs.push({id:uid('NTF'), title:'New assignment: '+document.getElementById('tAsgTitle').value, body:'Posted for '+courseName, audience:'students', date:todayISO(), read:false});
    db_set(DB_KEYS.notifications, notifs);

    toast('Assignment published.', 'success');
    closeModal('teacherAssignmentModal');
    renderTeacherAssignments(); renderTeacherDashboard();
  });
}
function deleteTeacherAssignment(id){
  if(!confirm('Delete this assignment?')) return;
  db_set(DB_KEYS.assignments, db_get(DB_KEYS.assignments).filter(a=>a.id!==id));
  toast('Assignment deleted.', 'success');
  renderTeacherAssignments(); renderTeacherDashboard();
}

/* ============ SUBMISSIONS / GRADING ============ */
function renderSubmissions(){
  const myAssignments = db_get(DB_KEYS.assignments).filter(a=>a.teacher===SESSION.name);
  const subs = db_get(DB_KEYS.submissions).filter(s=>myAssignments.some(a=>a.id===s.assignmentId));
  document.getElementById('submissionsBody').innerHTML = subs.map(s=>{
    const a = myAssignments.find(a=>a.id===s.assignmentId);
    return `<tr><td>${s.studentName}</td><td>${a?a.title:'—'}</td><td><i class="bi bi-paperclip"></i> ${s.fileName}</td>
      <td>${fmtDate(s.submittedAt)}</td><td>${s.marks!=null ? s.marks+' / '+(a?a.maxMarks:100) : '—'}</td>
      <td><button class="btn btn-outline btn-sm" onclick="openGradeModal('${s.id}')">${s.status==='graded'?'Update':'Grade'}</button></td></tr>`;
  }).join('') || `<tr><td colspan="6" style="text-align:center; color:var(--slate); padding:20px;">No submissions yet.</td></tr>`;
}
function openGradeModal(subId){
  const s = db_get(DB_KEYS.submissions).find(x=>x.id===subId);
  const a = db_get(DB_KEYS.assignments).find(x=>x.id===s.assignmentId);
  document.getElementById('gradeSubId').value = subId;
  document.getElementById('gradeContext').textContent = `${s.studentName} — ${a?a.title:''} (out of ${a?a.maxMarks:100})`;
  document.getElementById('gradeMarks').value = s.marks ?? '';
  document.getElementById('gradeFeedback').value = s.feedback || '';
  openModal('gradeModal');
}
function wireGradeForm(){
  document.getElementById('gradeForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const id = document.getElementById('gradeSubId').value;
    let subs = db_get(DB_KEYS.submissions);
    subs = subs.map(s=> s.id===id ? {...s, marks:Number(document.getElementById('gradeMarks').value), feedback:document.getElementById('gradeFeedback').value, status:'graded'} : s);
    db_set(DB_KEYS.submissions, subs);
    toast('Grade saved.', 'success');
    closeModal('gradeModal');
    renderSubmissions(); renderProgress(); renderTeacherDashboard();
  });
}

/* ============ STUDENT PROGRESS ============ */
function renderProgress(){
  const myAssignments = db_get(DB_KEYS.assignments).filter(a=>a.teacher===SESSION.name);
  const subs = db_get(DB_KEYS.submissions).filter(s=>myAssignments.some(a=>a.id===s.assignmentId));
  document.getElementById('progressBody').innerHTML = subs.map(s=>{
    const a = myAssignments.find(a=>a.id===s.assignmentId);
    return `<tr><td>${s.studentName}</td><td>${a?a.title:'—'}</td><td>${s.marks!=null?s.marks+' / '+(a?a.maxMarks:100):'Not graded'}</td><td>${badge(s.status)}</td></tr>`;
  }).join('') || `<tr><td colspan="4" style="text-align:center; color:var(--slate); padding:20px;">No submissions to show yet.</td></tr>`;
}

/* ============ ATTENDANCE ============ */
function setupAttendance(){
  document.getElementById('attCourseSelect').innerHTML = courseOptionsForMe();
  document.getElementById('attDate').value = todayISO();
  document.getElementById('attCourseSelect').addEventListener('change', renderAttendanceList);
  document.getElementById('attDate').addEventListener('change', renderAttendanceList);
  renderAttendanceList();
}
function renderAttendanceList(){
  const course = document.getElementById('attCourseSelect').value;
  const date = document.getElementById('attDate').value;
  const students = db_get(DB_KEYS.students).filter(s=>s.course === (db_get(DB_KEYS.courses).find(c=>c.name===course)?.name) || true);
  const relevant = db_get(DB_KEYS.students); // simplified: all students visible to mark
  const existing = db_get(DB_KEYS.attendance).filter(a=>a.course===course && a.date===date);

  document.getElementById('attendanceBody').innerHTML = relevant.map(s=>{
    const rec = existing.find(a=>a.studentId===s.id);
    const status = rec ? rec.status : 'present';
    return `<tr data-student="${s.id}">
      <td>${s.name}</td>
      <td>
        <select class="filter-select att-select">
          <option value="present" ${status==='present'?'selected':''}>Present</option>
          <option value="absent" ${status==='absent'?'selected':''}>Absent</option>
          <option value="late" ${status==='late'?'selected':''}>Late</option>
        </select>
      </td>
    </tr>`;
  }).join('');
}
function saveAttendance(){
  const course = document.getElementById('attCourseSelect').value;
  const date = document.getElementById('attDate').value;
  let all = db_get(DB_KEYS.attendance).filter(a => !(a.course===course && a.date===date));
  document.querySelectorAll('#attendanceBody tr').forEach(row=>{
    all.push({id:uid('ATT'), studentId:row.dataset.student, course, date, status:row.querySelector('.att-select').value});
  });
  db_set(DB_KEYS.attendance, all);
  toast('Attendance saved for ' + fmtDate(date) + '.', 'success');
}

/* ============ NOTIFICATIONS ============ */
function renderTeacherNotifications(){
  const list = db_get(DB_KEYS.notifications).filter(n=>n.audience==='all'||n.audience==='teachers').slice().reverse();
  document.getElementById('teacherNotifBody').innerHTML = list.map(n=>`<tr><td><b>${n.title}</b></td><td>${n.body}</td><td>${fmtDate(n.date)}</td></tr>`).join('')
    || `<tr><td colspan="3" style="text-align:center; color:var(--slate); padding:20px;">No notifications yet.</td></tr>`;
}

/* ============ PROFILE ============ */
function renderTeacherProfile(){
  document.getElementById('profName').value = SESSION.name;
  document.getElementById('profEmail').value = SESSION.email;
}
function wireTeacherProfileForm(){
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
