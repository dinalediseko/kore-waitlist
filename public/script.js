(() => {
  const form = document.getElementById('waitlist-form');
  const input = document.getElementById('email');
  const button = document.getElementById('cta');
  const label = button.querySelector('.cta-label');
  const status = document.getElementById('status');

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
    // Force reflow so the animation can replay
    void form.offsetWidth;
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
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      setLoading(false);
      button.classList.add('success');
      label.textContent = "You're on the list";
      setStatus(data.message, 'ok');
      form.reset();
    } catch (err) {
      setLoading(false);
      setStatus(err.message, 'error');
      shake();
    }
  });

  // Clear any error as soon as the user edits the email
  input.addEventListener('input', () => {
    if (status.classList.contains('error')) setStatus('');
  });
})();
