// Proteger el panel - redirige si no hay sesión
const session = localStorage.getItem("session");
if (!session) {
  window.location.href = "login.html";
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configuración de Supabase
const supabaseUrl = "https://dedztwbflzgislpsyraw.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZHp0d2JmbHpnaXNscHN5cmF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4ODEwNTksImV4cCI6MjA2OTQ1NzA1OX0.mr8N_SLAWRjC8cSG28CVnBDl4ot6QK7SGXa0ZU339E4";
const supabase = createClient(supabaseUrl, supabaseKey);
// Eventos para filtrar en tiempo real
document.addEventListener("DOMContentLoaded", () => {
  // cargar productos y categorías al inicio
  cargarProductos();
  cargarCategoriasParaFiltro();

  // escuchamos eventos de búsqueda y select
  document
    .getElementById("buscarProducto")
    .addEventListener("input", mostrarProductosEnTabla);
  document
    .getElementById("filtrarCategoria")
    .addEventListener("change", mostrarProductosEnTabla);
  document
    .getElementById("filtrarStock")
    .addEventListener("change", mostrarProductosEnTabla);
});
document.addEventListener("DOMContentLoaded", () => {
  const btnPedidos = document.getElementById("verPedidosBtn");
  btnPedidos.addEventListener("click", () => {
    window.location.href = "/pedidos.html"; // O "/pedidos.html" si está en raíz
  });
});
// Estado
let categorias = [];
let productos = [];
let editandoProducto = false;

// Inicialización
document.addEventListener("DOMContentLoaded", async () => {
  await cargarCategorias();
  await cargarProductos();

  document
    .getElementById("categoriaForm")
    .addEventListener("submit", manejarCategoria);
  document
    .getElementById("productoForm")
    .addEventListener("submit", manejarProducto);

  // Delegación de eventos para botones de editar/eliminar (categorías y productos)
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("editar-categoria")) {
      const id = e.target.dataset.id;
      editarCategoria(parseInt(id));
    }
    if (e.target.classList.contains("eliminar-categoria")) {
      const id = e.target.dataset.id;
      eliminarCategoria(parseInt(id));
    }
    if (e.target.classList.contains("editar-producto")) {
      const id = e.target.dataset.id;
      editarProducto(parseInt(id));
    }
    if (e.target.classList.contains("eliminar-producto")) {
      const id = e.target.dataset.id;
      eliminarProducto(parseInt(id));
    }
  });
});

// ==================== CATEGORÍAS ====================
async function cargarCategorias() {
  const { data, error } = await supabase
    .from("categorias")
    .select("*")
    .order("nombre");
  if (error) {
    mostrarMensaje(
      "catMensaje",
      "Error al cargar categorías: " + error.message,
      "error"
    );
    return;
  }
  categorias = data;
  mostrarCategoriasEnTabla();
  actualizarSelectorCategorias();
}

function mostrarCategoriasEnTabla() {
  const tbody = document.querySelector("#tablaCategorias tbody");
  tbody.innerHTML = "";

  categorias.forEach((categoria) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${categoria.id}</td>
      <td>${categoria.nombre}</td>
      <td>${categoria.descripcion || "-"}</td>
      <td class="acciones">
        <button class="editar editar-categoria" data-id="${
          categoria.id
        }">Editar</button>
        <button class="eliminar eliminar-categoria" data-id="${
          categoria.id
        }">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function actualizarSelectorCategorias() {
  const select = document.getElementById("prod_categoria");
  select.innerHTML =
    '<option value="" disabled selected>Selecciona una categoría</option>';

  categorias.forEach((categoria) => {
    const option = document.createElement("option");
    option.value = categoria.id;
    option.textContent = categoria.nombre;
    select.appendChild(option);
  });
}

async function manejarCategoria(e) {
  e.preventDefault();
  const nombre = document.getElementById("cat_nombre").value.toUpperCase();
  const descripcion = document
    .getElementById("cat_descripcion")
    .value.toUpperCase();

  const { error } = await supabase
    .from("categorias")
    .insert([{ nombre, descripcion }]);
  if (error) {
    mostrarMensaje(
      "catMensaje",
      "Error al crear categoría: " + error.message,
      "error"
    );
    return;
  }

  mostrarMensaje("catMensaje", "Categoría creada con éxito", "exito");
  document.getElementById("categoriaForm").reset();
  await cargarCategorias();
}

async function editarCategoria(id) {
  const categoria = categorias.find((c) => c.id === id);
  if (!categoria) return;

  // Prompt para nombre
  let nuevoNombre = prompt("Editar nombre:", categoria.nombre);
  if (nuevoNombre === null) return; // Si cancela, salimos
  nuevoNombre = nuevoNombre.toUpperCase(); // Convertimos a MAYÚSCULAS

  // Prompt para descripción
  let nuevaDescripcion = prompt(
    "Editar descripción:",
    categoria.descripcion || ""
  );
  if (nuevaDescripcion === null) return;
  nuevaDescripcion = nuevaDescripcion.toUpperCase(); // También en MAYÚSCULAS

  // Guardar en Supabase
  const { error } = await supabase
    .from("categorias")
    .update({ nombre: nuevoNombre, descripcion: nuevaDescripcion })
    .eq("id", id);

  if (error) {
    mostrarMensaje(
      "catMensaje",
      "Error al actualizar categoría: " + error.message,
      "error"
    );
  } else {
    mostrarMensaje("catMensaje", "Categoría actualizada con éxito", "exito");
    await cargarCategorias();
  }
}

