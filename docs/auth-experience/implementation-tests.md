# Critérios de comportamento — Auth Experience 2.0

Baseline antes da implementação: `node --test tests/*.test.mjs`, 99/99 passaram em 17/11/2026.

Casos definidos antes de alterar `src/` (o coordenador executará a suíte de navegador):

- Login ↔ cadastro usa um layout e uma camada fotográfica persistentes; apenas um formulário fica interativo. Google mantém a mesma instância e host oficial.
- Deep links, refresh, Voltar/Avançar e `redirect` interno válido sobrevivem à navegação entre as cinco rotas; redirects externos e caminhos de autenticação são recusados.
- Duplo clique/Enter e callback Google durante operação não duplicam o HTTP. Navegação auth pendente é impedida; resposta ignorada ou desmontada não produz mensagem, foco ou navegação.
- Erros locais e 400/401/403/429/rede ficam legíveis e o primeiro campo inválido recebe foco. Labels, ajuda, toggle de senha, alertas e código colável usam semântica acessível.
- Cadastro mantém aceite explícito com disclosure da indisponibilidade dos documentos jurídicos; Google observa o mesmo aceite. Nenhum link jurídico fictício.
- Recuperação/ativação preservam apenas metadados em sessionStorage, sem senha/código; refresh mantém etapa e cooldown por timestamp. Outra aba orienta solicitar código. Reenvio não afirma entrega garantida.
- Confirmação de endereço já existente não promete alterar cadastro; senha nova segue mínimo de 8 e orientação compatível com validadores reais.
- Desktop ≥1280px, móvel 390px, zoom/altura curta, teclado e reduced motion: sem overflow, foto oculta ≤900px, sem movimento na preferência reduzida e foco previsível.

Esta lista registra os critérios; não declara aprovação dos testes de navegador.
