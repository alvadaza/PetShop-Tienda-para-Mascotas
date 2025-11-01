import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://dedztwbflzgislpsyraw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZHp0d2JmbHpnaXNscHN5cmF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4ODEwNTksImV4cCI6MjA2OTQ1NzA1OX0.mr8N_SLAWRjC8cSG28CVnBDl4ot6QK7SGXa0ZU339E4"
);

let categorias = [],
  productos = [],
  cart = [];

document.addEventListener("DOMContentLoaded", async () => {
  await cargarCategorias();
  await cargarProductos();

  document
    .getElementById("viewCartBtn")
    .addEventListener("click", mostrarCarrito);
  document.getElementById("closeCartBtn").addEventListener("click", () => {
    document.getElementById("cartModal").style.display = "none";
  });

  // === ABRIR MODAL DE DATOS DEL CLIENTE ===
  document
    .getElementById("sendWhatsApp")
    .addEventListener("click", function () {
      document.getElementById("cartModal").style.display = "none";
      document.getElementById("datosClienteModal").style.display = "flex";
    });

  document
    .getElementById("formDatosCliente")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const nombre = document.getElementById("clienteNombre").value;
      const direccion = document.getElementById("clienteDireccion").value;
      const telefono = document.getElementById("clienteTelefono").value;

      // 1. Generar el PDF
      await generarPDF(nombre, direccion, telefono);

      // Guardar pedido + actualizar stock
      await guardarPedido(nombre, direccion, telefono);

      // Enviar WhatsApp con productos correctos
      enviarWhatsApp(nombre, direccion, telefono);

      // Cierra modal y refresca
      document.getElementById("datosClienteModal").style.display = "none";
      setTimeout(() => location.reload(), 500);
    });

  async function guardarPedido(nombre, direccion, telefono) {
    try {
      const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);

      // Guardar pedido en Supabase
      const { error: errorPedido } = await supabase.from("pedidos").insert([
        {
          cliente: nombre,
          direccion: direccion,
          telefono: telefono,
          productos: carrito,
          total: total,
        },
      ]);

      if (errorPedido) {
        console.error("❌ Error guardando pedido:", errorPedido);
      } else {
        console.log("✅ Pedido guardado en Supabase");

        // 🔄 AHORA ACTUALIZAMOS STOCK DE CADA PRODUCTO
        for (const item of carrito) {
          const nuevoStock = Math.max(0, item.stock - item.cantidad);
          console.log(
            `🔄 Actualizando stock de ${item.nombre}: ${item.stock} → ${nuevoStock}`
          );

          const { error: errorStock } = await supabase
            .from("productos")
            .update({ stock: nuevoStock })
            .eq("id", item.id);

          if (errorStock) {
            console.error(
              `❌ Error actualizando stock para ${item.nombre}:`,
              errorStock
            );
          }
        }

        return; // 👈 ahora el return está al final, ya no interrumpe la actualización
      }
    } catch (err) {
      console.error("❌ Error general al guardar pedido:", err);
    }
  }

  function enviarWhatsApp(nombre, direccion, telefono) {
    const tel = "573133574711"; // tu número
    let msg = `¡Hola! Me gustaría hacer el siguiente pedido:%0A%0A`;

    carrito.forEach((i) => {
      msg += `${i.nombre} x${i.cantidad} – $${(
        i.precio * i.cantidad
      ).toLocaleString("es-ES")}%0A`;
    });

    msg += `%0ATotal: $${carrito
      .reduce((s, i) => s + i.precio * i.cantidad, 0)
      .toLocaleString("es-ES")}%0A%0A`;

    msg += `👤 *Cliente:* ${nombre}%0A🏠 *Dirección:* ${direccion}%0A📱 *Teléfono:* ${telefono}`;

    window.open(`https://wa.me/${tel}?text=${msg}`, "_blank");
  }

  document.getElementById("filters").addEventListener("click", (e) => {
    if (e.target.classList.contains("filter-btn")) {
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
      const catId = e.target.dataset.cat;
      mostrarProductos(catId);
    }
  });
});

