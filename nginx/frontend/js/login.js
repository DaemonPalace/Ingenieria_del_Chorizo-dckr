document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-login');

  // Check if form exists
  if (!form) {
    console.error('Form with id "form-login" not found');
    return;
  }

  // Form submission
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Clear previous error messages
    document.querySelectorAll('.error-text').forEach((el) => (el.textContent = ''));

    const correo = document.getElementById('correo').value.trim();
    const password = document.getElementById('password').value;

    // Client-side validation
    let hasError = false;

    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      setError('correo', 'Ingresa un correo válido');
      hasError = true;
    }

    if (!password) {
      setError('password', 'La contraseña es obligatoria');
      hasError = true;
    }

    if (hasError) {
      console.error('Client-side validation failed', { correo, password: !!password });
      return;
    }

    try {
      // Prepare data
      const data = { correo, password };
      console.log('Sending login request to backend:', { correo, password: '[hidden]' });

      // Send to backend
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log('Login response status:', response.status);
      const result = await response.json();
      console.log('Login response body:', result);

      if (response.ok) {
        alert('Inicio de sesión exitoso');
        // Redirect based on user role
        if (result.user.rol === 'admin') {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'dashboard.html';
        }
      } else if (response.status === 403) {
        // Specific handling for unapproved account
        console.error('Login failed: Account not approved', result);
        setError('form-login', 'Tu cuenta aún no ha sido aprobada. Contacta al administrador.');
      } else {
        console.error('Login failed:', result);
        setError('form-login', result.error || 'Error en el inicio de sesión');
      }
    } catch (err) {
      console.error('Frontend login error:', {
        error: err.message,
        stack: err.stack,
      });
      setError('form-login', `Error en el inicio de sesión: ${err.message}`);
    }
  });

  // Helper function to set error messages
  function setError(fieldId, message) {
    const field = fieldId === 'form-login' ? document.querySelector('.form-error') : document.getElementById(fieldId).parentElement;
    const errorText = field.querySelector('.error-text') || field;
    errorText.textContent = message;
  }
});