import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configuración de Supabase
const supabaseUrl = "https://dedztwbflzgislpsyraw.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZHp0d2JmbHpnaXNscHN5cmF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4ODEwNTksImV4cCI6MjA2OTQ1NzA1OX0.mr8N_SLAWRjC8cSG28CVnBDl4ot6QK7SGXa0ZU339E4";
const supabase = createClient(supabaseUrl, supabaseKey);

const tablaBody = document.getElementById("mensajesBody");
const sinMensajes = document.getElementById("sinMensajes");

document.getElementById("volverBtn").addEventListener("click", () => {
  window.location.href = "/admin.html";
});
async function cargarMensajes() {
  const { data, error } = await supabase
    .from("contactos") // 👈 tabla corregida (plural)
    .select("id, nombre, telefono, direccion, email, mensaje, fecha")
    .order("fecha", { ascending: false });

  if (error) {
    console.error("❌ Error al cargar mensajes:", error);
    sinMensajes.textContent = "Error al cargar mensajes.";
    sinMensajes.style.display = "block";
    return;
  }

  if (!data || data.length === 0) {
    sinMensajes.style.display = "block";
    return;
  }

  data.forEach((msg) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
            <td>${msg.id}</td>
            <td>${msg.nombre}</td>
            <td>${msg.telefono}</td>
            <td>${msg.email}</td>
            <td>${msg.direccion || "-"}</td>
            <td>${msg.mensaje}</td>
            <td>${new Date(msg.fecha).toLocaleString()}</td>
          `;
    tablaBody.appendChild(fila);
  });
}

cargarMensajes();
