document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-registro');
  const togglePassword = document.getElementById('togglePassword');
  const toggleConfirm = document.getElementById('toggleConfirm');
  const imgPreview = document.getElementById('img-preview');
  const fotoInput = document.getElementById('foto');

  // Toggle password visibility
  togglePassword.addEventListener('click', () => {
    const passwordInput = document.getElementById('password');
    passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
    togglePassword.textContent = passwordInput.type === 'password' ? '👁️' : '🙈';
  });

  toggleConfirm.addEventListener('click', () => {
    const confirmInput = document.getElementById('confirmPassword');
    confirmInput.type = confirmInput.type === 'password' ? 'text' : 'password';
    toggleConfirm.textContent = confirmInput.type === 'password' ? '👁️' : '🙈';
  });

  // Preview selected image
  fotoInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        imgPreview.src = e.target.result;
        imgPreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });

  // Form submission
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Clear previous error messages
    document.querySelectorAll('.error-text').forEach((el) => (el.textContent = ''));

    const nombre = document.getElementById('nombre').value.trim();
    const correo = document.getElementById('correo').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const foto = document.getElementById('foto').files[0];

    // Client-side validation
    let hasError = false;

    if (!nombre) {
      setError('nombre', 'El nombre es obligatorio');
      hasError = true;
    }

    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      setError('correo', 'Ingresa un correo válido');
      hasError = true;
    }

    if (!password || password.length < 8) {
      setError('password', 'La contraseña debe tener al menos 8 caracteres');
      hasError = true;
    }

    if (password !== confirmPassword) {
      setError('confirmPassword', 'Las contraseñas no coinciden');
      hasError = true;
    }

    if (!foto) {
      setError('foto', 'Selecciona una foto de perfil');
      hasError = true;
    }

    if (hasError) {
      console.error('Client-side validation failed', { nombre, correo, password: !!password, foto: !!foto });
      return;
    }

    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('nombre', nombre);
      formData.append('correo', correo);
      formData.append('password', password); // Send password, not password_hash
      formData.append('foto', foto);
      console.log('FormData prepared:', { nombre, correo, password: '[hidden]', foto: foto.name });

      // Send to backend
      console.log('Sending registration request to backend...');
      const response = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        body: formData,
      });

      console.log('Registration response status:', response.status);
      const result = await response.json();
      console.log('Registration response body:', result);

      if (response.ok) {
        alert('Registro exitoso. Por favor, inicia sesión.');
        window.location.href = 'Login.html';
      } else {
        console.error('Registration failed:', result);
        setError('form-registro', result.error || 'Error en el registro');
      }
    } catch (err) {
      console.error('Frontend registration error:', {
        error: err.message,
        stack: err.stack,
      });
      setError('form-registro', `Error en el registro: ${err.message}`);
    }
  });

  // Helper function to set error messages
  function setError(fieldId, message) {
    const field = fieldId === 'form-registro' ? document.getElementById(fieldId) : document.getElementById(fieldId).parentElement;
    const errorText = field.querySelector('.error-text') || field.nextElementSibling;
    errorText.textContent = message;
  }
});