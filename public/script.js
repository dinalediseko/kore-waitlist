(() => {
  const form = document.getElementById('waitlist-form');
  const input = document.getElementById('email');
  const button = document.getElementById('cta');
  const label = button.querySelector('.cta-label');
  const status = document.getElementById('status');

  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbwnw4ETu4I6mdFd43rw1Xpt4k315UwOErdu0ItS9t4_OrV8dxi743IK0Wf8DAxvuCxN/exec';

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setStatus(message, type) {
    status.textContent = message;
    status.classList.remove('error', 'ok');
    if (type) status.classList.add(type);
  }

  function setLoading(isLoading) {
    button.disabled = isLoading;
    button.classList.toggle('loading', isLoading);
    label.textContent = isLoading ? 'Joining' : 'Join the waitlist';
  }

  function shake() {
    form.classList.remove('shake');
    void form.offsetWidth; // force reflow so the animation can replay
    form.classList.add('shake');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = input.value.trim();

    if (!EMAIL_RE.test(email)) {
      setStatus('Please enter a valid email address.', 'error');
      shake();
      input.focus();
      return;
    }

    setLoading(true);
    setStatus('');

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        // No Content-Type header — Apps Script handles this as text/plain
        // and avoids a CORS preflight it can't answer.
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      setLoading(false);
      button.classList.add('success');
      label.textContent = "You're on the list";
      setStatus(data.message || "You're on the list. Nothing to do now but wait and trust the process.", 'ok');
      form.reset();
    } catch (err) {
      setLoading(false);
      setStatus(err.message || 'Something went wrong. Please try again.', 'error');
      shake();
    }
  });

  // Clear any error as soon as the user edits the email
  input.addEventListener('input', () => {
    if (status.classList.contains('error')) setStatus('');
  });
})();

  // ---------- Scroll reveal for SEO content sections ----------

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealTargets = document.querySelectorAll('[data-reveal]');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    // Show immediately — content stays fully visible to users who opt out of motion
    revealTargets.forEach((el) => el.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    revealTargets.forEach((el) => observer.observe(el));
  }