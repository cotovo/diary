<template>
    <div class="file-selector">
        <input ref="input" type="file" id="uploader" accept="*/*" @change="handleFiles">
        <label class="file-dropzone" for="uploader">
            <UploadCloud :size="24"/>
            <span class="file-name">{{ currentFile?.name || '选择文件' }}</span>
            <span class="file-hint">单个文件不超过 20MB</span>
        </label>
    </div>
</template>

<script lang="ts" setup>
import {ref} from "vue";
import {popMessage} from "../utility.ts";
import {UploadCloud} from "@lucide/vue";

const emit = defineEmits(['fileChange'])
const currentFile = ref<File | null>(null)
const MAX_FILE_SIZE = 20 * 1024 * 1024

function handleFiles(event: Event) {
    const target = event.target as HTMLInputElement
    const files = target.files
    if (!files || files.length === 0) return

    const file = files[0]
    if (file.size > MAX_FILE_SIZE) {
        popMessage('warning', '请选择小于 20MB 的文件')
        target.value = ''
        return
    }

    currentFile.value = file
    emit('fileChange', file)
}
</script>

<style lang="scss" scoped>
.file-selector {
    width: 100%;

    input {
        display: none;
    }
}

.file-dropzone {
    min-height: 132px;
    width: 100%;
    padding: 18px;
    border: 1px dashed var(--diary-border-strong);
    border-radius: var(--diary-radius);
    background: var(--diary-surface-muted);
    color: var(--diary-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    text-align: center;
    cursor: pointer;
    transition:
        border-color var(--diary-transition),
        background-color var(--diary-transition),
        color var(--diary-transition);

    &:hover {
        border-color: var(--diary-accent);
        background: rgba(0, 122, 255, 0.08);
        color: var(--diary-accent);
    }
}

.file-name {
    max-width: 100%;
    color: var(--diary-ink);
    font-size: 14px;
    font-weight: 650;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.file-hint {
    font-size: 12px;
    line-height: 1.35;
}
</style>
