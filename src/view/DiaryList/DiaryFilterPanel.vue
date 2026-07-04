<template>
    <div class="diary-filter-panel">
        <NInput
            :value="keyword"
            clearable
            placeholder="搜索标题或正文"
            @update:value="value => emit('update:keyword', value)"
            @keyup.enter="emit('search')"
        >
            <template #prefix><Search :size="17"/></template>
        </NInput>

        <div class="filter-row">
            <NButton
                size="small"
                :type="isTodoActive ? 'primary' : 'default'"
                secondary
                @click="emit('toggleTodo')"
            >
                <template #icon><ListTodo :size="16"/></template>
                待办
            </NButton>
            <NButton
                v-if="hasActiveFilters"
                size="small"
                quaternary
                @click="emit('clear')"
            >
                <template #icon><X :size="16"/></template>
                清空
            </NButton>
        </div>

        <div v-if="summaryItems.length" class="filter-summary">
            <NTag
                v-for="item in summaryItems"
                :key="item"
                size="small"
                round
                :bordered="false"
            >
                {{ item }}
            </NTag>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {computed} from "vue"
import {NButton, NInput, NTag} from "naive-ui"
import {ListTodo, Search, X} from "@lucide/vue"

const props = defineProps<{
    keyword: string
    categories: string[]
    categoryLabelMap: Record<string, string>
    dateRangeLabel: string
    hasActiveFilters: boolean
}>()

const emit = defineEmits<{
    'update:keyword': [value: string]
    search: []
    clear: []
    toggleTodo: []
}>()

const isTodoActive = computed(() =>
    props.categories.length === 1 && props.categories[0] === 'todo'
)

const summaryItems = computed(() => {
    const items: string[] = []
    if (props.keyword.trim()) items.push(`关键词：${props.keyword.trim()}`)
    if (props.categories.length) {
        items.push(...props.categories.map(item => props.categoryLabelMap[item] || item))
    }
    if (props.dateRangeLabel) items.push(props.dateRangeLabel)
    return items
})
</script>