async function eliminarCategoria(id) {
  if (!confirm("¿Estás seguro de que quieres eliminar esta categoría?")) return;

  const { count } = await supabase
    .from("productos")
    .select("*", { count: "exact", head: true })
    .eq("categoria_id", id);
  if (count > 0) {
    mostrarMensaje(
      "catMensaje",
      "No se puede eliminar: hay productos asociados",
      "error"
    );
    return;
  }

  const { error } = await supabase.from("categorias").delete().eq("id", id);
  if (error) {
    mostrarMensaje(
      "catMensaje",
      "Error al eliminar categoría: " + error.message,
      "error"
    );
  } else {
    mostrarMensaje("catMensaje", "Categoría eliminada con éxito", "exito");
    await cargarCategorias();
  }
}

// ==================== PRODUCTOS ====================
async function cargarProductos() {
  const { data, error } = await supabase
    .from("productos")
    .select(
      `id, nombre, descripcion, precio, imagen_url, stock, categoria_id, categorias (nombre)`
    )
    .order("nombre");
  if (error) {
    mostrarMensaje(
      "prodMensaje",
      "Error al cargar productos: " + error.message,
      "error"
    );
    return;
  }
  productos = data;
  mostrarProductosEnTabla();
}

function mostrarProductosEnTabla() {
  const tbody = document.querySelector("#tablaProductos tbody");
  tbody.innerHTML = "";

  const buscarTexto =
    document.getElementById("buscarProducto")?.value.toLowerCase() || "";
  const categoriaSeleccionada =
    document.getElementById("filtrarCategoria")?.value;
  const filtroStock = document.getElementById("filtrarStock")?.value;

  // 1) Filtramos primero
  const filtrados = productos.filter((p) => {
    const nombre = (p.nombre || "").toLowerCase();
    const coincideTexto = buscarTexto ? nombre.includes(buscarTexto) : true;
    const coincideCategoria =
      !categoriaSeleccionada || p.categoria_id == categoriaSeleccionada;
    const coincideStock =
      filtroStock === "agotado"
        ? p.stock <= 0
        : filtroStock === "disponible"
        ? p.stock > 0
        : true;

    return coincideTexto && coincideCategoria && coincideStock;
  });

  const totalEncontrados = filtrados.length;

  // 2) Tomamos solo los primeros 10 del array filtrado
  const LIMITE = 10;
  const mostrar = filtrados.slice(0, LIMITE);

  // 3) (Opcional) Mostrar info de resultados si existe el elemento
  const infoEl = document.getElementById("productosInfo");
  if (infoEl) {
    infoEl.textContent = `Mostrando ${
      mostrar.length
    } de ${totalEncontrados} resultados${
      totalEncontrados > LIMITE ? " (solo primeros " + LIMITE + ")" : ""
    }`;
  }

  // 4) Renderizar solo los items a mostrar
  mostrar.forEach((producto) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${producto.id}</td>
      <td>${producto.nombre}</td>
      <td>$${(producto.precio || 0).toLocaleString("es-ES")}</td>
      <td>${producto.categorias?.nombre || "Sin categoría"}</td>
      <td>${producto.stock}</td>
      <td class="acciones">
        <button class="editar editar-producto" data-id="${
          producto.id
        }">Editar</button>
        <button class="eliminar eliminar-producto" data-id="${
          producto.id
        }">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function cargarCategoriasParaFiltro() {
  const { data, error } = await supabase
    .from("categorias")
    .select("id, nombre")
    .order("nombre");
  if (error) {
    console.error("Error al cargar categorías para filtro:", error.message);
    return;
  }

  const select = document.getElementById("filtrarCategoria");
  select.innerHTML = `<option value="">Todas las categorías</option>`;
  data.forEach((cat) => {
    select.innerHTML += `<option value="${cat.id}">${cat.nombre}</option>`;
  });
}

async function manejarProducto(e) {
  e.preventDefault();

  // 🔥 Aquí recogemos las imágenes dinámicamente
  const imagenInputs = document.querySelectorAll(".imagen-input");
  const imagenes = Array.from(imagenInputs)
    .map((input) => input.value.trim())
    .filter((url) => url !== "");

  const imagenesString = imagenes.join(","); // <-- Ahora sí tenemos imagenesString dentro de la función

  const producto = {
    nombre: document.getElementById("prod_nombre").value.toUpperCase(),
    descripcion: document
      .getElementById("prod_descripcion")
      .value.toUpperCase(),
    precio: parseFloat(document.getElementById("prod_precio").value),
    imagen_url: imagenesString, // ✅ Aquí sí lo usamos correctamente
    categoria_id: parseInt(document.getElementById("prod_categoria").value),
    stock: parseInt(document.getElementById("prod_stock").value) || 0,
  };

  const productoId = document.getElementById("prod_id").value;

  if (editandoProducto && productoId) {
    const { error } = await supabase
      .from("productos")
      .update(producto)
      .eq("id", productoId);
    if (error) {
      mostrarMensaje(
        "prodMensaje",
        "Error al actualizar producto: " + error.message,
        "error"
      );
    } else {
      mostrarMensaje("prodMensaje", "Producto actualizado con éxito", "exito");
    }
  } else {
    const { error } = await supabase.from("productos").insert([producto]);
    if (error) {
      mostrarMensaje(
        "prodMensaje",
        "Error al crear producto: " + error.message,
        "error"
      );
    } else {
      mostrarMensaje("prodMensaje", "Producto creado con éxito", "exito");
    }
  }

  limpiarFormularioProducto();
  await cargarProductos();
}

