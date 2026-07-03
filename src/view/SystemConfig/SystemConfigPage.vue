<template>
    <ModernPage
        eyebrow="Single user diary"
        title="系统设置"
        description="管理私人日记的登录安全、天气服务和本地文件数据。所有内容仍保存在服务器磁盘，便于备份和迁移。"
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
                    <h2>账号安全</h2>
                    <p>单人系统只保留管理员口令，不开放注册、邀请码和演示账号。</p>
                </div>
                <div class="modern-panel-body settings-actions">
                    <NAlert type="info" :bordered="false">
                        当前版本使用服务端密码哈希与 Cookie session。公网部署前请确认 `.env` 中已设置强密码哈希和 `SESSION_SECRET`。
                    </NAlert>
                    <NButton type="primary" secondary @click="goToChangePassword">
                        <template #icon><KeyRound :size="18"/></template>
                        修改登录密码
                    </NButton>
                </div>
            </section>

            <section class="modern-panel">
                <div class="modern-panel-header">
                    <h2>天气服务</h2>
                    <p>配置和风天气后，新建今天的日记时可以自动带入室外天气和温度。</p>
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
                                        placeholder="可留空"
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
                    <p>日记以 Markdown 文件保存，索引用 JSON 维护。这里可以检查数据状态、手动备份和完整导出。</p>
                </div>
                <div class="modern-panel-body">
                    <NSpin :show="isStorageLoading">
                        <div v-if="storageStatus" class="storage-stack">
                            <div class="metric-grid">
                                <MetricTile label="日记数量" :value="storageStatus.diaryCount"/>
                                <MetricTile label="Markdown 文件" :value="storageStatus.markdownFileCount"/>
                                <MetricTile label="备份数量" :value="storageStatus.backupCount"/>
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
                                    完整导出 JSON
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
    useMessage
} from "naive-ui"
import {Archive, Database, Download, KeyRound, RefreshCw} from "@lucide/vue"

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
const projectStore = useProjectStore()
const systemConfigStore = useSystemConfigStore()

const isLoading = ref(true)
const isSaving = ref(false)
const isStorageLoading = ref(true)
const isBackingUp = ref(false)
const isExporting = ref(false)
const storageStatus = ref<DiaryStorageStatus | null>(null)

const form = reactive<AdminSystemConfig>({
    ...DEFAULT_ADMIN_SYSTEM_CONFIG
})

const isFormValid = computed(() => true)

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
        const res = await systemConfigApi.getAdmin()
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

function goToChangePassword() {
    router.push({name: 'ChangePassword'})
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
