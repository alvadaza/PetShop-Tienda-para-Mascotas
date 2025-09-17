import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configuración de Supabase
const supabaseUrl = "https://dedztwbflzgislpsyraw.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZHp0d2JmbHpnaXNscHN5cmF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4ODEwNTksImV4cCI6MjA2OTQ1NzA1OX0.mr8N_SLAWRjC8cSG28CVnBDl4ot6QK7SGXa0ZU339E4";
const supabase = createClient(supabaseUrl, supabaseKey);
/* -------------------------
   Lógica de carga / mostrar
   ------------------------- */

document.getElementById("logoutBtn").addEventListener("click", () => {
  if (confirm("¿Seguro que quieres cerrar sesión?")) {
    window.location.href = "admin.html";
  }
});

let todosLosPedidos = [];

// Llama a cargarTodosPedidos() y a buscarPedidos() cuando cargue el DOM,
// o coloca este script al final del body.
document.addEventListener("DOMContentLoaded", async () => {
  document
    .getElementById("btn-buscar")
    .addEventListener("click", buscarPedidos);
  await cargarTodosLosPedidos();
  buscarPedidos();
});

async function cargarTodosLosPedidos() {
  try {
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .order("fecha", { ascending: false });

    if (error) throw error;

    todosLosPedidos = data || [];

    // Limitar a los primeros 10 para mostrar
    const LIMITE = 20;
    const pedidosAMostrar = todosLosPedidos.slice(0, LIMITE);

    // Llamamos a una función que pinte la tabla con los pedidos
    mostrarPedidosEnTabla(pedidosAMostrar);

    // (Opcional) Mostrar info de cuántos hay
    const infoEl = document.getElementById("pedidosInfo");
    if (infoEl) {
      infoEl.textContent = `Mostrando ${pedidosAMostrar.length} de ${
        todosLosPedidos.length
      } pedidos${
        todosLosPedidos.length > LIMITE ? " (solo primeros " + LIMITE + ")" : ""
      }`;
    }

    const loading = document.getElementById("loading");
    if (loading) loading.style.display = "none";
  } catch (err) {
    console.error("Error cargando pedidos:", err);
    const loading = document.getElementById("loading");
    if (loading)
      loading.innerText = "Error cargando pedidos. Revisa la consola.";
  }
}

function buscarPedidos() {
  if (!Array.isArray(todosLosPedidos))
    return console.error("todosLosPedidos no es array");

  const nombre = (
    document.getElementById("filtro-nombre").value || ""
  ).toLowerCase();
  const fecha = document.getElementById("filtro-fecha").value;
  const idPedido = document.getElementById("filtro-id").value;
  const estado = document.getElementById("filtro-estado").value;

  let resultados = todosLosPedidos.slice();

  if (nombre) {
    resultados = resultados.filter(
      (p) => p.cliente && p.cliente.toLowerCase().includes(nombre)
    );
  }
  // Filtro por número de pedido
  if (idPedido) {
    resultados = resultados.filter((p) => String(p.id) === String(idPedido));
  }

  // Filtro por estado (despachado / pendiente)
  if (estado) {
    resultados = resultados.filter((p) => {
      if (estado === "despachado") return p.despachado === true;
      if (estado === "pendiente") return !p.despachado;
      return true;
    });
  }
  if (fecha) {
    resultados = resultados.filter((p) => {
      if (!p.fecha) return false;
      const iso = new Date(p.fecha).toISOString().split("T")[0];
      return iso === fecha;
    });
  }

  // 🔑 Si NO hay filtros, mostramos solo los primeros 10
  if (!nombre && !fecha) {
    resultados = resultados.slice(0, 20);
  }

  mostrarResultados(resultados);
}

/* -------------------------
   Mostrar resultados (seguro)
   ------------------------- */

