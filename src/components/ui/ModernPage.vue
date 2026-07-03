<template>
    <main class="modern-page">
        <header class="modern-page-header">
            <div>
                <p v-if="eyebrow" class="modern-page-eyebrow">{{ eyebrow }}</p>
                <h1>{{ title }}</h1>
                <p v-if="description" class="modern-page-description">{{ description }}</p>
            </div>
            <div v-if="$slots.actions" class="modern-page-actions">
                <slot name="actions"/>
            </div>
        </header>
        <section class="modern-page-content">
            <slot/>
        </section>
    </main>
</template>

<script lang="ts" setup>
defineProps<{
    title: string
    description?: string
    eyebrow?: string
}>()
</script>