async function editarProducto(id) {
  const producto = productos.find((p) => p.id === id);
  if (!producto) return;

  editandoProducto = true;

  document.getElementById("prod_id").value = producto.id;
  document.getElementById("prod_nombre").value = producto.nombre;
  document.getElementById("prod_descripcion").value =
    producto.descripcion || "";
  document.getElementById("prod_precio").value = producto.precio;
  //  document.getElementById("prod_imagen").value = producto.imagen_url || "";
  // document.getElementById("prod_categoria").value = producto.categoria_id;
  document.getElementById("prod_stock").value = producto.stock;

  // Limpiar campos de imágenes y volver a crear
  const imagenesContainer = document.getElementById("imagenesContainer");
  imagenesContainer.innerHTML = "";

  const imagenesArray = producto.imagen_url
    ? producto.imagen_url.split(",")
    : [""];

  imagenesArray.forEach((url) => {
    const div = document.createElement("div");
    div.className = "imagen-group";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "imagen-input";
    input.value = url.trim();
    input.placeholder = "https://ejemplo.com/imagenX.jpg";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "removeImagenBtn";
    removeBtn.textContent = "🗑️";

    removeBtn.addEventListener("click", () => {
      div.remove();
      verificarBotonesEliminar();
    });

    div.appendChild(input);
    div.appendChild(removeBtn);
    imagenesContainer.appendChild(div);
  });

  verificarBotonesEliminar();

  document.getElementById("prodMensaje").style.display = "none";
  document.querySelector('#productoForm button[type="submit"]').textContent =
    "Actualizar Producto";

  window.scrollTo({
    top: document.getElementById("productoForm").offsetTop - 20,
    behavior: "smooth",
  });
}

async function eliminarProducto(id) {
  if (!confirm("¿Estás seguro de que quieres eliminar este producto?")) return;

  const { error } = await supabase.from("productos").delete().eq("id", id);
  if (error) {
    mostrarMensaje(
      "prodMensaje",
      "Error al eliminar producto: " + error.message,
      "error"
    );
  } else {
    mostrarMensaje("prodMensaje", "Producto eliminado con éxito", "exito");
    await cargarProductos();
  }
}

function limpiarFormularioProducto() {
  document.getElementById("productoForm").reset();
  document.getElementById("prod_id").value = "";
  document.querySelector('#productoForm button[type="submit"]').textContent =
    "Guardar Producto";
  editandoProducto = false;
}

// ==================== UTILIDADES ====================
function mostrarMensaje(id, texto, tipo) {
  const elemento = document.getElementById(id);
  elemento.textContent = texto;
  elemento.className = `mensaje ${tipo}`;
  elemento.style.display = "block";
  setTimeout(() => (elemento.style.display = "none"), 5000);
}

document.getElementById("agregarImagenBtn").addEventListener("click", () => {
  const container = document.getElementById("imagenesContainer");

  const div = document.createElement("div");
  div.className = "imagen-group";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "https://ejemplo.com/imagenX.jpg";
  input.className = "imagen-input";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "removeImagenBtn";
  removeBtn.textContent = "🗑️";

  // Al hacer clic en eliminar:
  removeBtn.addEventListener("click", () => {
    div.remove();
  });

  div.appendChild(input);
  div.appendChild(removeBtn);
  container.appendChild(div);
});

// Al cargar la página, ocultar el botón de eliminar si solo hay 1 imagen
function verificarBotonesEliminar() {
  const grupos = document.querySelectorAll(".imagen-group");
  grupos.forEach((grupo, index) => {
    const btn = grupo.querySelector(".removeImagenBtn");
    btn.style.display = grupos.length > 1 ? "inline-block" : "none";
  });
}

// Ejecutar cada vez que se agrega/elimina una imagen:
const imagenInputs = document.querySelectorAll(".imagen-input");
const imagenes = Array.from(imagenInputs)
  .map((input) => input.value.trim())
  .filter((url) => url !== "");

const imagenesString = imagenes.join(",");

const producto = {
  // ...otros campos
  imagenes: imagenesString,
  // ...
};
// Logout
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  document.getElementById("loginForm").style.display = "block";
  document.getElementById("adminPanel").style.display = "none";
});
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  localStorage.removeItem("session");
  window.location.href = "login.html";
});
