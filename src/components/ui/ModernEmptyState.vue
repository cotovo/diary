<template>
    <div class="modern-empty-state">
        <component v-if="icon" :is="icon" :size="32" :stroke-width="1.8"/>
        <div>
            <h3>{{ title }}</h3>
            <p v-if="description">{{ description }}</p>
        </div>
        <div v-if="$slots.actions" class="modern-empty-actions">
            <slot name="actions"/>
        </div>
    </div>
</template>

<script lang="ts" setup>
import type {Component} from "vue";

defineProps<{
    title: string
    description?: string
    icon?: Component
}>()
</script>

