<template>
    <div class="menu-panel-container" :style="`height:  ${projectStore.insets.heightPanel}px`">
        <slot/>
    </div>
</template>

<script lang="ts" setup>
import {useProjectStore} from "@/pinia/useProjectStore.ts";
const projectStore = useProjectStore()

</script>

<style lang="scss" scoped>
.menu-panel-container{
    height: 100%;
    padding: 18px;
    overflow-y: auto;
    background: var(--diary-bg);
    border-right: 1px solid var(--diary-border);
    box-shadow: var(--diary-card-shadow);
}

@media (min-width: 768px) and (max-width: 1440px) {
    .menu-panel-container {
        padding: 16px;
    }
}

@media (max-width: 640px) {
    .menu-panel-container {
        padding: 14px 12px calc(24px + env(safe-area-inset-bottom));
    }
}
</style>
