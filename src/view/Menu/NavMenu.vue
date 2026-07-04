<template>
    <transition
        enter-active-class="animated-fast slideInLeft"
        leave-active-class="animated-fast slideOutLeft"
    >
        <aside
            v-if="projectStore.isMenuShowed"
            id="menu-panel"
            class="menu-panel"
            :style="`height: ${projectStore.insets.heightPanel}px`"
            aria-label="主菜单"
        >
            <MenuPanelContainer v-show="menuListShowed">
                <div class="menu-shell">
                    <header class="menu-brand">
                        <img :src="SVG_ICONS.logo_icons.logo" alt="日记" class="menu-brand-logo">
                        <div>
                            <p class="menu-kicker">私人日记系统</p>
                            <h2>今天写点什么</h2>
                        </div>
                    </header>

                    <div class="menu-groups">
                        <section
                            v-for="group in visibleMenuGroups"
                            :key="group.name"
                            class="menu-group"
                        >
                            <div class="menu-group-header">
                                <span>{{ group.name }}</span>
                                <small>{{ group.description }}</small>
                            </div>
                            <div class="menu-list">
                                <MenuListItemShort
                                    v-for="item in group.items"
                                    :key="item.name"
                                    :menu-name="item.name"
                                    :description="item.description"
                                    :icon="item.icon"
                                    :add-on-text="item.addOnText"
                                    @click="item.onClick"
                                >
                                    <component :is="item.insideComponent" v-if="item.insideComponent"/>
                                </MenuListItemShort>
                            </div>
                        </section>
                    </div>

                    <UserProfile/>
                </div>
            </MenuPanelContainer>

            <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut">
                <MenuCategorySelector v-if="categoryShowed"/>
            </transition>

            <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut">
                <YearSelector v-show="yearShowed"/>
            </transition>

            <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut">
                <MenuOtherFunction v-show="othersShowed"/>
            </transition>

            <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut">
                <About v-show="aboutShowed"/>
            </transition>

            <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut">
                <ChangeLog v-show="changeLogShowed"/>
            </transition>
        </aside>
    </transition>
</template>

<script lang="ts" setup>
import MenuCategorySelector from "@/view/Menu/MenuCategorySelector/MenuCategorySelector.vue"
import YearSelector from "./YearSelector/YearSelector.vue"
import About from "@/view/About/About.vue"
import packageInfo from "../../../package.json"
import MenuListItemShort from "@/view/Menu/MenuListItemShort.vue"
import SVG_ICONS from "@/assets/icons/SVG_ICONS.ts"
import UserProfile from "@/view/Menu/UserProfile.vue";
import MenuOtherFunction from "@/view/Menu/MenuOtherFunction/MenuOtherFunction.vue";
import ChangeLog from "@/view/Menu/ChangeLog/ChangeLog.vue";
import {useProjectStore} from "@/pinia/useProjectStore.ts";
import {computed, nextTick, onMounted, ref, watch, type Component} from "vue";
import {useRouter} from "vue-router";
import {storeToRefs} from "pinia";
import MenuCategoryIndicatorInline from "@/view/Menu/MenuCategorySelector/MenuCategoryIndicatorInline.vue";
import MenuPanelContainer from "@/framework/MenuPanelContainer.vue";
import {
    BarChart3,
    CalendarDays,
    CreditCard,
    Files,
    FolderOpen,
    LayoutGrid,
    ListTodo,
    NotebookPen,
    ScrollText,
    Search,
    Settings,
    Tags,
    WalletCards,
    Wrench
} from "@lucide/vue";

type MenuItem = {
    name: string
    description: string
    isShowInMobile: boolean
    isShowInPC: boolean
    isNeedAdmin: boolean
    icon: Component
    insideComponent?: Component | null
    addOnText?: string
    onClick: () => void
}

type MenuGroup = {
    name: string
    description: string
    items: MenuItem[]
}

const projectStore = useProjectStore()
const router = useRouter()

onMounted(() => {
    categoriesSet.value = new Set(projectStore.filteredCategories)
})

const menuListShowed = ref(true)
const categoryShowed = ref(false)
const yearShowed = ref(false)
const othersShowed = ref(false)
const aboutShowed = ref(false)
const changeLogShowed = ref(false)
const categoriesSet = ref(new Set())

