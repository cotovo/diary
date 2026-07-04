<template>
    <PageHeader title="邀请码" subtitle="管理注册入口">
        <NButton v-if="projectStore.isAdminUser" type="primary" size="small" :loading="isGenerating" @click="generateNewInvitationCode">
            <template #icon><Plus :size="16"/></template>
            新建
        </NButton>
    </PageHeader>

    <MenuPanelContainer>
        <div v-if="isLoading" class="invitation-loading">
            <Loading :loading="isLoading"/>
        </div>

        <div v-else-if="invitationList.length > 0" class="invitation-list">
            <article
                v-for="(item, index) in invitationList"
                :key="item.id"
                :class="['invitation-card', {shared: item.is_shared === 1}]"
            >
                <div class="index">{{ index + 1 }}</div>
                <div class="invitation-code-wrapper">
                    <button class="invitation-code" type="button" @click="copyInvitationCode(item.id)">
                        {{ item.id }}
                    </button>
                    <div class="create-time">创建于 {{ item.date_create }}</div>
                </div>
                <NTag :type="item.is_shared === 1 ? 'success' : 'default'" :bordered="false">
                    {{ item.is_shared === 1 ? '已分享' : '未分享' }}
                </NTag>
                <div class="operation-btns" v-if="projectStore.isAdminUser">
                    <NButton
                        v-if="item.is_shared === 0"
                        quaternary
                        circle
                        size="small"
                        aria-label="标记已分享"
                        @click="markAsShared(item.id)"
                    >
                        <template #icon><Check :size="16"/></template>
                    </NButton>
                    <NButton
                        quaternary
                        circle
                        size="small"
                        type="error"
                        aria-label="删除邀请码"
                        @click="deleteInvitationCode(item.id)"
                    >
                        <template #icon><Trash2 :size="16"/></template>
                    </NButton>
                </div>
            </article>
        </div>

        <ModernEmptyState
            v-else
            title="还没有邀请码"
            description="生成邀请码后，新用户可以用它完成注册。"
            :icon="Ticket"
        />
    </MenuPanelContainer>
</template>

<script lang="ts" setup>
import Loading from "@/components/Loading.vue"
import PageHeader from "@/framework/pageHeader/PageHeader.vue"
import invitationApi from "@/api/invitationApi.ts";
import {popMessage, dateFormatter} from "@/utility.ts";
import {useProjectStore} from "@/pinia/useProjectStore.ts";
import {onMounted, ref} from "vue";
import {InvitationEntity} from "./InvitationEntity.ts";
import MenuPanelContainer from "@/framework/MenuPanelContainer.vue";
import ModernEmptyState from "@/components/ui/ModernEmptyState.vue";
import {NButton, NTag, useDialog} from "naive-ui";
import {Check, Plus, Ticket, Trash2} from "@lucide/vue";

const projectStore = useProjectStore()
const dialog = useDialog()

const isLoading = ref(false)
const isGenerating = ref(false)
const invitationList = ref<Array<InvitationEntity>>([])

onMounted(() => {
    isLoading.value = true
    getInvitationList()
})

async function copyInvitationCode(invitationId: string) {
    try {
        await navigator.clipboard.writeText(`邀请码（时效7天）：\n\n${invitationId}`)
        popMessage('success', '邀请码已复制到剪贴板', null, 2)
    } catch {
        popMessage('danger', '复制失败')
    }
}

function getInvitationList() {
    invitationApi
        .list()
        .then(res => {
            isLoading.value = false
            invitationList.value = (res.data || []).map((item: InvitationEntity) => ({
                ...item,
                date_create: dateFormatter(new Date(item.date_create))
            }))
        })
        .catch(() => {
            isLoading.value = false
        })
}

function generateNewInvitationCode() {
    isGenerating.value = true
    invitationApi
        .generate()
        .then(() => {
            popMessage('success', '邀请码已生成')
            getInvitationList()
        })
        .finally(() => {
            isGenerating.value = false
        })
}

function deleteInvitationCode(invitationId: number | string) {
    dialog.warning({
        title: '删除邀请码',
        content: '删除后这个邀请码将无法继续用于注册。',
        positiveText: '删除',
        negativeText: '取消',
        onPositiveClick: () => {
            invitationApi
                .delete({id: invitationId})
                .then(res => {
                    popMessage('success', res.message, null)
                    getInvitationList()
                })
        }
    })
}

function markAsShared(invitationId: number | string) {
    invitationApi
        .markAsShared({
            id: invitationId
        })
        .then(res => {
            popMessage('success', res.message)
            getInvitationList()
        })
}
</script>

<style scoped lang="scss">
.invitation-loading {
    padding: 32px 0;
}

.invitation-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.invitation-card {
    min-width: 0;
    padding: 12px;
    border: 1px solid var(--diary-border);
    border-radius: var(--diary-radius);
    background: var(--diary-surface);
    box-shadow: var(--diary-hairline-shadow);
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;

    &.shared {
        border-color: rgba(52, 199, 89, 0.34);
        background: rgba(52, 199, 89, 0.08);
    }
}

.index {
    width: 36px;
    height: 36px;
    border-radius: var(--diary-radius);
    background: var(--diary-surface-muted);
    color: var(--diary-muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.invitation-code-wrapper {
    min-width: 0;
}

.invitation-code {
    appearance: none;
    max-width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--diary-accent);
    cursor: pointer;
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
}

.create-time {
    margin-top: 2px;
    color: var(--diary-muted);
    font-size: 12px;
    line-height: 1.35;
}

.operation-btns {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
    gap: 4px;
}

@media (max-width: 760px) {
    .invitation-list {
        grid-template-columns: 1fr;
    }
}
</style>