function mostrarResultados(pedidos) {
  const contenedor = document.getElementById("resultados-pedidos");

  if (!pedidos || pedidos.length === 0) {
    contenedor.innerHTML = `
      <div class="no-resultados">
        <p>No se encontraron pedidos con los filtros seleccionados</p>
      </div>`;
    return;
  }

  contenedor.innerHTML = pedidos
    .map((pedido) => {
      // detectar llave primaria que uses en la tabla
      const pkValue =
        pedido.identificacid !== undefined
          ? pedido.identificacid
          : pedido.id !== undefined
          ? pedido.id
          : "";

      let productos = [];
      try {
        productos =
          typeof pedido.productos === "string"
            ? JSON.parse(pedido.productos)
            : pedido.productos || [];
      } catch (e) {
        console.warn("Error parseando productos", e);
        productos = [];
      }

      const total =
        pedido.total ||
        productos.reduce(
          (s, it) => s + (it.precio || 0) * (it.cantidad || 0),
          0
        );

      // serializar de forma segura
      const pedidoJSON = encodeURIComponent(JSON.stringify(pedido));

      return `
      <div class="pedido-card">
        <div class="pedido-header">
          <h2 class="pedido-title">Pedido #${pedido.id ?? pkValue ?? "N/A"}</h2>
          <div class="pedido-fecha">${formatearFecha(pedido.fecha)}</div>
        </div>

        <div class="pedido-details">
          <div><strong>Cliente:</strong> ${
            pedido.cliente ?? "No especificado"
          }</div>
          <div><strong>Teléfono:</strong> ${
            pedido.telefono ?? "No especificado"
          }</div>
          <div><strong>Dirección:</strong> ${
            pedido.direccion ?? "No especificado"
          }</div>
        </div>

        <h3>Productos:</h3>
        <div class="productos-list">
          ${
            productos.length > 0
              ? productos
                  .map(
                    (prod) =>
                      `<div class="producto-item"><span>${
                        prod.nombre ?? "Producto"
                      } x${prod.cantidad ?? 1}</span><span>$${(
                        (prod.precio || 0) * (prod.cantidad || 1)
                      ).toLocaleString("es-ES")}</span></div>`
                  )
                  .join("")
              : "<p>No hay información de productos</p>"
          }
        </div>

        <div class="total">Total: $${total.toLocaleString("es-ES")}</div>

        <div class="pedido-actions">
          <!-- paso seguro: paso el objeto serializado y lo decodifico en la función -->
          <button class="btn btn-imprimir" onclick="reimprimirPedido(decodeURIComponent('${pedidoJSON}'))">Reimprimir PDF</button>

          <!-- enviamos el id de la PK (string para seguridad) -->
          <button class="btn btn-eliminar" onclick="eliminarPedido('${pkValue}')">Eliminar Pedido</button>
        </div>
        <div class="acciones">
          ${
            pedido.despachado
              ? `<span class="despachado-label">✅ Despachado</span>`
              : `<button class="btn-despachar" data-id="${pkValue}">Marcar como Despachado</button>`
          }
        </div>
      </div>
    `;
    })
    .join("");
}

document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("btn-despachar")) {
    const boton = e.target;
    const pedidoId = boton.dataset.id;
    if (!pedidoId) return;

    if (!confirm("¿Marcar este pedido como despachado?")) return;

    try {
      const { error } = await supabase
        .from("pedidos")
        .update({ despachado: true })
        .eq("id", pedidoId);

      if (error) throw error;

      // ✅ Actualizamos la tarjeta en el DOM directamente
      const pedidoCard = boton.closest(".pedido-card");
      if (pedidoCard) {
        pedidoCard.classList.add("pedido-despachado"); // cambia color de fondo
        pedidoCard.querySelector(
          ".acciones"
        ).innerHTML = `<span class="estado-despachado">✅ Despachado</span>`;
      }
    } catch (err) {
      console.error("Error al marcar como despachado:", err);
      alert("❌ Hubo un error al actualizar el pedido");
    }
  }
});

function formatearFecha(fechaStr) {
  if (!fechaStr) return "Fecha no disponible";
  try {
    const f = new Date(fechaStr);
    return f.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return "Fecha inválida";
  }
}

/* -------------------------
   Reimprimir: acepta string u objeto
   ------------------------- */