const menuGroups = computed<MenuGroup[]>(() => [
    {
        name: '写作',
        description: '日记入口和筛选',
        items: [
            {
                name: '搜索',
                description: '查找标题、正文和标签',
                isShowInMobile: true,
                isShowInPC: true,
                isNeedAdmin: false,
                icon: Search,
                onClick: openSearch
            },
            {
                name: '类别',
                description: '筛选日常、工作、灵感等写作分类',
                isShowInMobile: true,
                isShowInPC: true,
                isNeedAdmin: false,
                icon: Tags,
                insideComponent: MenuCategoryIndicatorInline,
                onClick: () => menuListClicked('category')
            },
            {
                name: '待办',
                description: isTodoFiltered.value ? '返回全部日记' : '只看待办类日记',
                isShowInMobile: true,
                isShowInPC: true,
                isNeedAdmin: false,
                icon: ListTodo,
                onClick: () => menuListClicked('todo')
            },
            {
                name: '年份',
                description: '按年份快速定位',
                isShowInMobile: true,
                isShowInPC: true,
                isNeedAdmin: false,
                icon: ScrollText,
                onClick: () => menuListClicked('year')
            }
        ]
    },
    {
        name: '回看',
        description: '浏览和统计',
        items: [
            {
                name: '日历',
                description: '按日期查看写作痕迹',
                isShowInMobile: true,
                isShowInPC: true,
                isNeedAdmin: false,
                icon: CalendarDays,
                onClick: () => goToPage('Calendar')
            },
            {
                name: '统计',
                description: '查看写作、天气和趋势',
                isShowInMobile: true,
                isShowInPC: true,
                isNeedAdmin: false,
                icon: BarChart3,
                onClick: () => goToPage('Statistics')
            },
            {
                name: '瀑布',
                description: '以卡片流回看日记',
                isShowInMobile: true,
                isShowInPC: true,
                isNeedAdmin: false,
                icon: LayoutGrid,
                onClick: () => goToPage('WaterfallList')
            }
        ]
    },
    {
        name: '独立模块',
        description: '不再混进正文',
        items: [
            {
                name: '账单',
                description: '结构化记录收支，不占用日记分类',
                isShowInMobile: true,
                isShowInPC: true,
                isNeedAdmin: false,
                icon: CreditCard,
                onClick: () => goToPage('Bill')
            },
            {
                name: '银行卡',
                description: '加密保险箱，默认脱敏显示',
                isShowInMobile: true,
                isShowInPC: true,
                isNeedAdmin: false,
                icon: WalletCards,
                onClick: () => goToPage('BankCard')
            }
        ]
    },
    {
        name: '系统',
        description: '维护与资料',
        items: [
            {
                name: '文件',
                description: '管理上传文件',
                isShowInMobile: true,
                isShowInPC: true,
                isNeedAdmin: true,
                icon: FolderOpen,
                onClick: () => goToPage('FileManager')
            },
            {
                name: '设置',
                description: '备份、迁移、天气服务',
                isShowInMobile: true,
                isShowInPC: true,
                isNeedAdmin: true,
                icon: Settings,
                onClick: () => goToPage('SystemConfig')
            },
            {
                name: '其它',
                description: '导出与密码维护',
                isShowInMobile: true,
                isShowInPC: true,
                isNeedAdmin: false,
                icon: Wrench,
                onClick: () => menuListClicked('others')
            },
            {
                name: '更新日志',
                description: '查看版本变化',
                isShowInMobile: true,
                isShowInPC: true,
                isNeedAdmin: false,
                icon: Files,
                onClick: () => menuListClicked('changeLog')
            },
            {
                name: '关于',
                description: '应用信息',
                isShowInMobile: true,
                isShowInPC: true,
                isNeedAdmin: false,
                icon: NotebookPen,
                addOnText: `v${packageInfo.version}`,
                onClick: () => menuListClicked('about')
            }
        ]
    }
])

const isTodoFiltered = computed(() => (
    projectStore.filteredCategories.length === 1 && projectStore.filteredCategories[0] === 'todo'
))

const visibleMenuGroups = computed(() => {
    return menuGroups.value
        .map(group => ({
            ...group,
            items: group.items.filter(item => {
                const isVisibleByViewport = projectStore.isInMobileMode ? item.isShowInMobile : item.isShowInPC
                const isVisibleByRole = item.isNeedAdmin ? projectStore.isAdminUser : true
                return isVisibleByViewport && isVisibleByRole
            })
        }))
        .filter(group => group.items.length > 0)
})

const {isMenuShowed} = storeToRefs(projectStore)
watch(isMenuShowed, newValue => {
    if (newValue) {
        menuShow()
    } else {
        menuClose()
    }
})

function openSearch() {
    projectStore.isShowSearchBar = true
    menuInit()
    nextTick(() => {
        (document.querySelector('#keyword') as HTMLInputElement | null)?.focus()
    })
}

function goToPage(pageName: string) {
    projectStore.isMenuShowed = false
    menuClose()
    router.push({name: pageName})
}

function menuShow() {
    projectStore.isMenuShowed = true
    menuListShowed.value = true
    categoryShowed.value = false
    yearShowed.value = false
    othersShowed.value = false
    aboutShowed.value = false
    changeLogShowed.value = false
}

function menuClose() {
    if (categoryShowed.value || yearShowed.value) {
        projectStore.isListNeedBeReload = true
        menuInit()
    } else if (aboutShowed.value || changeLogShowed.value || othersShowed.value) {
        projectStore.isMenuShowed = true
        menuListShowed.value = true
        categoryShowed.value = false
        yearShowed.value = false
        othersShowed.value = false
        aboutShowed.value = false
        changeLogShowed.value = false
    } else if (projectStore.isMenuShowed) {
        menuInit()
    }
}

function menuInit() {
    projectStore.isMenuShowed = false
    menuListShowed.value = true
    categoryShowed.value = false
    yearShowed.value = false
    othersShowed.value = false
    aboutShowed.value = false
    changeLogShowed.value = false
}

function showSubPanel(panel: 'category' | 'year' | 'others' | 'about' | 'changeLog') {
    projectStore.isMenuShowed = true
    menuListShowed.value = false
    categoryShowed.value = panel === 'category'
    yearShowed.value = panel === 'year'
    othersShowed.value = panel === 'others'
    aboutShowed.value = panel === 'about'
    changeLogShowed.value = panel === 'changeLog'
}

function menuListClicked(menuName: string) {
    switch (menuName) {
        case 'search':
            openSearch()
            break
        case 'todo': {
            const nextCategories = isTodoFiltered.value ? [] : ['todo']
            projectStore.isFilterShared = false
            projectStore.SET_FILTERED_CATEGORIES(nextCategories)
            projectStore.isListNeedBeReload = true
            menuInit()
            break
        }
        case 'category':
            showSubPanel('category')
            break
        case 'year':
            showSubPanel('year')
            break
        case 'others':
            showSubPanel('others')
            break
        case 'about':
            showSubPanel('about')
            break
        case 'changeLog':
            showSubPanel('changeLog')
            break
        default:
            break
    }
}

defineExpose({
    menuShow,
    menuClose,
    menuInit,
    menuListClicked,
})
</script>
