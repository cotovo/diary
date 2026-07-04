<template>
    <div class="navbar-container">
        <nav class="navbar modern-navbar" id="navbar">
            <div class="nav-part-left">
                <NButton
                    v-if="showMenuOpen"
                    quaternary
                    circle
                    class="nav-icon-button nav-logo-button"
                    title="打开导航"
                    aria-label="打开导航"
                    @click="menuShow"
                >
                    <template #icon>
                        <img
                            v-if="!projectStore.isInMobileMode"
                            class="nav-logo-image"
                            :src="SVG_ICONS.logo_icons.logo"
                            alt=""
                        >
                        <Menu v-else :size="20"/>
                    </template>
                </NButton>

                <NButton
                    v-if="projectStore.isMenuShowed"
                    quaternary
                    circle
                    class="nav-icon-button"
                    title="关闭导航"
                    aria-label="关闭导航"
                    @click="menuClose"
                >
                    <template #icon><X :size="20"/></template>
                </NButton>

                <NButton
                    v-if="projectStore.isInMobileMode && !isListLikeRoute"
                    quaternary
                    circle
                    class="nav-icon-button"
                    title="返回列表"
                    aria-label="返回列表"
                    @click="commitBack"
                >
                    <template #icon><ArrowLeft :size="20"/></template>
                </NButton>

                <div
                    v-if="projectStore.isInMobileMode && isEditingRoute && editingDiaryTitle"
                    class="nav-edit-title"
                    :title="editingDiaryTitle"
                >
                    {{ editingDiaryTitle }}
                </div>

                <div class="nav-action-group" v-if="showSearchButton || showDesktopNavTools">
                    <NButton
                        v-if="showSearchButton"
                        quaternary
                        circle
                        class="nav-icon-button"
                        :class="{ active: projectStore.isShowSearchBar }"
                        title="搜索日记"
                        aria-label="搜索日记"
                        @click="toggleSearchbar"
                    >
                        <template #icon><Search :size="19"/></template>
                    </NButton>

                    <NButton
                        v-if="showDesktopNavTools"
                        quaternary
                        circle
                        class="nav-icon-button"
                        :class="{ active: projectStore.isHideContent }"
                        :title="projectStore.isHideContent ? '显示内容' : '隐藏内容'"
                        :aria-label="projectStore.isHideContent ? '显示内容' : '隐藏内容'"
                        @click="toggleHideContent"
                    >
                        <template #icon>
                            <EyeOff v-if="projectStore.isHideContent" :size="19"/>
                            <Eye v-else :size="19"/>
                        </template>
                    </NButton>

                    <NButton
                        v-if="showDesktopNavTools"
                        quaternary
                        circle
                        class="nav-icon-button"
                        :title="listStyleTitle"
                        :aria-label="listStyleTitle"
                        @click="toggleListStyle"
                    >
                        <template #icon>
                            <LayoutList v-if="projectStore.listStyle === EnumListStyle.list" :size="19"/>
                            <List v-else :size="19"/>
                        </template>
                    </NButton>

                    <NButton
                        v-if="showDesktopNavTools"
                        quaternary
                        circle
                        class="nav-icon-button"
                        :class="{ active: route.name === 'Calendar' }"
                        title="日历视图"
                        aria-label="日历视图"
                        @click="calendarTaped"
                    >
                        <template #icon><CalendarDays :size="19"/></template>
                    </NButton>

                    <NButton
                        v-if="showDesktopNavTools"
                        quaternary
                        circle
                        class="nav-icon-button"
                        :class="{ active: isTodoOnly }"
                        title="只看待办"
                        aria-label="只看待办"
                        @click="toggleTodoList"
                    >
                        <template #icon><ListTodo :size="19"/></template>
                    </NButton>
                </div>

                <NButton
                    v-if="showDesktopNavTools && dateFilterRangeLabel"
                    secondary
                    size="small"
                    class="nav-filter-button"
                    title="清除日期筛选"
                    @click="clearDateFilter"
                >
                    {{ dateFilterRangeLabel }}
                </NButton>

                <NavbarCategorySelector
                    v-if="showDesktopNavTools && projectStore.insets.windowsWidth > 1180"
                />
            </div>

            <div class="brand" v-if="showMobileBrand" @click="toggleListStyle">
                <img :src="SVG_ICONS.logo_icons.logo" alt="">
                <span>日记</span>
            </div>

            <div :class="['nav-part-right', { 'editing-actions': isEditingRoute }]">
                <Clock class="nav-clock" v-if="!projectStore.isInMobileMode && projectStore.insets.windowsWidth > 1550"/>

                <div class="nav-action-group" v-if="route.name === 'Detail' && projectStore.currentDiary">
                    <NButton
                        v-if="projectStore.currentDiary && projectStore.currentDiary.is_public === 1"
                        quaternary
                        circle
                        class="nav-icon-button clipboard-trigger"
                        :data-clipboard="shareUrl"
                        title="复制分享链接"
                        aria-label="复制分享链接"
                    >
                        <template #icon><Share2 :size="19"/></template>
                    </NButton>
                    <NButton
                        quaternary
                        circle
                        class="nav-icon-button danger"
                        title="删除日记"
                        aria-label="删除日记"
                        @click="toastShow"
                    >
                        <template #icon><Trash2 :size="19"/></template>
                    </NButton>
                    <NButton
                        quaternary
                        circle
                        class="nav-icon-button"
                        title="编辑日记"
                        aria-label="编辑日记"
                        @click="editDiary"
                    >
                        <template #icon><Pencil :size="19"/></template>
                    </NButton>
                </div>

                <div
                    v-if="isEditingRoute"
                    :class="['nav-action-group', 'editor-action-group', { dirty: hasUnsavedChanges }]"
                >
                    <NButton
                        v-if="projectStore.isDiaryEditorContentHasChanged"
                        quaternary
                        circle
                        class="nav-icon-button editor-recover-button"
                        title="恢复到上次保存"
                        aria-label="恢复到上次保存"
                        @click="diaryRecover"
                    >
                        <template #icon><Undo2 :size="19"/></template>
                    </NButton>
                    <NButton
                        type="primary"
                        size="small"
                        class="nav-save-button"
                        :loading="projectStore.isSavingDiary"
                        :class="{ saved: !hasUnsavedChanges }"
                        :title="saveButtonTitle"
                        :aria-label="saveButtonTitle"
                        @click="diarySave"
                    >
                        <template #icon>
                            <Check v-if="hasUnsavedChanges" :size="17"/>
                            <CheckCircle2 v-else :size="17"/>
                        </template>
                        <span class="save-action-label">{{ saveButtonLabel }}</span>
                    </NButton>
                </div>

                <NButton
                    v-if="projectStore.isInMobileMode && route.name === 'List' && !projectStore.isMenuShowed"
                    quaternary
                    circle
                    :class="['nav-icon-button', 'nav-add-button', { 'editor-add': isEditingRoute }]"
                    title="分类筛选"
                    aria-label="分类筛选"
                    @click="showMenuCategorySelector"
                >
                    <template #icon><Tags :size="19"/></template>
                </NButton>

                <NButton
                    v-if="showAddButton"
                    quaternary
                    circle
                    class="nav-icon-button"
                    title="新建日记"
                    aria-label="新建日记"
                    @click="addNewDiary"
                >
                    <template #icon><Plus :size="21"/></template>
                </NButton>
            </div>

            <NavMenu ref="navMenuRef"/>
        </nav>

        <div id="toast" v-show="isToastShowed" class="fadeIn animated-fast">
            <div
                class="toast"
                :style="projectStore.isInMobileMode ? '' : `left: ${toastPosition.x - 100}px; top: ${toastPosition.y + 100}px;`"
            >
                <div class="toast-header">确定删除吗</div>
                <div class="toast-body">删除后会进入回收站，可在设置里恢复。</div>
                <div class="toast-footer">
                    <button type="button" class="btn-cancel" @click="toastHide">取消</button>
                    <button type="button" class="btn-confirm" @click="diaryDelete">删除</button>
                </div>
            </div>
            <div class="mask" @click="toastHide"></div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {
    ArrowLeft,
    CalendarDays,
    Check,
    CheckCircle2,
    Eye,
    EyeOff,
    LayoutList,
    List,
    ListTodo,
    Menu,
    Pencil,
    Plus,
    Search,
    Share2,
    Tags,
    Trash2,
    Undo2,
    X,
} from "@lucide/vue"
import {NButton} from "naive-ui"
import ClipboardJS from "clipboard"
import {computed, nextTick, onMounted, onUnmounted, ref} from "vue"
import {useRoute, useRouter} from "vue-router"
import diaryApi from "@/api/diaryApi.ts"
import {EnumListStyle} from "@/listStyle.ts"
import {useProjectStore} from "@/pinia/useProjectStore.ts"
import SVG_ICONS from "@/assets/icons/SVG_ICONS.ts"
import {formatDiaryDateRangeLabel, popMessage} from "@/utility.ts"
import NavMenu from "@/view/Menu/NavMenu.vue"
import Clock from "./Clock.vue"
import NavbarCategorySelector from "@/framework/navbar/NavbarCategorySelector.vue"

