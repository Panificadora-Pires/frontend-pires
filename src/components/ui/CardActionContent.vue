<template>
  <!-- A cópia visual acompanha o recorte para manter o contraste durante o preenchimento. -->
  <span class="pp-card-action__content"><slot /></span>
  <span class="pp-card-action__fill" aria-hidden="true">
    <span class="pp-card-action__content"><slot /></span>
  </span>
</template>