// Después de cargar productos, escuchar el input de búsqueda
document.getElementById("buscador").addEventListener("input", (e) => {
  const texto = e.target.value.toLowerCase(); // Texto en minúsculas
  filtrarProductos(texto);
});

async function cargarCategorias() {
  const { data, error } = await supabase
    .from("categorias")
    .select("*")
    .order("nombre");
  if (error) return console.error(error.message);
  categorias = data;
  const filters = document.getElementById("filters");
  categorias.forEach((c) => {
    const btn = document.createElement("button");
    btn.textContent = c.nombre;
    btn.className = "filter-btn";
    btn.dataset.cat = c.id;
    filters.appendChild(btn);
  });
}

async function cargarProductos() {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .order("nombre");
  if (error) return console.error(error.message);
  productos = data;
  mostrarProductos("");
}
function mostrarProductos(catId) {
  const cont = document.getElementById("productos");
  cont.innerHTML = "";

  productos
    .filter((p) => !catId || p.categoria_id === parseInt(catId))
    .forEach((p) => {
      const imagenes = (p.imagen_url || "").split(",").map((url) => url.trim());
      const primeraImagen = imagenes[0] || "https://via.placeholder.com/200";
      const agotado = (p.stock ?? 0) <= 0;

      const div = document.createElement("div");
      div.className = `producto ${agotado ? "agotado" : ""}`;
      div.setAttribute("data-producto-id", p.id);

      div.innerHTML = `
        <div class="img-wrapper">
          <img src="${primeraImagen}" alt="${p.nombre}">
          ${agotado ? `<span class="overlay-agotado">AGOTADO</span>` : ""}
        </div>
        <h3>${p.nombre}</h3>
        <p>$${p.precio.toLocaleString("es-ES")}</p>
        <p class="stock">${agotado ? "Agotado" : `Disponibles: ${p.stock}`}</p>
        <button class="conozca-btn" ${agotado ? "disabled" : ""}>
          ${agotado ? "Sin Stock" : "Conozca el Producto"}
        </button>
      `;

      if (!agotado) {
        div
          .querySelector(".conozca-btn")
          .addEventListener("click", () => abrirGaleria(p.id));
        div
          .querySelector(".img-wrapper img")
          .addEventListener("click", () => abrirGaleria(p.id));
      }

      cont.appendChild(div);
    });
}

// ---------- filtrarProductos (igual, con data-id) ----------
function filtrarProductos(texto) {
  const cont = document.getElementById("productos");
  cont.innerHTML = "";

  const q = (texto || "").toLowerCase();
  productos
    .filter((p) => p.nombre.toLowerCase().includes(q))
    .forEach((p) => {
      const imagenes = (p.imagen_url || "").split(",").map((url) => url.trim());
      const primeraImagen = imagenes[0] || "https://via.placeholder.com/200";
      const agotado = (p.stock ?? 0) <= 0;

      const div = document.createElement("div");
      div.className = `producto ${agotado ? "agotado" : ""}`; // ✅ IMPORTANTE
      div.setAttribute("data-producto-id", p.id);
      div.innerHTML = `
        <div class="img-wrapper">
          <img src="${primeraImagen}" alt="${p.nombre}">
          ${agotado ? `<span class="overlay-agotado">AGOTADO</span>` : ""}
        </div>
        <h3>${p.nombre}</h3>
        <p>$${p.precio.toLocaleString("es-ES")}</p>
        <p class="stock">${agotado ? "Agotado" : `Disponibles: ${p.stock}`}</p>
        <button class="conozca-btn" ${agotado ? "disabled" : ""}>
          ${agotado ? "Sin Stock" : "Conozca el Producto"}
        </button>
      `;

      if (!agotado) {
        div
          .querySelector(".conozca-btn")
          .addEventListener("click", () => abrirGaleria(p.id));
        div
          .querySelector(".img-wrapper img")
          .addEventListener("click", () => abrirGaleria(p.id));
      }

      cont.appendChild(div);
    });

  if (cont.innerHTML === "")
    cont.innerHTML = "<p>No se encontraron productos.</p>";
}

