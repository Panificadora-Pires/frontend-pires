<template>
  <svg
    class="ilustracao"
    viewBox="0 0 200 200"
    :role="rotulo ? 'img' : undefined"
    :aria-label="rotulo || undefined"
    :aria-hidden="rotulo ? undefined : 'true'"
    focusable="false"
  >
    <!-- Ilustrações próprias da Pires (cardápio fictício: nada de foto de banco). -->
    <ellipse class="c-sombra" cx="100" cy="180" rx="64" ry="9" />

    <g v-if="tipo === 'coxinha'">
      <path class="c-massa" d="M100 22 C82 58 46 92 52 132 C58 172 142 172 148 132 C154 92 118 58 100 22 Z" />
      <path class="c-massa-clara" d="M100 22 C91 46 77 64 72 86 C90 70 104 50 100 22 Z" />
      <path class="t-tostado" d="M60 140 C76 160 124 160 140 140" />
      <g class="c-tostado">
        <circle cx="78" cy="124" r="3" /><circle cx="112" cy="108" r="2.6" /><circle cx="96" cy="144" r="3" />
        <circle cx="126" cy="132" r="2.4" /><circle cx="88" cy="98" r="2.4" /><circle cx="118" cy="152" r="2.2" />
      </g>
    </g>

    <g v-else-if="tipo === 'paodequeijo'">
      <circle class="c-queijo-escuro-claro" cx="70" cy="132" r="34" />
      <circle class="c-queijo" cx="130" cy="132" r="34" />
      <circle class="c-queijo-claro" cx="100" cy="92" r="36" />
      <g class="c-queijo-escuro">
        <circle cx="88" cy="80" r="4" /><circle cx="112" cy="98" r="3" /><circle cx="60" cy="124" r="3.5" />
        <circle cx="140" cy="122" r="3.5" /><circle cx="128" cy="144" r="2.5" /><circle cx="76" cy="146" r="2.5" />
      </g>
      <path class="t-brilho" d="M84 76 C90 68 104 66 112 70" />
    </g>

    <g v-else-if="tipo === 'esfirra'">
      <path class="c-massa-clara" d="M100 40 L166 158 C140 168 60 168 34 158 Z" />
      <path class="c-queijo-claro" d="M100 72 L142 148 C122 154 78 154 58 148 Z" />
      <g class="c-queijo-escuro">
        <circle cx="96" cy="112" r="4" /><circle cx="112" cy="132" r="3.5" /><circle cx="84" cy="138" r="3" /><circle cx="104" cy="96" r="2.5" />
      </g>
      <path class="t-tostado" d="M40 156 C80 164 120 164 160 156" />
    </g>

    <g v-else-if="tipo === 'pastel'">
      <path class="c-massa-clara" d="M28 132 C28 78 172 78 172 132 Z" />
      <path class="t-tostado-grosso" d="M30 132 L170 132" />
      <g class="c-massa">
        <circle cx="42" cy="132" r="5" /><circle cx="60" cy="132" r="5" /><circle cx="78" cy="132" r="5" /><circle cx="96" cy="132" r="5" />
        <circle cx="114" cy="132" r="5" /><circle cx="132" cy="132" r="5" /><circle cx="150" cy="132" r="5" />
      </g>
      <g class="c-tostado"><circle cx="76" cy="104" r="2.5" /><circle cx="118" cy="100" r="2.5" /><circle cx="98" cy="114" r="2" /></g>
      <path class="t-brilho" d="M60 96 C74 88 92 86 108 88" />
    </g>

    <g v-else-if="tipo === 'brigadeiro'">
      <path class="c-papel" d="M54 116 L146 116 L134 166 L66 166 Z" />
      <path class="t-papel" d="M70 118 L74 164 M86 118 L88 164 M100 118 L100 164 M114 118 L112 164 M130 118 L126 164" />
      <circle class="c-chocolate" cx="100" cy="98" r="40" />
      <g class="c-chocolate-claro">
        <rect x="80" y="74" width="8" height="3" rx="1.5" transform="rotate(30 84 75)" />
        <rect x="104" y="68" width="8" height="3" rx="1.5" transform="rotate(-20 108 69)" />
        <rect x="118" y="92" width="8" height="3" rx="1.5" transform="rotate(60 122 93)" />
        <rect x="88" y="104" width="8" height="3" rx="1.5" transform="rotate(-40 92 105)" />
        <rect x="70" y="94" width="8" height="3" rx="1.5" transform="rotate(10 74 95)" />
        <rect x="106" y="116" width="8" height="3" rx="1.5" transform="rotate(25 110 117)" />
      </g>
    </g>

    <g v-else-if="tipo === 'brownie'">
      <path class="c-chocolate" d="M44 92 L156 92 L156 158 L44 158 Z" />
      <path class="c-chocolate-claro" d="M44 92 L156 92 L148 76 L52 76 Z" />
      <path class="t-brilho-fino" d="M64 110 L84 104 L96 116 L118 106 L136 114" />
      <g class="c-chocolate-claro"><circle cx="70" cy="136" r="3" /><circle cx="110" cy="142" r="3" /><circle cx="138" cy="130" r="2.5" /></g>
    </g>

    <g v-else-if="tipo === 'cookie'">
      <circle class="c-massa-clara" cx="100" cy="110" r="58" />
      <circle class="c-queijo-escuro" cx="100" cy="110" r="58" opacity="0.25" />
      <g class="c-chocolate">
        <circle cx="78" cy="92" r="7" /><circle cx="120" cy="88" r="6" /><circle cx="104" cy="118" r="7" />
        <circle cx="72" cy="128" r="5" /><circle cx="134" cy="126" r="6" /><circle cx="100" cy="146" r="5" />
      </g>
    </g>

    <g v-else-if="tipo === 'bolo'">
      <path class="c-cenoura" d="M40 150 L160 150 L160 96 L40 120 Z" />
      <path class="c-laranja-clara" d="M40 120 L160 96 L160 110 L40 134 Z" opacity="0.6" />
      <path class="c-chocolate" d="M36 118 L164 92 L164 80 C150 76 140 90 128 84 C114 78 104 94 90 90 C76 86 66 102 52 100 C44 99 38 108 36 118 Z" />
      <path class="t-chocolate" d="M58 104 C60 116 62 118 64 104 M100 94 C102 108 104 110 106 94 M140 86 C142 98 144 100 146 86" />
    </g>

    <g v-else-if="tipo === 'suco' || tipo === 'sucouva' || tipo === 'bebida'">
      <path class="t-canudo" d="M126 30 L112 70" />
      <path class="c-vidro" d="M62 62 L138 62 L128 176 L72 176 Z" />
      <path :class="tipo === 'sucouva' ? 'c-uva' : tipo === 'bebida' ? 'c-chocolate-claro' : 'c-laranja'" d="M66 92 L134 92 L128 172 L72 172 Z" />
      <path :class="tipo === 'sucouva' ? 'c-uva-clara' : 'c-laranja-clara'" d="M70 100 L80 100 L76 160 L72 160 Z" opacity="0.7" />
      <template v-if="tipo === 'suco'">
        <circle class="c-queijo" cx="138" cy="64" r="20" />
        <circle class="c-queijo-claro" cx="138" cy="64" r="14" />
      </template>
      <g v-else-if="tipo === 'sucouva'" class="c-uva">
        <circle cx="140" cy="58" r="8" /><circle cx="154" cy="62" r="8" /><circle cx="146" cy="72" r="8" />
      </g>
    </g>

    <g v-else-if="tipo === 'agua'">
      <rect class="c-agua-tampa" x="88" y="22" width="24" height="16" rx="4" />
      <path class="c-agua" d="M84 40 L116 40 L120 58 C134 66 138 78 138 92 L138 166 C138 172 134 176 128 176 L72 176 C66 176 62 172 62 166 L62 92 C62 78 66 66 80 58 Z" />
      <rect class="c-agua-tampa" x="62" y="104" width="76" height="34" opacity="0.85" />
      <path class="t-brilho" d="M76 88 L76 160" />
    </g>

    <g v-else-if="tipo === 'refrigerante'">
      <rect class="c-lata" x="64" y="44" width="72" height="132" rx="14" />
      <rect class="c-vidro" x="70" y="38" width="60" height="12" rx="6" opacity="0.9" />
      <path class="c-lata-clara" d="M64 92 C88 104 112 80 136 92 L136 120 C112 108 88 132 64 120 Z" />
      <path class="t-brilho" d="M80 60 L80 160" />
    </g>

    <g v-else-if="tipo === 'combo'">
      <path class="t-canudo" d="M148 56 L138 84" />
      <path class="c-vidro" d="M106 80 L162 80 L154 176 L114 176 Z" />
      <path class="c-laranja" d="M109 104 L159 104 L154 172 L114 172 Z" />
      <path class="c-massa" d="M70 52 C56 80 30 104 34 134 C38 166 102 166 106 134 C110 104 84 80 70 52 Z" />
      <path class="c-massa-clara" d="M70 52 C63 70 53 84 50 100 C64 88 74 74 70 52 Z" />
      <g class="c-tostado"><circle cx="58" cy="128" r="2.6" /><circle cx="82" cy="116" r="2.2" /><circle cx="72" cy="146" r="2.6" /></g>
    </g>

    <g v-else-if="tipo === 'doce'">
      <path class="c-papel" d="M58 112 L142 112 L130 170 L70 170 Z" />
      <path class="c-chocolate-claro" d="M52 112 C52 70 148 70 148 112 Z" />
      <circle class="c-lata" cx="100" cy="66" r="9" />
    </g>

    <g v-else>
      <!-- Salgado genérico: pãozinho dourado. -->
      <ellipse class="c-massa" cx="100" cy="128" rx="66" ry="42" />
      <ellipse class="c-massa-clara" cx="94" cy="116" rx="46" ry="24" />
      <path class="t-tostado-grosso" d="M72 112 C80 104 92 104 100 112 M104 112 C112 104 124 104 132 112" />
    </g>
  </svg>
