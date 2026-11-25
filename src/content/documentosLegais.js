export const VERSAO_DOCUMENTOS = "2026-11-24";
export const ATUALIZADO_EM = "24 de novembro de 2026";
export const RESPONSAVEL = "Projeto Pires Panificadora — TCC IFC Araquari";
export const CONTATO = "arthurlanznaster@gmail.com";

const AVISO_ACADEMICO =
  "A Pires Panificadora é um projeto acadêmico, sem fins lucrativos e sem CNPJ, desenvolvido como Trabalho de Conclusão de Curso do curso técnico em Informática do IFC Araquari.";

export const documentosLegais = {
  termos: {
    titulo: "Termos de Uso",
    nota: "o combinado do balcão",
    resumo: `${AVISO_ACADEMICO} Ao criar uma conta, você concorda com as regras abaixo.`,
    secoes: [
      {
        titulo: "O que é o serviço",
        paragrafos: [
          "Um sistema web para pedir o lanche antes do intervalo e retirar no balcão da padaria, sem fila. O cliente escolhe os produtos, paga e mostra um QR Code na retirada; a equipe acompanha a fila e confirma a entrega.",
        ],
      },
      {
        titulo: "Sua conta",
        itens: [
          "Use dados verdadeiros. O e-mail precisa ser confirmado com um código antes do primeiro acesso.",
          "A conta é pessoal: não compartilhe a senha nem o QR Code de retirada.",
          "Não tente acessar pedidos de outras pessoas, sobrecarregar o sistema ou burlar preços, estoque e pagamentos. Contas usadas para isso podem ser desativadas pela administração.",
          "Use o chat do pedido só para assuntos do pedido, com respeito à equipe.",
        ],
      },
      {
        titulo: "Como o pedido funciona",
        itens: [
          "Preço e estoque são conferidos pelo sistema no momento do pedido. O preço de cada item fica congelado ali, inclusive o de promoção vigente.",
          "Formas de pagamento: Pix e cartão pelo Mercado Pago, ou dinheiro na retirada.",
          "Os pagamentos online são reais: Pix e cartão movimentam dinheiro de verdade pelo Mercado Pago.",
          "Pedido pago online só é confirmado quando o Mercado Pago aprova o pagamento. Pedido em dinheiro é pago no balcão, na retirada.",
          "O pedido passa por: pendente, confirmado, pronto e retirado. Você acompanha cada etapa em Meus pedidos e nas notificações.",
        ],
      },
      {
        titulo: "Retirada com QR Code",
        itens: [
          "Quando o pedido estiver pronto, mostre o QR Code de Meus pedidos no balcão. A equipe lê o código e confirma a entrega.",
          "Retire em até 15 minutos depois que o pedido ficar pronto. Depois disso, ele pode ser cancelado automaticamente.",
        ],
      },
      {
        titulo: "Cancelamento e estorno",
        itens: [
          "O cancelamento é feito pela equipe da padaria, antes da retirada. Para pedir, fale com a equipe pelo chat do pedido.",
          "Pagamento online não concluído em 45 minutos expira e o pedido é cancelado.",
          "Se um pedido já pago online for cancelado, o valor é estornado integralmente pelo Mercado Pago, na mesma forma de pagamento. O prazo para o dinheiro aparecer depende do Mercado Pago e do seu banco.",
          "Em todo cancelamento, os itens voltam ao estoque.",
        ],
      },
      {
        titulo: "Limites do projeto",
        paragrafos: [
          "Por ser um projeto escolar, o sistema pode ficar fora do ar, mudar ou ser encerrado sem aviso prévio. Se algo der errado com um pedido ou pagamento, fale com a equipe pelo chat ou pelo contato abaixo.",
          "Estes termos podem ser atualizados; a data da última versão fica no topo desta página.",
        ],
      },
    ],
  },
  privacidade: {
    titulo: "Política de Privacidade",
    nota: "seus dados, sem segredo",
    resumo: `${AVISO_ACADEMICO} Aqui está o que coletamos, por quê, com quem compartilhamos e como você pode pedir mudanças. Não vendemos dados.`,
    secoes: [
      {
        titulo: "O que coletamos e para quê",
        itens: [
          "Conta: nome, e-mail, telefone e senha (guardada só como hash). Servem para entrar, falar com você sobre o pedido e identificar quem retira.",
          "Login com Google: identificador da conta Google, e-mail, nome e foto do perfil, para entrar sem senha e mostrar seu avatar.",
          "Foto de perfil: a imagem que você enviar, guardada no Cloudinary.",
          "Pedidos: itens, valores, forma e situação do pagamento, identificadores do Mercado Pago, dados do Pix gerado e o código do QR de retirada. Servem para preparar, cobrar, entregar e estornar quando necessário. Os dados do cartão são digitados no formulário do Mercado Pago e não ficam guardados no nosso servidor.",
          "Chat do pedido: as mensagens trocadas com a equipe sobre aquele pedido.",
          "Notificações: avisos sobre o andamento dos seus pedidos.",
          "Favoritos: os produtos que você marcou.",
          "Códigos de verificação: enviados por e-mail para confirmar a conta e redefinir a senha, guardados só como hash.",
          "Dados técnicos: o endereço IP é usado para limitar excesso de requisições e proteger o sistema.",
        ],
        paragrafos: [
          "Não usamos ferramentas de análise de navegação (analytics) nem publicidade.",
        ],
      },
      {
        titulo: "Com quem compartilhamos",
        itens: [
          "Mercado Pago: processa Pix e cartão e faz os estornos.",
          "Google: login com a conta Google, quando você escolhe essa opção.",
          "Cloudinary: guarda as imagens de produtos e as fotos de perfil.",
          "Fabroku (IFC): hospeda o servidor e o banco de dados.",
          "Vercel: hospeda o site.",
          "Serviço de e-mail (SMTP): envia os códigos de verificação.",
        ],
        paragrafos: [
          "Cada serviço recebe só o necessário para a sua função e segue a própria política de privacidade.",
        ],
      },
      {
        titulo: "Quanto tempo guardamos",
        itens: [
          "Conta, pedidos, chat, notificações e favoritos ficam guardados enquanto a conta existir. Não há exclusão automática; você pode pedir a exclusão pelo contato abaixo.",
          "Códigos de verificação valem 10 minutos e aceitam até 5 tentativas.",
          "O chat do pedido aceita mensagens até 24 horas depois que o pedido é retirado ou cancelado; depois disso, o histórico fica só para leitura.",
          "O acesso no navegador expira em 3 horas e é renovado por até 1 dia; ao sair da conta, ele é revogado.",
        ],
      },
      {
        titulo: "Seus direitos",
        paragrafos: [
          "Conforme a LGPD, você pode pedir confirmação e acesso aos seus dados, correção, exclusão e informações sobre o compartilhamento. Nome, telefone e foto podem ser alterados em Meu perfil. Para os demais pedidos, escreva para o contato abaixo a partir do e-mail da sua conta.",
        ],
      },
      {
        titulo: "Segurança",
        paragrafos: [
          "Usamos conexão segura (HTTPS), senhas com hash, permissões no servidor (cada cliente vê só os próprios pedidos) e confirmação de pagamento direto com o Mercado Pago. Nenhum sistema é totalmente imune a falhas; se perceber algo estranho, avise.",
        ],
      },
    ],
  },
  cookies: {
    titulo: "Política de Cookies",
    nota: "só o essencial",
    resumo: `${AVISO_ACADEMICO} O site usa apenas armazenamento essencial para funcionar e recursos de terceiros necessários ao login com Google e ao pagamento. Não há cookies de análise nem de publicidade.`,
    secoes: [
      {
        titulo: "Armazenamento no seu navegador",
        itens: [
          "Sessão (localStorage): as chaves de acesso que mantêm você conectado. São apagadas ou revogadas ao sair da conta.",
          "Carrinho (localStorage): o rascunho do carrinho de cada conta, para não perder os itens ao recarregar a página.",
          "Etapas de acesso (sessionStorage): o e-mail em confirmação de conta ou redefinição de senha, apagado ao fechar a aba.",
          "Aviso de cookies (localStorage): lembra que você já fechou este aviso.",
        ],
      },
      {
        titulo: "Aplicativo (PWA)",
        paragrafos: [
          "O site registra um service worker que guarda os arquivos do próprio site (telas, estilos e imagens da marca) para abrir mais rápido e permitir a instalação como aplicativo. Ele não guarda seus dados pessoais.",
        ],
      },
      {
        titulo: "Cookies de terceiros necessários",
        itens: [
          'Google: o botão "Entrar com Google" pode usar cookies do Google para identificar sua conta Google e proteger o login.',
          "Mercado Pago: no pagamento, o formulário do Mercado Pago usa cookies e identificação do dispositivo para prevenção a fraudes.",
          "Google Fonts: as fontes do site vêm dos servidores do Google, que recebem dados técnicos da conexão, como o endereço IP.",
        ],
      },
      {
        titulo: "Como controlar",
        paragrafos: [
          "Você pode apagar os dados do site nas configurações do navegador. Sem o armazenamento essencial, não é possível manter o login nem o carrinho; bloquear cookies de terceiros pode impedir o login com Google ou o pagamento online.",
        ],
      },
    ],
  },
};