let carrito = [];

// === FUNCIONES PARA ABRIR MODAL DE PRODUCTO ===
window.abrirGaleria = (id) => {
  const producto = productos.find((p) => p.id === id);
  if (!producto) return;

  const modal = document.getElementById("galeriaModal");
  const cantidadInput = document.getElementById("cantidadProducto");
  const btnSumar = document.getElementById("btnSumar");
  const btnRestar = document.getElementById("btnRestar");
  const btnAgregar = document.getElementById("agregarAlCarritoBtn");

  document.getElementById("galeriaTitulo").textContent = producto.nombre;
  document.getElementById(
    "galeriaPrecio"
  ).textContent = `$${producto.precio.toLocaleString("es-ES")}`;
  document.getElementById("galeriaDescripcion").textContent =
    producto.descripcion || "";
  document.getElementById(
    "galeriaStock"
  ).textContent = `Disponibles: ${producto.stock}`;

  const imagenes = producto.imagen_url.split(",").map((url) => url.trim());
  const imgPrincipal = document.getElementById("galeriaPrincipal");
  imgPrincipal.src = imagenes[0];

  const galeria = document.getElementById("galeriaImagenes");
  galeria.innerHTML = "";
  imagenes.forEach((url) => {
    const img = document.createElement("img");
    img.src = url;
    img.style.width = "50px";
    img.style.cursor = "pointer";
    img.addEventListener("click", () => (imgPrincipal.src = url));
    galeria.appendChild(img);
  });

  cantidadInput.value = 1;
  cantidadInput.max = producto.stock;

  btnSumar.onclick = () => {
    if (parseInt(cantidadInput.value) < producto.stock) {
      cantidadInput.value = parseInt(cantidadInput.value) + 1;
    }
  };

  btnRestar.onclick = () => {
    if (parseInt(cantidadInput.value) > 1) {
      cantidadInput.value = parseInt(cantidadInput.value) - 1;
    }
  };

  btnAgregar.onclick = () => {
    const cantidadSeleccionada = parseInt(cantidadInput.value);
    if (cantidadSeleccionada <= 0) {
      alert("Selecciona una cantidad válida.");
      return;
    }
    agregarAlCarrito(producto, cantidadSeleccionada);
    mostrarNotificacion(
      `${cantidadSeleccionada} ${producto.nombre} agregado(s) al carrito`
    );
    setTimeout(() => (modal.style.display = "none"), 1000);
  };

  modal.style.display = "flex";
};

document.getElementById("closeGaleriaBtn").addEventListener("click", () => {
  document.getElementById("galeriaModal").style.display = "none";
});

// ---------- agregarAlCarrito (respeta stock) ----------
function agregarAlCarrito(producto, cantidad = 1) {
  const stock = Number(producto.stock ?? 0);
  const itemEnCarrito = carrito.find((i) => i.id === producto.id);
  const yaEnCarrito = itemEnCarrito ? itemEnCarrito.cantidad : 0;

  if (yaEnCarrito + cantidad > stock) {
    const canAdd = Math.max(0, stock - yaEnCarrito);
    if (canAdd <= 0) {
      alert(`No hay más unidades disponibles de "${producto.nombre}".`);
      return;
    }
    cantidad = canAdd;
    alert(`Solo se agregaron ${cantidad} unidades por stock disponible.`);
  }

  // 🔄 Reducimos el stock del array productos inmediatamente
  //  producto.stock -= cantidad;

  if (itemEnCarrito) {
    itemEnCarrito.cantidad += cantidad;
  } else {
    carrito.push({ ...producto, cantidad });
  }

  actualizarContadorCarrito();
  actualizarStockEnVista(producto.id);
}

