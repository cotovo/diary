<template>
    <PageHeader title="文件列表" subtitle="上传和管理日记附件">
        <NButton type="primary" size="small" @click="showModalUpload">
            <template #icon><Upload :size="16"/></template>
            上传
        </NButton>
    </PageHeader>

    <MenuPanelContainer>
        <div v-if="isLoading" class="file-loading">
            <Loading :loading="isLoading"/>
        </div>
        <div v-else-if="fileListData.length > 0" class="file-list">
            <FileListItem
                v-for="file in fileListData"
                :key="file.id"
                :fileInfo="file"
                @refresh-list="getFileList"
            />
        </div>
        <ModernEmptyState
            v-else
            title="还没有文件"
            description="上传常用附件后，可以在这里复制地址或重新命名。"
            :icon="FolderOpen"
        />
    </MenuPanelContainer>

    <NModal v-model:show="modalUpload" preset="card" title="上传文件" class="file-modal">
        <NForm label-placement="top" @submit.prevent="uploadFile">
            <NFormItem label="文件名称">
                <NInput v-model:value="formUpload.name" placeholder="给文件起一个容易识别的名字"/>
            </NFormItem>
            <NFormItem label="文件">
                <FileSelector @fileChange="handleFileChange"/>
            </NFormItem>
            <div class="modal-actions">
                <NButton @click="modalUpload = false">取消</NButton>
                <NButton type="primary" :loading="isUploading" @click="uploadFile">上传</NButton>
            </div>
        </NForm>
    </NModal>
</template>

<script lang="ts" setup>
import Loading from "@/components/Loading.vue"
import fileManagerApi from "@/api/fileManagerApi.ts";
import FileListItem from "./FileListItem.vue";
import FileSelector from "@/components/FileSelector.vue";
import ModernEmptyState from "@/components/ui/ModernEmptyState.vue";
import {popMessage, dateFormatter} from "@/utility.ts";
import {onMounted, ref} from "vue";
import MenuPanelContainer from "@/framework/MenuPanelContainer.vue";
import PageHeader from "@/framework/pageHeader/PageHeader.vue"
import {NButton, NForm, NFormItem, NInput, NModal} from "naive-ui";
import {FolderOpen, Upload} from "@lucide/vue";
import type {EntityFile} from "@/view/FileManager/File.ts";

const isLoading = ref(false)
const isUploading = ref(false)
const fileListData = ref<EntityFile[]>([])
const pager = ref({
    pageSize: 300,
    pageNo: 1,
    total: 0
})

const modalUpload = ref(false)
const formUpload = ref<{
    name: string
    file: File | null
}>({
    name: '',
    file: null
})

onMounted(() => {
    getFileList()
})

function handleFileChange(file: File) {
    formUpload.value.file = file
    if (!formUpload.value.name) {
        formUpload.value.name = file.name
    }
}

function showModalUpload() {
    modalUpload.value = true
}

function uploadFile() {
    if (!formUpload.value.name) {
        popMessage('warning', '文件名未填写')
        return
    }
    if (!formUpload.value.file) {
        popMessage('warning', '未选择任何文件')
        return
    }
    const requestData = new FormData()
    requestData.append('file', formUpload.value.file)
    requestData.append('note', formUpload.value.name)
    isUploading.value = true
    fileManagerApi
        .upload(requestData)
        .then(() => {
            popMessage('success', '上传成功')
            getFileList()
            formUpload.value = {
                file: null,
                name: ''
            }
            modalUpload.value = false
        })
        .catch(err => {
            popMessage('danger', err.message)
        })
        .finally(() => {
            isUploading.value = false
        })
}

function getFileList() {
    isLoading.value = true
    const params = {
        pageNo: pager.value.pageNo,
        pageSize: pager.value.pageSize
    }
    fileManagerApi
        .list(params)
        .then(res => {
            fileListData.value = res.data.map((item: EntityFile) => ({
                ...item,
                date_time: dateFormatter(new Date(item.date_create))
            }))
            isLoading.value = false
        })
        .catch(() => {
            isLoading.value = false
        })
}
</script>

<style scoped lang="scss">
.file-loading {
    padding: 32px 0;
}

.file-list {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    align-content: flex-start;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

:global(.file-modal) {
    width: min(520px, calc(100vw - 32px));
}

@media (max-width: 760px) {
    .file-list {
        grid-template-columns: 1fr;
    }
}
</style>
