<template>
    <article class="file-list-item">
        <div class="file-index">{{ props.fileInfo.id }}</div>

        <div class="file-info">
            <div class="name">{{ props.fileInfo.description || props.fileInfo.name_original }}</div>
            <div class="description">{{ props.fileInfo.name_original }}</div>
            <div class="file-meta-line">
                <span>{{ (props.fileInfo.size / 1024).toFixed(0) }} KB</span>
                <span>{{ props.fileInfo.type }}</span>
                <span>{{ props.fileInfo.date_time }}</span>
            </div>
        </div>

        <div class="file-actions">
            <NButton quaternary circle size="small" aria-label="打开文件" @click="openFileInNewTab">
                <template #icon><ExternalLink :size="16"/></template>
            </NButton>
            <NButton quaternary circle size="small" aria-label="重命名文件" @click="openRenameModal">
                <template #icon><Pencil :size="16"/></template>
            </NButton>
            <NButton quaternary circle size="small" aria-label="复制文件地址" @click="copyFilePath">
                <template #icon><Copy :size="16"/></template>
            </NButton>
            <NButton quaternary circle size="small" type="error" aria-label="删除文件" @click="deleteFile">
                <template #icon><Trash2 :size="16"/></template>
            </NButton>
        </div>

        <NModal v-model:show="modalEditFileName" preset="card" title="重命名文件" class="file-modal">
            <NForm label-placement="top" @submit.prevent="modifyFileNameConfirm">
                <NFormItem label="当前名称">
                    <NInput :value="props.fileInfo.description" readonly/>
                </NFormItem>
                <NFormItem label="新名称">
                    <NInput v-model:value="newFileName" placeholder="输入新的文件名称"/>
                </NFormItem>
                <div class="modal-actions">
                    <NButton @click="modalEditFileName = false">取消</NButton>
                    <NButton type="primary" @click="modifyFileNameConfirm">保存</NButton>
                </div>
            </NForm>
        </NModal>
    </article>
</template>

<script lang="ts" setup>
import fileManagerApi from "@/api/fileManagerApi";
import {popMessage} from "@/utility.ts";
import {computed, ref} from "vue";
import {EntityFile} from "@/view/FileManager/File.ts";
import {NButton, NForm, NFormItem, NInput, NModal, useDialog} from "naive-ui";
import {Copy, ExternalLink, Pencil, Trash2} from "@lucide/vue";

const props = defineProps<{
    fileInfo: EntityFile
}>()

const emit = defineEmits(['refreshList'])
const dialog = useDialog()

const filePath = computed(() => {
    return `http://kylebing.cn/${props.fileInfo.path}`
})

const modalEditFileName = ref(false)
const newFileName = ref('')

function openFileInNewTab() {
    window.open(filePath.value, '_blank')
}

async function copyFilePath() {
    try {
        await navigator.clipboard.writeText(filePath.value)
        popMessage('success', '文件地址已复制到剪贴板')
    } catch {
        popMessage('danger', '复制失败')
    }
}

function openRenameModal() {
    newFileName.value = props.fileInfo.description || props.fileInfo.name_original
    modalEditFileName.value = true
}

function deleteFile() {
    dialog.warning({
        title: '删除文件',
        content: `确定删除“${props.fileInfo.description || props.fileInfo.name_original}”吗？`,
        positiveText: '删除',
        negativeText: '取消',
        onPositiveClick: () => {
            fileManagerApi
                .delete({
                    fileId: props.fileInfo.id
                })
                .then(res => {
                    popMessage('success', res.message)
                    emit('refreshList')
                })
                .catch(err => {
                    popMessage('danger', err.message)
                })
        }
    })
}

function modifyFileNameConfirm() {
    const description = newFileName.value.trim()
    if (!description) {
        popMessage('warning', '文件名未填写')
        return
    }
    fileManagerApi
        .modifyFileName({
            fileId: props.fileInfo.id,
            description
        })
        .then(res => {
            popMessage('success', res.message)
            modalEditFileName.value = false
            emit('refreshList')
        })
        .catch(err => {
            popMessage('danger', err.message)
        })
}
</script>

<style scoped lang="scss">
@use "./file-list-item" as *;
</style>
