// Vista previa de la imagen seleccionada
const inputImagen = document.getElementById("imagenProducto");
const preview = document.getElementById("previewImagen");

inputImagen.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.classList.remove("d-none");
    };
    reader.readAsDataURL(file);
  } else {
    preview.src = "";
    preview.classList.add("d-none");
  }
});
