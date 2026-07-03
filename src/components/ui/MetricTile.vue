<template>
    <div class="metric-tile">
        <div class="metric-tile-label">{{ label }}</div>
        <div class="metric-tile-value">{{ value }}</div>
        <div v-if="caption" class="metric-tile-caption">{{ caption }}</div>
    </div>
</template>

<script lang="ts" setup>
defineProps<{
    label: string
    value: string | number
    caption?: string
}>()
</script>