// === ACTUALIZAR CONTADOR CARRITO ===
function actualizarContadorCarrito() {
  const total = carrito.reduce((acc, p) => acc + p.cantidad, 0);
  document.getElementById("cartCount").textContent = total;
}

// === MOSTRAR MODAL CARRITO ===
document
  .getElementById("viewCartBtn")
  .addEventListener("click", mostrarCarrito);
document.getElementById("closeCartBtn").addEventListener("click", () => {
  document.getElementById("cartModal").style.display = "none";
});
// helper para actualizar el texto de stock en la card y en modal
function actualizarStockEnVista(productId) {
  const producto = productos.find((p) => p.id === productId);
  if (!producto) return;

  const itemEnCarrito = carrito.find((i) => i.id === productId);
  const yaEnCarrito = itemEnCarrito ? itemEnCarrito.cantidad : 0;
  const disponibles = Math.max(0, (producto.stock ?? 0) - yaEnCarrito);

  // Actualizamos el stock en el array productos para mantener consistencia
  producto.stock = disponibles;

  // Actualizar texto en la card
  const card = document.querySelector(
    `.producto[data-producto-id="${productId}"]`
  );
  if (card) {
    const stockEl = card.querySelector(".stock");
    if (stockEl) {
      stockEl.textContent =
        disponibles > 0 ? `Disponibles: ${disponibles}` : "Agotado";
      if (disponibles === 0) {
        stockEl.classList.add("agotado");
        const btn = card.querySelector(".conozca-btn");
        if (btn) {
          btn.setAttribute("disabled", "");
          btn.textContent = "Sin Stock";
        }
      }
    }
  }

  // También actualizar el modal si está abierto
  const stockModal = document.getElementById("galeriaStock");
  if (stockModal) {
    stockModal.textContent =
      disponibles > 0 ? `Disponibles: ${disponibles}` : "Agotado";
  }
}

function mostrarCarrito() {
  const ul = document.getElementById("cartItems");
  ul.innerHTML = "";
  let total = 0;

  carrito.forEach((item, index) => {
    const li = document.createElement("li");
    li.classList.add("cart-item");

    li.innerHTML = `
      <span class="cart-info">
        <strong>${item.nombre}</strong>
        <span class="cart-details">
          <span class="cart-cantidad">Cantidad: ${item.cantidad}</span>
          <span class="cart-price">$${(
            item.precio * item.cantidad
          ).toLocaleString("es-ES")}</span>
        </span>
      </span>

      <span class="cart-controls">
        <button class="btn-cantidad" onclick="cambiarCantidad(${index}, -1)">−</button>
        <button class="btn-cantidad" onclick="cambiarCantidad(${index}, 1)">+</button>
        <button class="btn-eliminar" onclick="eliminarProducto(${index})">🗑</button>
      </span>
    `;
    ul.appendChild(li);

    total += item.precio * item.cantidad;
  });

  document.getElementById("cartTotal").textContent =
    total.toLocaleString("es-ES");
  document.getElementById("cartModal").style.display = "flex";
}

// === CAMBIAR CANTIDAD ===
window.cambiarCantidad = (index, delta) => {
  carrito[index].cantidad += delta;
  if (carrito[index].cantidad <= 0) carrito.splice(index, 1);
  actualizarContadorCarrito();
  mostrarCarrito();
};

// === ELIMINAR PRODUCTO ===
window.eliminarProducto = (index) => {
  carrito.splice(index, 1);
  actualizarContadorCarrito();
  mostrarCarrito();
};

// === NOTIFICACIÓN ===
function mostrarNotificacion(mensaje) {
  let notif = document.createElement("div");
  notif.className = "notificacion";
  notif.textContent = mensaje;
  document.body.appendChild(notif);

  setTimeout(() => notif.classList.add("visible"), 50);
  setTimeout(() => {
    notif.classList.remove("visible");
    setTimeout(() => notif.remove(), 300);
  }, 2000);
}

