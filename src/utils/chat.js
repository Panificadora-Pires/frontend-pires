export function formatarHora(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  const hoje = new Date().toDateString() === data.toDateString();
  return new Intl.DateTimeFormat("pt-BR", {
    ...(hoje ? {} : { day: "2-digit", month: "2-digit" }),
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

export function formatarDataCompleta(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}
