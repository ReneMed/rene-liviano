/** Límite conservador para JSON + límites típicos de hosting (subir captura si hace falta). */
const MAX_BYTES = 5 * 1024 * 1024;

/** Lee archivo como base64 sin prefijo `data:...;base64,`. */
export function readFileAsBase64(file: File): Promise<string> {
  if (file.size > MAX_BYTES) {
    return Promise.reject(new Error("El archivo supera 5 MB. Probá una foto más liviana o comprimila."));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result;
      if (typeof res !== "string") {
        reject(new Error("No se pudo leer el archivo"));
        return;
      }
      const comma = res.indexOf(",");
      resolve(comma >= 0 ? res.slice(comma + 1) : res);
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo"));
    reader.readAsDataURL(file);
  });
}
