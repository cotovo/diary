<template>
    <footer class="user-profile">
        <div class="profile-main">
            <div class="avatar">
                <img
                    v-if="userInfo?.avatar"
                    :src="userInfo.avatar"
                    alt="用户头像"
                >
                <img v-else :src="SVG_ICONS.logo_icons.logo_avatar" alt="默认头像">
            </div>
            <div class="user-info">
                <div class="username">{{ userInfo?.nickname || '日记主人' }}</div>
                <div class="email">{{ userInfo?.email || '本地账号' }}</div>
            </div>
        </div>

        <div v-if="statisticStore.statisticsCategory.amount > 0" class="statistics">
            <span v-if="userInfo?.city">{{ userInfo.city }}</span>
            <span>总计 {{ statisticStore.statisticsCategory.amount }} 篇</span>
        </div>

        <div class="profile-actions">
            <NButton size="small" tertiary type="error" @click="logout">退出</NButton>
            <span class="version">v{{ packageInfo.version }}</span>
        </div>
    </footer>
</template>

<script lang="ts" setup>
import {computed} from "vue";
import {deleteAuthorization, getAuthorization} from "@/utility.ts";
import userApi from "@/api/userApi.ts";
import {storeToRefs} from "pinia";
import SVG_ICONS from "@/assets/icons/SVG_ICONS.ts";
import {useRouter} from "vue-router";
import packageInfo from "../../../package.json";
import {useStatisticStore} from "@/pinia/useStatisticStore.ts";
import {useProjectStore} from "@/pinia/useProjectStore.ts";
import {NButton} from "naive-ui";

const statisticStore = useStatisticStore()
const projectStore = useProjectStore()
const {authRevision} = storeToRefs(projectStore)
const router = useRouter()

const userInfo = computed(() => {
    void authRevision.value
    return getAuthorization()
})

function logout() {
    userApi.logout().finally(() => {
        deleteAuthorization()
        statisticStore.removeCategoryAllFromLocalStorage()
        projectStore.isMenuShowed = false
        router.push({name: 'Login'})
    })
}
</script>

<style scoped lang="scss">
.user-profile {
    margin-top: auto;
    padding: 12px;
    border: 1px solid var(--diary-border);
    border-radius: var(--diary-radius);
    background: var(--diary-surface);
    box-shadow: var(--diary-hairline-shadow);
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.profile-main {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    gap: 10px;
    align-items: center;
}

.avatar {
    width: 44px;
    height: 44px;
    border-radius: var(--diary-radius);
    overflow: hidden;
    border: 1px solid var(--diary-border);
    background: var(--diary-surface-muted);

    img {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
    }
}

.user-info {
    min-width: 0;
}

.username {
    color: var(--diary-ink);
    font-size: 15px;
    font-weight: 700;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.email,
.statistics,
.version {
    color: var(--diary-muted);
    font-size: 12px;
    line-height: 1.4;
}

.email {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.statistics {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
}

.profile-actions {
    display: flex;
    align-items: center;
    gap: 8px;

    .version {
        margin-left: auto;
    }
}
</style>
