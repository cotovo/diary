<template>
    <div :class="[
        'list-header',
        {big: size === 'big'},
        {medium: size === 'medium'},
        {'with-search': isWithSearch}
    ]">{{ title }}</div>
</template>

<script lang="ts" setup>
import { computed } from "vue"
import { useProjectStore } from "@/pinia/useProjectStore"
const projectStore = useProjectStore()

defineProps<{
    title: string,
    size?: 'big' | 'medium'
}>()

const isWithSearch = computed(() => {
    return projectStore.isShowSearchBar
})

</script>

<style scoped lang="scss">
@use "../../scss/plugin" as *;

.list-header{
    position: sticky;
    top: 0;
    z-index: $z-header;
    font-size: 22px;
    text-align: left;
    padding: 12px 18px 8px;
    background: rgba(245, 245, 247, 0.94);
    line-height: 1.2;
    font-family: "Galvji", sans-serif;
    color: var(--diary-ink);
    font-weight: 760;
    letter-spacing: 0;
    text-shadow: none;
    transition: top 0.3s ease-in-out;
    border-bottom: 1px solid transparent;
    backdrop-filter: blur(16px);
    &.big{
        padding: 14px 18px 10px;
        height: auto;
        font-size: 24px;
    }
    &.medium{
        border-bottom: none;
        padding: 12px 18px 8px;
        height: auto;
        font-size: 24px;
    }
    &.with-search{
        transition: top 0.3s ease-in-out;
        top: 50px;
    }
}

// Mobile
@media (max-width: $grid-separate-width-sm) {
    .list-header {
        font-size: $fz-list-header-mobile;
    }
}

@media (prefers-color-scheme: dark) {
    .list-header{
        border-color: transparent !important;
        background: rgba(0, 0, 0, 0.84) !important;
        color: var(--diary-ink) !important;
        border-bottom: 1px solid transparent !important;
    }
}




</style>
