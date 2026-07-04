<template>
    <NConfigProvider :theme-overrides="themeOverrides">
        <NDialogProvider>
            <NMessageProvider placement="top-right">
                <NNotificationProvider placement="bottom-right">
                    <ServerError v-if="isServerError"/>
                    <RouterView v-else-if="isAppReady"/>
                </NNotificationProvider>
            </NMessageProvider>
        </NDialogProvider>
    </NConfigProvider>
</template>
<script lang="ts" setup>
import {useProjectStore} from "./pinia/useProjectStore.ts";
const projectStore = useProjectStore()
import {onBeforeMount, onMounted, ref, watch} from "vue";
import {useRoute, useRouter} from "vue-router";
import {useStatisticStore} from "./pinia/useStatisticStore.ts";
import {useSystemConfigStore} from "./pinia/useSystemConfigStore.ts";
import {
    NConfigProvider,
    NDialogProvider,
    NMessageProvider,
    NNotificationProvider,
    type GlobalThemeOverrides
} from "naive-ui";

const route = useRoute()
const router = useRouter()
const statisticStore = useStatisticStore()
const systemConfigStore = useSystemConfigStore()


// Server Error
import ServerError from "./components/ServerError.vue";
const isServerError = ref(false)
const isAppReady = ref(false)
const themeOverrides: GlobalThemeOverrides = {
    common: {
        primaryColor: '#007AFF',
        primaryColorHover: '#1C86FF',
        primaryColorPressed: '#0062CC',
        primaryColorSuppl: '#5AC8FA',
        successColor: '#34C759',
        warningColor: '#FF9F0A',
        errorColor: '#FF3B30',
        textColorBase: '#1D1D1F',
        bodyColor: '#F5F5F7',
        borderRadius: '8px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", "Microsoft YaHei", sans-serif',
    },
    Button: {
        borderRadiusMedium: '8px',
        borderRadiusLarge: '8px',
    },
    Card: {
        borderRadius: '8px',
    },
    Input: {
        borderRadius: '8px',
    },
    Dialog: {
        borderRadius: '8px',
    }
}

onBeforeMount(() => {
    // 获取当前颜色模式
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        projectStore.colorMode=  'dark'
    } else {
        projectStore.colorMode=  'light'
    }

    // 颜色模式监听
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
        projectStore.colorMode = event.matches ? "dark" : "light"
    })
})


onMounted(()=> {
    projectStore.cacheDiary = undefined         // 每次刷新页面，清空缓存日记内容
    projectStore.cacheDiaryOrigin = undefined   // 每次刷新页面，清空缓存日记内容

    // 从本地配置文件中载入配置
    projectStore.INIT_PROJECT_CONFIG()

    afterBackendReady()
    watch([isServerError, isAppReady], hidePreloadingWhenReady, {immediate: true})

    window.addEventListener('resize', () => {
        projectStore.insets = {
            windowsHeight: document.documentElement.clientHeight,
            windowsWidth: document.documentElement.clientWidth,
            heightPanel: document.documentElement.clientHeight - 45, // 除 navbar 的高度
        }
        if (projectStore.isInMobileMode){

        } else {
            if (route.name === 'List'){
                router.push({
                    name: 'EditNew'
                })
            }
        }
    })
})

async function afterBackendReady() {
    isAppReady.value = false
    try {
        // 类别是后续页面与统计依赖的基础数据，后端连通后优先拉取
        await statisticStore.getCategoryAll()
        await systemConfigStore.fetchConfig(true).catch(() => {})
    } catch {
        isServerError.value = true
    } finally {
        // 避免因单个初始化步骤异常导致页面永久停在 loading
        if (!isServerError.value) {
            isAppReady.value = true
        }
    }
}

function hidePreloadingWhenReady() {
    // 使用 index.html 的 preloading，等待可渲染状态后再隐藏
    if (!isServerError.value && !isAppReady.value) {
        return
    }
    const preloading = document.querySelector('.preloading') as HTMLDivElement | null
    if (preloading) {
        preloading.style.display = 'none'
    }
}


</script>

<style lang="scss">
@use "scss/diary";
</style>

