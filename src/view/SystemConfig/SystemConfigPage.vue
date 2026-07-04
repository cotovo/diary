<template>
    <ModernPage
        eyebrow="Diary"
        title="系统设置"
        description="管理登录、天气、备份和日记文件。"
    >
        <template #actions>
            <NButton @click="router.go(-1)">返回</NButton>
            <NButton type="primary" :loading="isSaving" :disabled="!isFormValid" @click="saveConfig">
                保存设置
            </NButton>
        </template>

        <div class="modern-grid">
            <section class="modern-panel">
                <div class="modern-panel-header">
                    <h2>天气服务</h2>
                    <p>可选。留空时使用免费的 Open-Meteo 服务。</p>
                </div>
                <div class="modern-panel-body">
                    <NSpin :show="isLoading">
                        <NForm label-placement="top" :show-feedback="false">
                            <NGrid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
                                <NFormItemGi label="和风天气 API Key">
                                    <NInput
                                        v-model:value="form.hefeng_weather_api_key"
                                        type="password"
                                        show-password-on="click"
                                        placeholder="可留空，自动使用免费天气"
                                    />
                                </NFormItemGi>
                                <NFormItemGi label="和风天气 Host">
                                    <NInput
                                        v-model:value="form.hefeng_weather_api_host"
                                        placeholder="例如 devapi.qweather.com"
                                    />
                                </NFormItemGi>
                            </NGrid>
                        </NForm>
                    </NSpin>
                </div>
            </section>

            <section class="modern-panel">
                <div class="modern-panel-header">
                    <h2>数据与备份</h2>
                    <p>查看日记文件状态，手动备份或导出。</p>
                </div>
                <div class="modern-panel-body">
                    <NSpin :show="isStorageLoading">
                        <div v-if="storageStatus" class="storage-stack">
                            <div class="metric-grid">
                                <MetricTile label="日记数量" :value="storageStatus.diaryCount"/>
                                <MetricTile label="Markdown 文件" :value="storageStatus.markdownFileCount"/>
                                <MetricTile label="备份数量" :value="storageStatus.backupCount"/>
                                <MetricTile label="回收站" :value="storageStatus.trashCount"/>
                                <MetricTile
                                    label="索引状态"
                                    :value="storageStatus.indexHealthy ? '正常' : '异常'"
                                    :caption="storageStatus.indexHealthy ? '索引中的文件都能找到' : `${storageStatus.missingFiles.length} 个文件缺失`"
                                />
                            </div>

                            <NDescriptions label-placement="left" :column="1" size="small" bordered>
                                <NDescriptionsItem label="数据目录">{{ storageStatus.dataDir }}</NDescriptionsItem>
                                <NDescriptionsItem label="索引文件">{{ storageStatus.indexPath }}</NDescriptionsItem>
                                <NDescriptionsItem label="备份目录">{{ storageStatus.backupsDir }}</NDescriptionsItem>
                                <NDescriptionsItem label="回收站目录">{{ storageStatus.trashDir }}</NDescriptionsItem>
                                <NDescriptionsItem label="最新备份">
                                    {{ storageStatus.latestBackup || '暂无备份' }}
                                </NDescriptionsItem>
                            </NDescriptions>

                            <NAlert v-if="!storageStatus.indexHealthy" type="warning" :bordered="false">
                                索引中存在找不到的 Markdown 文件，请先导出数据并检查服务器数据目录。
                            </NAlert>

                            <div class="settings-actions">
                                <NButton :loading="isBackingUp" @click="createBackup">
                                    <template #icon><Archive :size="18"/></template>
                                    手动备份
                                </NButton>
                                <NButton type="primary" secondary :loading="isExporting" @click="exportFullDiary">
                                    <template #icon><Download :size="18"/></template>
                                    导出日记
                                </NButton>
                                <NButton quaternary @click="loadStorageStatus">
                                    <template #icon><RefreshCw :size="18"/></template>
                                    刷新状态
                                </NButton>
                            </div>
                        </div>

                        <ModernEmptyState
                            v-else
                            title="还没有读取到数据状态"
                            description="点击刷新状态，检查当前服务器上的日记文件和备份。"
                            :icon="Database"
                        >
                            <template #actions>
                                <NButton type="primary" @click="loadStorageStatus">刷新状态</NButton>
                            </template>
                        </ModernEmptyState>
                    </NSpin>
                </div>
            </section>

            <section class="modern-panel">
                <div class="modern-panel-header">
                    <h2>智能维护</h2>
                    <p>恢复误删日记，修复索引和文件不一致。</p>
                </div>
                <div class="modern-panel-body storage-stack">
                    <NAlert type="success" :bordered="false">
                        删除日记现在会先创建完整备份，再移入回收站；重建索引前也会自动备份当前状态。
                    </NAlert>
                    <NAlert v-if="storageStatus && storageStatus.missingFiles.length > 0" type="warning" :bordered="false">
                        检测到 {{ storageStatus.missingFiles.length }} 个索引缺失文件，可先完整导出，再执行索引重建。
                    </NAlert>
                    <div class="settings-actions">
                        <NButton :loading="isRebuilding" @click="previewRebuildIndex">
                            <template #icon><ScanSearch :size="18"/></template>
                            索引预检
                        </NButton>
                        <NButton type="warning" secondary :loading="isRebuilding" @click="confirmRebuildIndex">
                            <template #icon><Wrench :size="18"/></template>
                            重建索引
                        </NButton>
                        <NButton :loading="isLoadingTrash" @click="loadTrash">
                            <template #icon><Trash2 :size="18"/></template>
                            查看回收站
                        </NButton>
                        <NButton
                            type="primary"
                            secondary
                            :disabled="trashFiles.length === 0"
                            :loading="isRestoring"
                            @click="confirmRestoreLatest"
                        >
                            <template #icon><RotateCcw :size="18"/></template>
                            恢复最近删除
                        </NButton>
                    </div>
                    <NDataTable
                        v-if="trashFiles.length"
                        size="small"
                        :columns="trashColumns"
                        :data="trashRows"
                        :pagination="{pageSize: 5}"
                    />
                </div>
            </section>

        </div>
    </ModernPage>
