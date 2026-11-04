import axiosClient from "../api/axiosClient";

// Firmas de los reportes (Catálogos › Firmas de planilla). Cada firma dice a quién
// aplica (tipo de manejo: 1 empleados régimen, 2 jubilados…), su tipo y su orden.
export const TIPOS_FIRMA = ["ELABORADO POR", "REVISADO POR", "VISTO BUENO", "AUTORIZADO POR"];
// Registros viejos con el tipo abreviado.
const ANTIGUOS = { ELABORA: "ELABORADO POR", REVISA: "REVISADO POR", AUTORIZA: "AUTORIZADO POR", "VO.BO.": "VISTO BUENO", VOBO: "VISTO BUENO" };

export const tipoFirma = (t) => {
  const v = String(t || "").trim().toUpperCase();
  return ANTIGUOS[v] || v;
};
// "ELABORADO POR" → "Elaborado por"
export const rolFirma = (t) => { const v = tipoFirma(t).toLowerCase(); return v.charAt(0).toUpperCase() + v.slice(1); };

export const listarFirmas = async () => {
  try {
    const { data } = await axiosClient.get("/catalogos/firma-planilla");
    return data.data || [];
  } catch {
    return [];
  }
};

// Firmas de un tipo de manejo, en su orden, listas para imprimir ({ rol, nombre, cargo }).
export const firmasParaImprimir = async (tipoManejo) => {
  const lista = (await listarFirmas())
    .filter((f) => Number(f.tipoManejo) === Number(tipoManejo))
    .sort((a, b) => Number(a.idFirma || 0) - Number(b.idFirma || 0) || TIPOS_FIRMA.indexOf(tipoFirma(a.tipo)) - TIPOS_FIRMA.indexOf(tipoFirma(b.tipo)));
  return lista.map((f) => ({ rol: rolFirma(f.tipo), nombre: f.nombre || "", cargo: f.puesto || "" }));
};
