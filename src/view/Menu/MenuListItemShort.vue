<template>
    <button class="menu-action-card" type="button">
        <span class="menu-action-icon">
            <component :is="icon" :size="20" :stroke-width="2"/>
        </span>
        <span class="menu-action-copy">
            <span class="menu-action-title">{{ menuName }}</span>
            <span class="menu-action-desc" v-if="description">{{ description }}</span>
        </span>
        <span class="menu-action-addon" v-if="addOnText">{{ addOnText }}</span>
        <slot/>
    </button>
</template>

<script lang="ts" setup>
import type {Component} from "vue";

defineProps<{
    icon?: Component
    menuName?: string
    description?: string
    addOnText?: string
}>()
</script>

<style lang="scss" scoped>
.menu-action-card {
    appearance: none;
    width: 100%;
    min-height: 64px;
    padding: 10px 12px;
    border: 1px solid var(--diary-border);
    border-radius: var(--diary-radius);
    background: var(--diary-surface);
    color: var(--diary-ink);
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    text-align: left;
    cursor: pointer;
    box-shadow: var(--diary-hairline-shadow);
    transition:
        background-color var(--diary-transition),
        border-color var(--diary-transition),
        box-shadow var(--diary-transition),
        transform var(--diary-transition);

    &:hover {
        background: var(--diary-bg-elevated);
        border-color: var(--diary-border-strong);
    }

    &:active {
        transform: scale(0.99);
    }
}

.menu-action-icon {
    width: 40px;
    height: 40px;
    border-radius: var(--diary-radius);
    background: rgba(0, 122, 255, 0.1);
    color: var(--diary-accent);
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.menu-action-copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.menu-action-title {
    font-size: 15px;
    font-weight: 650;
    line-height: 1.25;
    color: var(--diary-ink);
}

.menu-action-desc {
    font-size: 12px;
    line-height: 1.35;
    color: var(--diary-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.menu-action-addon {
    font-size: 12px;
    color: var(--diary-muted-2);
    white-space: nowrap;
}

@media (max-width: 520px) {
    .menu-action-card {
        min-height: 58px;
        grid-template-columns: 36px minmax(0, 1fr) auto;
    }

    .menu-action-icon {
        width: 36px;
        height: 36px;
    }
}
</style>