</template>

<script lang="ts" setup>
import {computed, onBeforeMount, onMounted, reactive, ref} from "vue"
import {useRouter} from "vue-router"
import {
    NAlert,
    NButton,
    NDescriptions,
    NDescriptionsItem,
    NForm,
    NFormItemGi,
    NGrid,
    NInput,
    NSpin,
    NDataTable,
    useDialog,
    useMessage
} from "naive-ui"
import {Archive, Database, Download, RefreshCw, RotateCcw, ScanSearch, Trash2, Wrench} from "@lucide/vue"

import diaryApi, {DiaryStorageStatus} from "@/api/diaryApi"
import systemConfigApi from "@/api/systemConfigApi"
import ModernEmptyState from "@/components/ui/ModernEmptyState.vue"
import ModernPage from "@/components/ui/ModernPage.vue"
import MetricTile from "@/components/ui/MetricTile.vue"
import {AdminSystemConfig, DEFAULT_ADMIN_SYSTEM_CONFIG} from "@/entity/SystemConfig"
import {useProjectStore} from "@/pinia/useProjectStore"
import {useSystemConfigStore} from "@/pinia/useSystemConfigStore"
import {dateFormatter} from "@/utility"

const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const projectStore = useProjectStore()
const systemConfigStore = useSystemConfigStore()

const isLoading = ref(true)
const isSaving = ref(false)
const isStorageLoading = ref(true)
const isBackingUp = ref(false)
const isExporting = ref(false)
const isRebuilding = ref(false)
const isLoadingTrash = ref(false)
const isRestoring = ref(false)
const storageStatus = ref<DiaryStorageStatus | null>(null)
const trashFiles = ref<string[]>([])

const form = reactive<AdminSystemConfig>({
    ...DEFAULT_ADMIN_SYSTEM_CONFIG
})

const isFormValid = computed(() => true)
const trashRows = computed(() => trashFiles.value.map((fileName, index) => ({index: index + 1, fileName})))
const trashColumns = [
    {title: '#', key: 'index', width: 60},
    {title: '回收站文件', key: 'fileName'},
]

onBeforeMount(() => {
    if (!projectStore.isAdminUser) {
        router.replace({name: 'Index'})
    }
})

onMounted(async () => {
    if (!projectStore.isAdminUser) return
    document.title = '日记 - 系统设置'
    await Promise.all([loadConfig(), loadStorageStatus()])
})