</template>

<script setup>
defineProps({
  // Um dos tipos de ilustracaoParaProduto() (utils/ilustracaoProduto.js).
  tipo: { type: String, default: "salgado" },
  // Texto para leitor de tela; sem ele, a ilustração é decorativa.
  rotulo: { type: String, default: "" },
});
</script>

<style scoped>
.ilustracao {
  display: block;
  width: 100%;
  height: 100%;
}
.c-sombra { fill: var(--ilu-sombra); }
.c-massa { fill: var(--ilu-massa); }
.c-massa-clara { fill: var(--ilu-massa-clara); }
.c-tostado { fill: var(--ilu-tostado); }
.c-queijo { fill: var(--ilu-queijo); }
.c-queijo-claro { fill: var(--ilu-queijo-claro); }
.c-queijo-escuro { fill: var(--ilu-queijo-escuro); }
.c-queijo-escuro-claro { fill: var(--ilu-queijo); filter: brightness(0.97); }
.c-chocolate { fill: var(--ilu-chocolate); }
.c-chocolate-claro { fill: var(--ilu-chocolate-claro); }
.c-cenoura { fill: var(--ilu-cenoura); }
.c-laranja { fill: var(--ilu-laranja); }
.c-laranja-clara { fill: var(--ilu-laranja-clara); }
.c-uva { fill: var(--ilu-uva); }
.c-uva-clara { fill: var(--ilu-uva-clara); }
.c-agua { fill: var(--ilu-agua); }
.c-agua-tampa { fill: var(--ilu-agua-tampa); }
.c-lata { fill: var(--ilu-lata); }
.c-lata-clara { fill: var(--ilu-lata-clara); }
.c-papel { fill: var(--ilu-papel); }
.c-vidro { fill: var(--ilu-vidro); stroke: var(--ilu-sombra); stroke-width: 3; }
.t-tostado,
.t-tostado-grosso,
.t-brilho,
.t-brilho-fino,
.t-papel,
.t-chocolate,
.t-canudo {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.t-tostado { stroke: var(--ilu-tostado); stroke-width: 3; opacity: 0.5; }
.t-tostado-grosso { stroke: var(--ilu-tostado); stroke-width: 4; opacity: 0.55; }
.t-brilho { stroke: var(--ilu-brilho); stroke-width: 5; opacity: 0.7; }
.t-brilho-fino { stroke: var(--ilu-chocolate-claro); stroke-width: 3; }
.t-papel { stroke: var(--ilu-tostado); stroke-width: 2; opacity: 0.6; }
.t-chocolate { stroke: var(--ilu-chocolate); stroke-width: 6; }
.t-canudo { stroke: var(--pp-dourado-escuro); stroke-width: 6; }
</style>
