/* =========================================================
   EduManage — Login & Forgot Password logic
   ========================================================= */

document.addEventListener('DOMContentLoaded', ()=>{

  // If already logged in, skip straight to the right dashboard
  const existing = getSession();
  if(existing && document.body.dataset.page === 'login'){
    redirectForRole(existing.role);
  }

  const togglePass = document.getElementById('togglePass');
  if(togglePass){
    togglePass.addEventListener('click', ()=>{
      const input = document.getElementById('loginPassword');
      const isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      togglePass.textContent = isPass ? 'Hide' : 'Show';
    });
  }

  const loginForm = document.getElementById('loginForm');
  if(loginForm){
    loginForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const errorBox = document.getElementById('loginError');
      errorBox.style.display = 'none';

      if(!validateForm(loginForm)) return;

      const email = document.getElementById('loginEmail').value.trim().toLowerCase();
      const password = document.getElementById('loginPassword').value;
      const users = db_get(DB_KEYS.users);
      const user = users.find(u => u.email.toLowerCase() === email && u.password === password);

      const btn = document.getElementById('loginSubmitBtn');
      btn.disabled = true; btn.textContent = 'Signing in…';

      setTimeout(()=>{
        if(!user){
          errorBox.textContent = 'Those details don\u2019t match an account. Check your email and password and try again.';
          errorBox.style.display = 'flex';
          btn.disabled = false; btn.innerHTML = 'Sign in <i class="bi bi-arrow-right"></i>';
          return;
        }
        setSession({userId:user.id, name:user.name, role:user.role, email:user.email});
        const remember = document.getElementById('rememberMe');
        if(remember && remember.checked){
          localStorage.setItem('edu_last_email', email);
        }
        toast('Welcome back, ' + user.name.split(' ')[0] + '.', 'success');
        redirectForRole(user.role);
      }, 450);
    });
  }

  const lastEmail = localStorage.getItem('edu_last_email');
  if(lastEmail && document.getElementById('loginEmail')){
    document.getElementById('loginEmail').value = lastEmail;
    if(document.getElementById('rememberMe')) document.getElementById('rememberMe').checked = true;
  }

  /* ---- Forgot password flow (client-side simulation) ---- */
  const forgotForm = document.getElementById('forgotForm');
  if(forgotForm){
    let stage = 1;
    forgotForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      if(!validateForm(forgotForm)) return;

      const errorBox = document.getElementById('forgotError');
      errorBox.style.display = 'none';

      if(stage === 1){
        const email = document.getElementById('forgotEmail').value.trim().toLowerCase();
        const user = db_get(DB_KEYS.users).find(u => u.email.toLowerCase() === email);
        if(!user){
          errorBox.textContent = 'We couldn\u2019t find an account with that email.';
          errorBox.style.display = 'flex';
          return;
        }
        window._resetUserEmail = email;
        document.getElementById('stage1').style.display = 'none';
        document.getElementById('stage2').style.display = 'block';
        document.getElementById('forgotSubtitle').textContent = 'Enter the 6-digit code we sent to ' + email + ' and choose a new password.';
        toast('Verification code sent (demo code: 000000)', 'info');
        stage = 2;
        return;
      }

      if(stage === 2){
        const code = document.getElementById('resetCode').value.trim();
        const newPass = document.getElementById('newPassword').value;
        const confirmPass = document.getElementById('confirmPassword').value;

        if(code !== '000000'){
          errorBox.textContent = 'That code isn\u2019t right. For this demo, use 000000.';
          errorBox.style.display = 'flex';
          return;
        }
        if(newPass.length < 6){
          errorBox.textContent = 'Your new password should be at least 6 characters.';
          errorBox.style.display = 'flex';
          return;
        }
        if(newPass !== confirmPass){
          errorBox.textContent = 'Passwords don\u2019t match. Please re-enter.';
          errorBox.style.display = 'flex';
          return;
        }
        const users = db_get(DB_KEYS.users);
        const idx = users.findIndex(u => u.email.toLowerCase() === window._resetUserEmail);
        if(idx > -1){ users[idx].password = newPass; db_set(DB_KEYS.users, users); }

        document.getElementById('stage2').style.display = 'none';
        document.getElementById('stage3').style.display = 'block';
      }
    });
  }

  /* ---- Registration (new teacher / student accounts) ---- */
  const registerForm = document.getElementById('registerForm');
  if(registerForm){
    // populate course dropdown for students
    const courseSelect = document.getElementById('regCourse');
    if(courseSelect){
      const courses = db_get(DB_KEYS.courses);
      courseSelect.innerHTML = courses.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    }

    // role toggle
    document.querySelectorAll('.role-option').forEach(opt=>{
      opt.addEventListener('click', ()=>{
        document.querySelectorAll('.role-option').forEach(o=>o.classList.remove('selected'));
        opt.classList.add('selected');
        document.getElementById('regRole').value = opt.dataset.role;
        document.getElementById('studentFields').classList.toggle('active', opt.dataset.role === 'student');
        document.getElementById('teacherFields').classList.toggle('active', opt.dataset.role === 'teacher');
      });
    });

    registerForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const errorBox = document.getElementById('regError');
      errorBox.style.display = 'none';

      const role = document.getElementById('regRole').value;

      // only validate the required fields belonging to the active role
      document.querySelectorAll('#registerForm .field').forEach(f=>f.classList.remove('error'));
      let valid = true;
      const commonRequired = ['regName','regEmail','regPhone','regPassword','regConfirm'];
      const roleRequired = role === 'student' ? ['regCourse','regBatch','regGuardian'] : ['regSubject','regQualification'];
      [...commonRequired, ...roleRequired].forEach(id=>{
        const input = document.getElementById(id);
        const field = input.closest('.field');
        const bad = !input.value.trim() || (input.type==='email' && !/^\S+@\S+\.\S+$/.test(input.value));
        if(bad){ field.classList.add('error'); valid = false; }
      });
      if(!valid) return;

      const email = document.getElementById('regEmail').value.trim().toLowerCase();
      const password = document.getElementById('regPassword').value;
      const confirm = document.getElementById('regConfirm').value;

      const users = db_get(DB_KEYS.users);
      if(users.some(u => u.email.toLowerCase() === email)){
        errorBox.textContent = 'An account with that email already exists. Try signing in instead.';
        errorBox.style.display = 'flex';
        return;
      }
      if(password.length < 6){
        errorBox.textContent = 'Your password should be at least 6 characters.';
        errorBox.style.display = 'flex';
        return;
      }
      if(password !== confirm){
        errorBox.textContent = 'Passwords don\u2019t match. Please re-enter.';
        errorBox.style.display = 'flex';
        return;
      }

      const name = document.getElementById('regName').value.trim();
      const phone = document.getElementById('regPhone').value.trim();
      const newUserId = uid('U');

      users.push({ id:newUserId, name, email, password, role });
      db_set(DB_KEYS.users, users);

      if(role === 'student'){
        const students = db_get(DB_KEYS.students);
        students.push({
          id: uid('S'), name, email, phone,
          course: document.getElementById('regCourse').value,
          batch: document.getElementById('regBatch').value.trim(),
          guardian: document.getElementById('regGuardian').value.trim(),
          status: 'active'
        });
        db_set(DB_KEYS.students, students);
      } else {
        const teachers = db_get(DB_KEYS.teachers);
        teachers.push({
          id: uid('T'), name, email, phone,
          subject: document.getElementById('regSubject').value.trim(),
          qualification: document.getElementById('regQualification').value.trim(),
          joined: todayISO(), status: 'active'
        });
        db_set(DB_KEYS.teachers, teachers);
      }

      const btn = document.getElementById('regSubmitBtn');
      btn.disabled = true; btn.textContent = 'Creating account…';

      setTimeout(()=>{
        setSession({ userId:newUserId, name, role, email });
        toast('Welcome to EduManage, ' + name.split(' ')[0] + '.', 'success');
        redirectForRole(role);
      }, 400);
    });
  }
});

function redirectForRole(role){
  if(role === 'administrator') window.location.href = 'admin-dashboard.html';
  else if(role === 'teacher') window.location.href = 'teacher-dashboard.html';
  else window.location.href = 'student-dashboard.html';
}