const projectStore = useProjectStore()
const route = useRoute()
const router = useRouter()
const navMenuRef = ref<InstanceType<typeof NavMenu>>()
const clipboard = ref<ClipboardJS>()
const toastPosition = ref({x: 0, y: 0})
const isToastShowed = ref(false)
let location = window.location

const EDIT_ROUTE_NAMES = ['Edit', 'EditNew', 'CalendarEdit', 'CalendarEditNew'] as const
const isEditingRoute = computed(() => EDIT_ROUTE_NAMES.includes(route.name as typeof EDIT_ROUTE_NAMES[number]))
const isListLikeRoute = computed(() => route.name === 'List' || route.name === 'WaterfallList')
const isNewDiary = computed(() => !route.params.id)
const isTodoOnly = computed(() => projectStore.filteredCategories.length === 1 && projectStore.filteredCategories[0] === 'todo')
const editingDiaryTitle = computed(() => projectStore.editingDiaryTitle.replace(/\s+/g, ' ').trim())
const hasUnsavedChanges = computed(() => isNewDiary.value || projectStore.isDiaryEditorContentHasChanged)
const saveButtonLabel = computed(() => hasUnsavedChanges.value ? '保存' : '已保存')
const saveButtonTitle = computed(() => hasUnsavedChanges.value ? '保存日记' : '日记已保存')
const dateFilterRangeLabel = computed(() =>
    formatDiaryDateRangeLabel(projectStore.dateFilterTimeStart, projectStore.dateFilterTimeEnd)
)
const showMenuOpen = computed(() =>
    (!projectStore.isInMobileMode && !projectStore.isMenuShowed)
    || (projectStore.isInMobileMode && isListLikeRoute.value && !projectStore.isMenuShowed)
)
const showSearchButton = computed(() =>
    !projectStore.isMenuShowed
    && (!projectStore.isInMobileMode || (projectStore.isInMobileMode && isListLikeRoute.value))
)
const showDesktopNavTools = computed(() => !projectStore.isMenuShowed && !projectStore.isInMobileMode)
const showAddButton = computed(() =>
    !isEditingRoute.value
    && (
        (projectStore.isInMobileMode && route.name !== 'Detail' && !projectStore.isMenuShowed)
        || !projectStore.isInMobileMode
    )
)
const showMobileBrand = computed(() =>
    projectStore.isInMobileMode
    && !isEditingRoute.value
    && route.name !== 'Detail'
)
const listStyleTitle = computed(() =>
    projectStore.listStyle === EnumListStyle.list ? '切换到详情列表' : '切换到简洁列表'
)
const shareUrl = computed(() => {
    const id = projectStore.currentDiary?.id
    return id ? `${location.origin}/diary/#/share/${id}` : ''
})