async function reimprimirPedido(pedidoOrStr) {
  // si viene encodeURIComponent(JSON.stringify(pedido)) -> decode ya lo hizo en el onclick,
  // pero por si acaso permitimos tanto string como objeto.
  let pedido = pedidoOrStr;
  if (typeof pedidoOrStr === "string") {
    try {
      pedido = JSON.parse(pedidoOrStr);
    } catch (e) {
      console.error("Error parseando pedido en reimprimirPedido", e);
      alert("Error con los datos del pedido. Revisa la consola.");
      return;
    }
  }

  // Comprobación básica
  if (!pedido) {
    alert("Pedido inválido");
    return;
  }

  try {
    const { jsPDF } = window.jspdf || {};
    const jsPDFCtor =
      window.jspdf && window.jspdf.jsPDF
        ? window.jspdf.jsPDF
        : window.jsPDF || null;
    const doc = jsPDFCtor
      ? new jsPDFCtor()
      : window.jsPDF
      ? new window.jsPDF()
      : null;

    if (!doc) {
      alert("jsPDF no encontrado. Incluye la librería jsPDF y autopTable.");
      return;
    }

    const tiendaNombre = "PetShop - Tienda para Mascotas";
    const tiendaDireccion = "Calle 123 #45-67, Bogotá";
    const tiendaTelefono = "313 357 4711";
    const fecha = new Date().toLocaleDateString("es-ES");

    // ======= LOGO =======
    const logoUrl =
      "https://res.cloudinary.com/dl7kjajkv/image/upload/v1758064709/PERRO-removebg-preview_3_rfzynh.png";
    try {
      const blob = await fetch(logoUrl).then((r) => r.blob());
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      doc.addImage(dataUrl, "PNG", 14, 10, 20, 20);
    } catch (e) {
      console.warn("No se pudo cargar logo:", e);
    }

    // ======= ENCABEZADO =======
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(tiendaNombre, 40, 20);
    doc.setFontSize(14);
    doc.text("Pedido de Cliente", 14, 40);
    doc.setFontSize(11);
    doc.text(`Nombre: ${pedido.cliente ?? ""}`, 14, 50);
    doc.text(`Dirección: ${pedido.direccion ?? ""}`, 14, 56);
    doc.text(`Teléfono: ${pedido.telefono ?? ""}`, 14, 62);
    doc.text(`Fecha: ${fecha}`, 14, 68);

    // ======= TABLA PRODUCTOS =======
    let productos = [];
    try {
      productos =
        typeof pedido.productos === "string"
          ? JSON.parse(pedido.productos)
          : pedido.productos || [];
    } catch (e) {
      productos = [];
    }

    const rows = productos.map((it) => [
      it.nombre ?? "",
      it.cantidad ?? 0,
      `$${(it.precio || 0).toLocaleString("es-ES")}`,
      `$${((it.precio || 0) * (it.cantidad || 0)).toLocaleString("es-ES")}`,
    ]);

    const total = productos.reduce(
      (s, i) => s + (i.precio || 0) * (i.cantidad || 0),
      0
    );
    rows.push(["", "", "TOTAL", `$${total.toLocaleString("es-ES")}`]);

    if (typeof doc.autoTable === "function") {
      doc.autoTable({
        head: [["Producto", "Cantidad", "Precio Unitario", "Subtotal"]],
        body: rows,
        startY: 75,
        styles: { halign: "center" },
        headStyles: {
          fillColor: [230, 230, 230],
          textColor: 0,
          fontStyle: "bold",
        },
        columnStyles: {
          0: { halign: "left" },
          1: { halign: "center" },
          2: { halign: "right" },
          3: { halign: "right" },
        },
      });
    } else {
      // fallback simple
      let y = 80;
      doc.setFontSize(10);
      productos.forEach((p) => {
        doc.text(
          `${p.nombre ?? ""} x${p.cantidad ?? 0} - $${(
            (p.precio || 0) * (p.cantidad || 0)
          ).toLocaleString("es-ES")}`,
          14,
          y
        );
        y += 6;
      });
      doc.text(`TOTAL: $${total.toLocaleString("es-ES")}`, 14, y + 6);
    }

    // ======= FOOTER =======
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

    // ======= GUARDAR =======
    const filename = `Pedido_${
      pedido.id ?? pedido.identificacid ?? "pedido"
    }.pdf`;
    doc.save(filename);

    console.log("PDF generado para pedido:", pedido);
  } catch (err) {
    console.error("Error en reimprimirPedido:", err);
    alert("Error generando PDF. Revisa la consola.");
  }
}

/* -------------------------
   Eliminar pedido (robusto)
   ------------------------- */

async function eliminarPedido(id) {
  if (!id) {
    alert("ID invalido para eliminar");
    return;
  }
  if (
    !confirm(
      "¿Está seguro de que desea eliminar este pedido? Esta acción no se puede deshacer."
    )
  )
    return;

  try {
    // Intentamos eliminar por 'identificacid' primero
    let result = await supabase
      .from("pedidos")
      .delete()
      .eq("identificacid", id);
    if (result.error) {
      // si hay error, no asumimos; dejamos que intente por 'id' abajo
      console.warn("Error eliminando por identificacid:", result.error);
    }

    // Si no eliminó ninguna fila (o venía vacío), intentamos por 'id'
    const deletedRows = (result.data || []).length;
    if (deletedRows === 0) {
      const result2 = await supabase.from("pedidos").delete().eq("id", id);
      if (result2.error) throw result2.error;
    }

    await cargarTodosLosPedidos();
    buscarPedidos();
    alert("Pedido eliminado correctamente");
  } catch (err) {
    console.error("Error eliminando pedido:", err);
    alert("Error al eliminar el pedido: " + (err.message || err));
  }
}

/* -------------------------
   Exponer las funciones al window (IMPORTANTE)
   ------------------------- */
window.reimprimirPedido = reimprimirPedido;
window.eliminarPedido = eliminarPedido;
