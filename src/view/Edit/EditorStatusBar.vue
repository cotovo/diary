<template>
    <div class="editor-status-bar modern-editor-status-bar">
        <div class="status-group">
            <NTag size="small" :bordered="false">{{ wordCount }} 字</NTag>
            <NTag size="small" :bordered="false">{{ lineCount }} 行</NTag>
            <NTag
                size="small"
                :type="hasChanged ? 'warning' : 'success'"
                :bordered="false"
            >
                {{ hasChanged ? '未保存' : '已保存' }}
            </NTag>
            <NTag v-if="lastSavedAtLabel" size="small" :bordered="false">
                保存 {{ lastSavedAtLabel }}
            </NTag>
            <NTag v-if="draftSavedAtLabel" size="small" type="info" :bordered="false">
                草稿 {{ draftSavedAtLabel }}
            </NTag>
        </div>
        <NButton
            v-if="hasLocalDraft"
            size="small"
            secondary
            type="primary"
            @click="$emit('restoreDraft')"
        >
            <template #icon><History :size="15"/></template>
            恢复草稿
        </NButton>
    </div>
</template>

<script lang="ts" setup>
import {NButton, NTag} from "naive-ui"
import {History} from "@lucide/vue"

defineProps<{
    wordCount: number
    lineCount: number
    hasChanged: boolean
    hasLocalDraft: boolean
    draftSavedAtLabel: string
    lastSavedAtLabel: string
}>()

defineEmits<{
    restoreDraft: []
}>()
</script>

