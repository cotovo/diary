<template>
    <div class="page-header">
        <NButton class="page-back-btn" quaternary circle aria-label="返回" @click="router.back()">
            <template #icon><X :size="19"/></template>
        </NButton>
        <div class="page-heading">
            <div class="page-title">{{ title }}</div>
            <div class="page-subtitle" v-if="subtitle">{{ subtitle }}</div>
        </div>
        <div class="page-actions">
            <slot/>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {useRouter} from "vue-router";
import {NButton} from "naive-ui";
import {X} from "@lucide/vue";
const router = useRouter()

withDefaults(defineProps<{
    title: string,
    subtitle?: string
}>(), {
    title: "标题"
})
</script>

<style lang="scss" scoped>
@use "page-header" as *;
</style>