// === FUNCIONES DE AUTENTICACIÓN ===
async function login(correo, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: password,
  });
  return { data, error };
}

async function signup(correo, password) {
  const { data, error } = await supabase.auth.signUp({
    email: correo,
    password: password,
  });
  return { data, error };
}

async function logout() {
  await supabase.auth.signOut();
  window.location.reload();
}

async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// funcion generar pdf
async function generarPDF(nombre, direccion, telefono) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // ======= CONFIGURACIONES GENERALES =======
  const tiendaNombre = "PetShop - Tienda para Mascotas";
  const tiendaDireccion = "Calle 123 #45-67, Bogotá";
  const tiendaTelefono = "313 357 4711";
  const fecha = new Date().toLocaleDateString("es-ES");
  const logoUrl =
    "https://res.cloudinary.com/dl7kjajkv/image/upload/v1758064709/PERRO-removebg-preview_3_rfzynh.png";

  // ======= AGREGAR LOGO Y ENCABEZADO =======
  try {
    const img = await fetch(logoUrl)
      .then((res) => res.blob())
      .then((blob) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      });

    doc.addImage(img, "PNG", 14, 10, 20, 20);
  } catch (e) {
    console.warn("No se pudo cargar el logo:", e);
  }

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(tiendaNombre, 40, 20);

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Pedido de Cliente", 14, 40);

  // ======= DATOS DEL CLIENTE =======
  doc.setFontSize(11);
  doc.text(`Nombre: ${nombre}`, 14, 50);
  doc.text(`Dirección: ${direccion}`, 14, 56);
  doc.text(`Teléfono: ${telefono}`, 14, 62);
  doc.text(`Fecha: ${fecha}`, 14, 68);

  // ======= TABLA DE PRODUCTOS =======
  const rows = carrito.map((item) => [
    item.nombre,
    item.cantidad,
    `$${item.precio.toLocaleString("es-ES")}`,
    `$${(item.precio * item.cantidad).toLocaleString("es-ES")}`,
  ]);

  // Fila total
  const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  rows.push(["", "", "TOTAL", `$${total.toLocaleString("es-ES")}`]);

  doc.autoTable({
    head: [["Producto", "Cantidad", "Precio Unitario", "Subtotal"]],
    body: rows,
    startY: 75,
    styles: { halign: "center" },
    headStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: "bold" },
    bodyStyles: { textColor: 50 },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
    didParseCell: (data) => {
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // ======= FOOTER CON INFO DE LA TIENDA =======
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text("¡Gracias por su compra!", 105, pageHeight - 20, {
    align: "center",
  });
  doc.text(
    "PetShop - Amigo Fiel - Todo para tu mascota",
    105,
    pageHeight - 15,
    { align: "center" }
  );
  doc.text(tiendaDireccion + " | " + tiendaTelefono, 105, pageHeight - 10, {
    align: "center",
  });

  // ======= GUARDAR PDF CON NOMBRE DEL CLIENTE =======
  // Limpiar el nombre para que sea válido como nombre de archivo
  const nombreArchivo = `Pedido_${nombre.replace(
    /[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g,
    "_"
  )}_${fecha.replace(/\//g, "-")}.pdf`;
  doc.save(nombreArchivo);
}
// Manejar el formulario de contacto
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const direccion = document.getElementById("direccion").value.trim();
    const email = document.getElementById("email").value.trim();
    const mensaje = document.getElementById("mensaje").value.trim();

    const { error } = await supabase
      .from("contactos")
      .insert([{ nombre, telefono, direccion, email, mensaje }]);

    if (error) {
      alert("❌ Error al enviar mensaje: " + error.message);
    } else {
      alert("✅ Mensaje enviado correctamente. ¡Gracias por contactarnos!");
      form.reset();
    }
  });
});
