import { resolverUrlMidia } from "@/services/catalog.service";
import { ilustracaoParaProduto } from "@/utils/ilustracaoProduto";

const MAXIMO_PROMOCOES_NO_BANNER = 3;
const MAXIMO_DESTAQUES_NO_BANNER = 2;

function formatarPreco(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));
}

function slideDeProduto(produto, { etiqueta, destaque, texto, nota }) {
  const preco = formatarPreco(produto.preco_atual ?? produto.preco);
  return {
    id: `produto-${produto.id}`,
    etiqueta,
    titulo: [produto.nome],
    destaque,
    texto,
    nota,
    ilustracao: ilustracaoParaProduto(produto),
    imagem: resolverUrlMidia(produto.imagem) || null,
    ...(ilustracaoParaProduto(produto) === "coxinha" && {
      video: "/videos/coxinha-banner.mp4",
      poster: "/videos/coxinha-banner-poster.jpg",
      videoMobile: "/videos/coxinha-banner-mobile-v2.mp4",
      posterMobile: "/videos/coxinha-banner-mobile-v2-poster.jpg",
      duracao: 16000,
    }),
    acao: { tipo: "adicionar", rotulo: `Adicionar · ${preco}`, produto },
  };
}

export function montarSlidesBanner(produtosEmPromocao, produtos) {
  const emPromocao = produtosEmPromocao.slice(0, MAXIMO_PROMOCOES_NO_BANNER);
  const slides = emPromocao.length
    ? emPromocao.map((produto) => {
        const original = Number(produto.preco);
        const atual = Number(produto.preco_atual ?? produto.preco);
        const desconto =
          original > atual
            ? Math.round(((original - atual) / original) * 100)
            : 0;
        return slideDeProduto(produto, {
          etiqueta: "Promoção de hoje",
          destaque: `por ${formatarPreco(atual)}`,
          texto: `De ${formatarPreco(original)} por ${formatarPreco(atual)} enquanto durar a promoção.`,
          nota: desconto ? `${desconto}% mais barato` : "",
        });
      })
    : produtos
        .filter((produto) => produto.destaque)
        .slice(0, MAXIMO_DESTAQUES_NO_BANNER)
        .map((produto) =>
          slideDeProduto(produto, {
            etiqueta: "Destaque da casa",
            destaque: "sem fila.",
            texto:
              "Peça agora pelo app e retire no balcão mostrando o QR Code.",
            nota: "direto do balcão",
          }),
        );

  return [
    ...slides,
    {
      id: "como-funciona",
      etiqueta: "Como funciona",
      titulo: ["Pediu,", "pagou,"],
      destaque: "mostrou.",
      texto:
        "Pix, cartão ou dinheiro na retirada. Quando ficar pronto, você recebe o aviso e mostra o QR Code no balcão.",
      nota: "é só mostrar no balcão",
      ilustracao: "qr",
      imagem: null,
      acao: { tipo: "rota", rotulo: "Ver meus pedidos", rota: "pedidos" },
    },
  ];
}