onMounted(() => {
    location = window.location
    clipboard.value = new ClipboardJS('.clipboard-trigger', {
        text: trigger => trigger.getAttribute('data-clipboard') || '',
    })
    clipboard.value.on('success', () => {
        popMessage('success', '分享链接已复制到剪贴板', () => {}, 2)
    })
})

onUnmounted(() => {
    clipboard.value?.destroy()
})

function addNewDiary() {
    if (projectStore.cacheDiary) {
        projectStore.cacheDiary = undefined
        projectStore.cacheDiaryOrigin = undefined
    }
    router.push({name: route.path.includes('calendar') ? 'CalendarEditNew' : 'EditNew'})
}

function editDiary() {
    if (projectStore.cacheDiary) {
        projectStore.cacheDiary = undefined
        projectStore.cacheDiaryOrigin = undefined
    }
    router.push(`/edit/${projectStore.currentDiary.id}`)
}

function toastHide() {
    isToastShowed.value = false
}

function toastShow(event: MouseEvent) {
    toastPosition.value = {x: event.clientX, y: event.clientY}
    isToastShowed.value = true
}

function commitBack() {
    router.push({name: 'List'})
}

function clearDateFilter() {
    projectStore.SET_DATE_FILTER_STRING('')
    projectStore.isListNeedBeReload = true
}

function calendarTaped() {
    router.push({name: route.name === 'Calendar' ? 'List' : 'Calendar'})
}

function menuShow() {
    projectStore.isMenuShowed = true
}

function menuClose() {
    projectStore.isMenuShowed = false
}

function toggleListStyle() {
    switch (projectStore.listStyle) {
        case EnumListStyle.list:
            if (route.name === 'List' || route.name === 'Detail' || route.name === 'Edit' || route.name === 'EditNew') {
                projectStore.listStyle = EnumListStyle.detail
                router.push({name: 'List'})
            } else {
                projectStore.listStyle = EnumListStyle.list
                router.push({name: 'List'})
            }
            break
        case EnumListStyle.detail:
            projectStore.listStyle = EnumListStyle.list
            router.push({name: 'List'})
            break
    }
}

function toggleSearchbar() {
    projectStore.isShowSearchBar = !projectStore.isShowSearchBar
}

function toggleTodoList() {
    projectStore.isFilterShared = false
    projectStore.SET_FILTERED_CATEGORIES(isTodoOnly.value ? [] : ['todo'])
    projectStore.isListNeedBeReload = true
}

function toggleHideContent() {
    projectStore.isHideContent = !projectStore.isHideContent
}

function diarySave() {
    projectStore.isDiaryNeedToBeSaved = true
}

function diaryRecover() {
    projectStore.isDiaryNeedToBeRecovered = true
}

function diaryDelete() {
    const diaryId = projectStore.currentDiary?.id
    if (!diaryId) return
    diaryApi
        .delete({diaryId})
        .then(res => {
            toastHide()
            popMessage('success', res.message, () => {
                if (projectStore.isInMobileMode) {
                    router.back()
                } else {
                    projectStore.listOperation = {type: 'delete', diary: null, id: diaryId}
                }
            }, 0.5)
        })
}

function showMenuCategorySelector() {
    projectStore.isMenuShowed = true
    nextTick(() => {
        navMenuRef.value?.menuListClicked('category')
    })
}
</script>

<style lang="scss" scoped>
@use "navbar" as *;
</style>