async function loadConfig() {
    isLoading.value = true
    try {
        const res = await systemConfigApi.get()
        Object.assign(form, res.data)
        systemConfigStore.APPLY_CONFIG(res.data)
    } catch (err: any) {
        message.error(err?.message || '读取系统设置失败')
    } finally {
        isLoading.value = false
    }
}

async function loadStorageStatus() {
    isStorageLoading.value = true
    try {
        const res = await diaryApi.storageStatus()
        storageStatus.value = res.data
    } catch (err: any) {
        message.error(err?.message || '读取数据状态失败')
    } finally {
        isStorageLoading.value = false
    }
}

async function saveConfig() {
    if (!isFormValid.value || isSaving.value) return

    isSaving.value = true
    try {
        const res = await systemConfigApi.save({...form})
        Object.assign(form, res.data)
        systemConfigStore.APPLY_CONFIG(res.data)
        message.success(res.message || '设置已保存')
    } catch (err: any) {
        message.error(err?.message || '保存系统设置失败')
    } finally {
        isSaving.value = false
    }
}

async function createBackup() {
    isBackingUp.value = true
    try {
        const res = await diaryApi.backup()
        storageStatus.value = res.data.status
        message.success(res.message || '备份已创建')
    } catch (err: any) {
        message.error(err?.message || '备份失败')
    } finally {
        isBackingUp.value = false
    }
}

async function previewRebuildIndex() {
    isRebuilding.value = true
    try {
        const res = await diaryApi.rebuildIndex(true)
        message.info(`预检完成：可从 Markdown 文件重建 ${res.data.entryCount} 条日记`)
    } catch (err: any) {
        message.error(err?.message || '索引预检失败')
    } finally {
        isRebuilding.value = false
    }
}

function confirmRebuildIndex() {
    dialog.warning({
        title: '重建索引',
        content: '系统会先创建完整备份，再按 Markdown 文件重新生成 index.json。确定继续吗？',
        positiveText: '重建索引',
        negativeText: '取消',
        onPositiveClick: rebuildIndex,
    })
}

async function rebuildIndex() {
    isRebuilding.value = true
    try {
        const res = await diaryApi.rebuildIndex(false)
        storageStatus.value = res.data.status
        message.success(`索引已重建：${res.data.entryCount} 条日记`)
    } catch (err: any) {
        message.error(err?.message || '索引重建失败')
    } finally {
        isRebuilding.value = false
    }
}

async function loadTrash() {
    isLoadingTrash.value = true
    try {
        const res = await diaryApi.trash()
        trashFiles.value = res.data
        message.success(res.data.length ? `回收站有 ${res.data.length} 条记录` : '回收站为空')
    } catch (err: any) {
        message.error(err?.message || '读取回收站失败')
    } finally {
        isLoadingTrash.value = false
    }
}

function confirmRestoreLatest() {
    const fileName = trashFiles.value[0]
    if (!fileName) return
    dialog.info({
        title: '恢复最近删除',
        content: `将恢复 ${fileName}，恢复前会自动备份当前状态。`,
        positiveText: '恢复',
        negativeText: '取消',
        onPositiveClick: () => restoreTrash(fileName),
    })
}

async function restoreTrash(fileName: string) {
    isRestoring.value = true
    try {
        const res = await diaryApi.restoreTrash(fileName)
        storageStatus.value = res.data.status
        await loadTrash()
        message.success(res.message || '日记已恢复')
    } catch (err: any) {
        message.error(err?.message || '恢复失败')
    } finally {
        isRestoring.value = false
    }
}

async function exportFullDiary() {
    isExporting.value = true
    try {
        const res = await diaryApi.exportFull({
            keywords: JSON.stringify([]),
            pageNo: 1,
            pageSize: 100000,
            categories: JSON.stringify([]),
            filterShared: 0,
        })
        const fileName = `日记完整导出-${dateFormatter(new Date(), 'yyyy-MM-dd_hhmmss')}.json`
        downloadFile(fileName, JSON.stringify(res.data, null, 2))
        message.success('完整导出已生成')
    } catch (err: any) {
        message.error(err?.message || '完整导出失败')
    } finally {
        isExporting.value = false
    }
}

function downloadFile(fileName: string, data: string) {
    const link = document.createElement('a')
    const blob = new Blob([data], {type: 'application/json;charset=utf-8'})
    link.download = fileName
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
}
</script>

<style scoped lang="scss">
.settings-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.storage-stack {
    display: grid;
    gap: 16px;
}
</style>
