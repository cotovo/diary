<template>
    <div class="diary-edit-container" :style="`min-height: ${projectStore.insets.heightPanel}px`">
        <main class="diary-edit-content" aria-label="日记编辑器">
            <div class="writing-paper">
                <EditorStatusBar
                    :word-count="editorWordCount"
                    :line-count="editorLineCount"
                    :has-changed="diaryHasChanged"
                    :has-local-draft="hasLocalDraft"
                    :draft-saved-at-label="draftSavedAtLabel"
                    :last-saved-at-label="lastSavedAtLabel"
                    @restore-draft="restoreLocalDraft"
                />

                <div class="editor-title">
                    <label for="diary-title">标题</label>
                    <textarea
                        id="diary-title"
                        ref="refDiaryTitleTextArea"
                        class="title"
                        placeholder="一句话，概括你的一天"
                        v-model="diary.title"
                    />
                </div>

                <div class="editor-content">
                    <label for="diary-content">正文</label>
                    <textarea
                        id="diary-content"
                        ref="refDiaryContentTextArea"
                        v-model="diary.content"
                        :style="contentTextareaStyle"
                        wrap="soft"
                        placeholder="把今天真正想留下的事写在这里"
                        class="content"
                    />
                </div>
            </div>
        </main>

        <aside class="diary-edit-meta" aria-label="日记上下文">
            <div class="meta-panel">
                <header class="meta-panel-header">
                    <div>
                        <span>写作检查器</span>
                        <p>日期、分类、心情与天气</p>
                    </div>
                </header>

                <section class="context-block date-context-section">
                    <div class="context-section-header">
                        <h3>时间</h3>
                    </div>
                    <EditorVCalendarSelector
                        @dayChange="dayHasChanged"
                        v-model="diary.date"/>
                </section>

                <section class="context-block writing-attributes-section">
                    <div class="context-section-header">
                        <h3>写作属性</h3>
                    </div>
                    <EditCategorySelector :category="diary.category" @change="setCategory"/>
                    <MoodTagPicker
                        v-model:mood="diary.mood"
                        v-model:tags="diary.tags"
                    />
                </section>

                <WeatherLocationCard
                    :loading="isResolvingContext"
                    :weather="diary.weather"
                    :weather-text="diary.weatherText || ''"
                    :temperature-inside="String(diary.temperature || '')"
                    :temperature-outside="String(diary.temperature_outside || '')"
                    :location-name="diary.locationName || ''"
                    :humidity="diary.humidity || ''"
                    :wind-text="diary.windText || ''"
                    :context-updated-at="diary.contextUpdatedAt || ''"
                    @update:temperature-inside="value => diary.temperature = value"
                    @update:temperature-outside="value => diary.temperature_outside = value"
                    @resolve-location="resolveContextFromBrowser"
                    @resolve-city="resolveContextFromCity"
                    @clear="clearDiaryContext"
                />

                <section class="context-block settings-context-section">
                    <div class="context-section-header">
                        <h3>写作设置</h3>
                    </div>
                    <NForm label-placement="left" label-width="92" :show-feedback="false">
                        <NFormItem label="公开分享">
                            <NSwitch v-model:value="diary.is_public"/>
                        </NFormItem>
                        <NFormItem label="Markdown">
                            <NSwitch v-model:value="diary.is_markdown"/>
                        </NFormItem>
                    </NForm>
                </section>
            </div>
        </aside>
    </div>
</template>

<script lang="ts" setup>
import Moment from 'moment'
import {NForm, NFormItem, NSwitch} from "naive-ui"

// components
import EditCategorySelector from "./CategorySelector/EditorCategorySelector.vue"
import EditorStatusBar from "./EditorStatusBar.vue";
import MoodTagPicker from "./MoodTagPicker.vue";
import WeatherLocationCard from "./WeatherLocationCard.vue";

import {
    popMessage,
    temperatureProcessSTC, temperatureProcessCTS, dateFormatter
} from "@/utility.ts";
import diaryApi from "@/api/diaryApi.ts"
import {useProjectStore} from "@/pinia/useProjectStore.ts";
const projectStore = useProjectStore()
import {computed, nextTick, onBeforeMount, onBeforeUnmount, onMounted, Ref, ref, watch} from "vue";
import {onBeforeRouteLeave, useRoute, useRouter} from "vue-router";

// ENTITY
import {
    EntityDiaryForm,
    DiarySubmitEntity,
    ResponseDiaryAdd
} from "@/view/DiaryList/Diary.ts";
import {storeToRefs} from "pinia";

const route = useRoute()
const router = useRouter()

const isNew = ref(true)
const hasTriedAutoRefreshWeather = ref(false)
const isResolvingContext = ref(false)
const draftSavedAt = ref('')
const lastSavedAt = ref('')
const hasLocalDraft = ref(false)
let draftSaveTimer: ReturnType<typeof setTimeout> | null = null

const diary = ref<EntityDiaryForm>({
    id: -1,
    title: "",
    content: "",
    is_public: false,
    is_markdown: false,
    date: new Date(),
    weather: 'sunny',
    category: 'life',
    temperature: '',
    temperature_outside: '',
    mood: 'calm',
    tags: [],
    locationName: '',
    longitude: '',
    latitude: '',
    weatherText: '',
    weatherCode: '',
    humidity: '',
    windText: '',
    contextUpdatedAt: '',
})

const contentTextareaStyle = computed(() => {
    if (projectStore.insets.windowsWidth > 1366) {
        return `height: ${projectStore.insets.heightPanel - 150 - 40 - 20}px`
    }
    return ''
})

const diaryOrigin = ref<EntityDiaryForm>({ // 不需要跟上面一样，但需要有提交声明好的属性，不然后面无法对比其值
    id: -1,
    title: "",
    content: "",
    is_public: false,
    is_markdown: false,
    date: new Date(),
    weather: 'sunny',
    category: 'life',
    temperature: '',
    temperature_outside: '',
    mood: 'calm',
    tags: [],
    locationName: '',
    longitude: '',
    latitude: '',
    weatherText: '',
    weatherCode: '',
    humidity: '',
    windText: '',
    contextUpdatedAt: '',
})

const editorWordCount = computed(() => {
    return `${diary.value.title || ''}\n${diary.value.content || ''}`.trim().length
})
const editorLineCount = computed(() => {
    const content = `${diary.value.title || ''}\n${diary.value.content || ''}`.trim()
    return content ? content.split('\n').length : 0
})

const draftSavedAtLabel = computed(() => {
    if (!draftSavedAt.value) return ''
    return dateFormatter(new Date(draftSavedAt.value), 'hh:mm')
})
const lastSavedAtLabel = computed(() => {
    if (!lastSavedAt.value) return ''
    return dateFormatter(new Date(lastSavedAt.value), 'hh:mm')
})
const recoverDiaryContent = ref({  // 编辑过程中点击了隐藏按钮，此时记录没有保存的内容。供一会恢复
    title: '',
    content: ''
})

/**
 * Date Picker
 */
import 'v-calendar/style.css';
import EditorVCalendarSelector from "@/view/Edit/EditorVCalendarSelector.vue";

const refDiaryContentTextArea = ref()
const refDiaryTitleTextArea = ref()

onBeforeMount(() => {
    // console.log(refDiaryContentTextArea)
    // (refDiaryContentTextArea.value as HTMLTextAreaElement).removeEventListener('keydown', ()=>{}) // 去除按键绑定事件
    window.onkeydown = null // 去除 edit 页面的绑定事件

    // 如果存在缓存日记内容，载入它
    if (projectStore.cacheDiary){
        if (projectStore.cacheDiary.id === -1){
            recoverCachedDiary()
        } else {
            if (Number(route.params.id) === projectStore.cacheDiary.id){  // 只有是同一个日记时
                recoverCachedDiary()
            } else {

            }
        }
    }
})

onMounted(()=>{
    // 网页标签关闭前提醒
    window.onbeforeunload = () => {
        if (diaryHasChanged.value) {
            return "日记内容已改变，显示提示框"
        }
    }

    // 如果已经存在日记内容，不需要重新获取日记、新建日记
    if (diary.value.title || diary.value.content){

    } else {
        isNew.value = !(route.params.id)
        if (isNew.value) {
            // 新建日记
            createDiary()
        } else {
            getDiary(Number(route.params.id))
        }
    }

    // key binding
    nextTick( () => {
        // 页面快捷键
        window.onkeydown = event => {
            // CTRL + S 保存
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault()
                saveDiary()
            }
        }

        // 编辑器快捷键
        refDiaryTitleTextArea.value.addEventListener('keydown', (event: KeyboardEvent) => {
                addKeyboardEventListener(event, refDiaryTitleTextArea, diary, 'title')
        })

        // 编辑器快捷键
        refDiaryContentTextArea.value.addEventListener('keydown', (event: KeyboardEvent) => {
            addKeyboardEventListener(event, refDiaryContentTextArea, diary, 'content')
        })
    })

    // 刷新进入编辑页时，系统配置可能稍后才到；这里先尝试一次自动刷新天气
    tryRefreshWeatherForTodayDiary()
})


/**
 * 缓存当前日记内容
 */
function cacheCurrentDiary(){
    if (diary.value.title || diary.value.content){
        projectStore.cacheDiary = diary.value
        projectStore.cacheDiaryOrigin = diaryOrigin.value
    }
}
/**
 * 恢复缓存日记内容
 */
function recoverCachedDiary(){
    if (projectStore.cacheDiary){
        diary.value = projectStore.cacheDiary
        diaryOrigin.value = projectStore.cacheDiaryOrigin
        projectStore.cacheDiary = undefined
    }
}

/**
 * 标题和内容通用方法
 * @param event   keyboard event
 * @param textareaRef   ref of Textarea
 * @param diaryObj   ref of diary Object
 * @param key  key of diary Object
 */
function addKeyboardEventListener(event: KeyboardEvent, textareaRef: Ref, diaryObj: Ref<EntityDiaryForm>, key: string) {

    // CTRL + ArrowLeft 移到最左端
    if ((event.ctrlKey || event.metaKey) && event.key === 'ArrowLeft') {
        event.preventDefault()
        let textarea = textareaRef.value as HTMLTextAreaElement // dom
        let textAreaInfo = getTextareaInfo(textarea, diaryObj.value[key])
        let linesBefore = textAreaInfo.textLineArray.slice(0, textAreaInfo.cursorLineIndex)
        let textBefore = linesBefore.join('\n')
        let newCursorLocation = 0
        if (textBefore.length === 0) {

        } else {
            newCursorLocation = textBefore.length + 1  // -1行末尾 + 1
        }
        nextTick(() => {
            textarea.setSelectionRange(newCursorLocation, newCursorLocation)
        })
    }

    // CTRL + ArrowRight 移到最右端
    if ((event.ctrlKey || event.metaKey) && event.key === 'ArrowRight') {
        event.preventDefault()
        let textarea = textareaRef.value as HTMLTextAreaElement // dom
        let textAreaInfo = getTextareaInfo(textarea, diaryObj.value[key])
        let linesBefore = textAreaInfo.textLineArray.slice(0, textAreaInfo.cursorLineIndex + 1)
        let textBefore = linesBefore.join('\n')
        let newCursorLocation = textBefore.length
        nextTick(() => {
            textarea.setSelectionRange(newCursorLocation, newCursorLocation) // 定位光标
        })
    }

    // CTRL + D 复选行
    if ((event.ctrlKey || event.metaKey) && event.key === 'd') {

        event.preventDefault()
        let textarea = textareaRef.value as HTMLTextAreaElement// dom
        let textAreaInfo = getTextareaInfo(textarea, diaryObj.value[key])

        textAreaInfo.textLineArray.splice(textAreaInfo.cursorLineIndex, 0, textAreaInfo.cursorLineContent)
        diaryObj.value[key] = textAreaInfo.textLineArray.join('\n')

        console.log(event, textareaRef, diaryObj.value[key])

        nextTick(() => {
            textarea.setSelectionRange(textAreaInfo.cursorSelectionStart, textAreaInfo.cursorSelectionStart) // 定位光标
        })
    }

    // CTRL + X 删除行
    if ((event.ctrlKey || event.metaKey) && event.key === 'x') {
        let textarea = textareaRef.value as HTMLTextAreaElement // dom
        let textAreaInfo = getTextareaInfo(textarea, diaryObj.value[key])
        // 只有未选择任何内容的时候
        if (textAreaInfo.cursorSelectionStart === textAreaInfo.cursorSelectionEnd) {
            event.preventDefault()
            // 只有在 localhost 或 https 的环境下才能使用 navigator.clipboard
            if (window.isSecureContext){
                navigator.clipboard.writeText(textAreaInfo.cursorLineContent)
                    .then(() => {
                        console.log('✓ moved')
                    })
                textAreaInfo.textLineArray.splice(textAreaInfo.cursorLineIndex, 1)
                diaryObj.value[key] = textAreaInfo.textLineArray.join('\n')
                nextTick(() => {
                    textarea.setSelectionRange(textAreaInfo.cursorSelectionStart, textAreaInfo.cursorSelectionStart) // 定位光标
                })
            } else {
                // 照样删除
                textAreaInfo.textLineArray.splice(textAreaInfo.cursorLineIndex, 1)
                diaryObj.value[key] = textAreaInfo.textLineArray.join('\n')
            }
        }
    }

    // CTRL + C 复制行
    if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        let textarea = textareaRef.value as HTMLTextAreaElement // dom
        let textAreaInfo = getTextareaInfo(textarea, diaryObj.value[key])

        // 只有未选择任何内容的时候
        if (textAreaInfo.cursorSelectionStart === textAreaInfo.cursorSelectionEnd) {
            // 只有在 localhost 或 https 的环境下才能使用 navigator.clipboard
            if (window.isSecureContext){
                navigator.clipboard.writeText(textAreaInfo.cursorLineContent)
                    .then(() => {
                        console.log('✓ copied')
                    })
            }
        }
    }

    // shift + tab
    if (event.shiftKey && event.key === 'Tab') {
        event.preventDefault()
        let textarea = textareaRef.value as HTMLTextAreaElement // dom
        let textAreaInfo = getTextareaInfo(textarea, diaryObj.value[key])

        let tempLine = textAreaInfo.cursorLineContent
        let deleteSpaceCount = 0
        if (tempLine.substring(0, 4) === '    ') {
            tempLine = tempLine.substring(4)
            deleteSpaceCount = 4
        } else {
            let trimSpaceResult = removeSpaceBeforeLine(0, tempLine)
            tempLine = trimSpaceResult.lineContent
            deleteSpaceCount = trimSpaceResult.countSpace
        }
        textAreaInfo.textLineArray.splice(textAreaInfo.cursorLineIndex, 1, tempLine)
        diaryObj.value[key] = textAreaInfo.textLineArray.join('\n')

        nextTick(() => {
            textarea.setSelectionRange(textAreaInfo.cursorSelectionStart - deleteSpaceCount, textAreaInfo.cursorSelectionStart - deleteSpaceCount)
        })

    } else if (event.key === 'Tab') {
        // tab
        event.preventDefault()
        let textarea = textareaRef.value as HTMLTextAreaElement // dom
        let textAreaInfo = getTextareaInfo(textarea, diaryObj.value[key])
        let contentBeforeCursor = diaryObj.value[key].substring(0, textAreaInfo.cursorSelectionStart)
        let contentAfterCursor = diaryObj.value[key].substring(textAreaInfo.cursorSelectionStart)
        diaryObj.value[key] = contentBeforeCursor + '    ' + contentAfterCursor
        nextTick(() => {
            textarea.setSelectionRange(textAreaInfo.cursorSelectionStart + 4, textAreaInfo.cursorSelectionStart + 4)
        })
    }
}

onBeforeUnmount(() => {
    projectStore.editingDiaryTitle = '' // 离开编辑页，清空 navbar 标题
    // 退出 Edit 之前，如果存在日记内容，缓存它。
    // 目前只有一个场景用到，就是屏幕窗口大小变化时， Edit 会消失再出现，结果就是
    // 会选择用户在这期间写的内容，这是极不应该的。
    cacheCurrentDiary()
    if (draftSaveTimer) {
        clearTimeout(draftSaveTimer)
        draftSaveTimer = null
    }
})

onBeforeRouteLeave((_, __, next) => {
    // 在跳转到其它页面之前判断日记是否已保存
    if (diaryHasChanged.value) {
        const shouldLeave = window.confirm('当前日记还没有保存。确定放弃这些修改并离开吗？')
        if (shouldLeave) {
            projectStore.isDiaryEditorContentHasChanged = false
            next()
        } else {
            next(false)
        }
    } else {
        next()
    }
})

const diaryHasChanged = computed(() => {
    // 无内容时，改变任何其它位置的信息都不算变化
    if (diary.value.title === '' && diary.value.content === ''){
        return false
    } else {
        return (
            diary.value.title !== diaryOrigin.value.title ||
            diary.value.content !== diaryOrigin.value.content ||
            diary.value.temperature !== diaryOrigin.value.temperature ||
            diary.value.temperature_outside !== diaryOrigin.value.temperature_outside ||
            diary.value.weather !== diaryOrigin.value.weather ||
            diary.value.category !== diaryOrigin.value.category ||
            diary.value.is_public !== diaryOrigin.value.is_public ||
            diary.value.is_markdown !== diaryOrigin.value.is_markdown ||
            diary.value.mood !== diaryOrigin.value.mood ||
            JSON.stringify(diary.value.tags || []) !== JSON.stringify(diaryOrigin.value.tags || []) ||
            diary.value.locationName !== diaryOrigin.value.locationName ||
            diary.value.longitude !== diaryOrigin.value.longitude ||
            diary.value.latitude !== diaryOrigin.value.latitude ||
            diary.value.weatherText !== diaryOrigin.value.weatherText ||
            diary.value.weatherCode !== diaryOrigin.value.weatherCode ||
            diary.value.humidity !== diaryOrigin.value.humidity ||
            diary.value.windText !== diaryOrigin.value.windText ||
            diary.value.contextUpdatedAt !== diaryOrigin.value.contextUpdatedAt
        )
    }
})


watch(() => route.params.id, newDiaryId => {
    console.log('edit: watch: diary-id: triggered.', newDiaryId)
    isNew.value = false  // 能获取id的日记肯定不是新日记

    if (newDiaryId) {
        getDiary(Number(newDiaryId))
    } else {
        createDiary()
    }
    nextTick(checkLocalDraft)
}, {immediate: true})

watch(diary, () => {
        updateDiaryIcon()  // 更新 navbar icon
        cacheCurrentDiary() // 缓存当前日记内容
        scheduleLocalDraftSave()
    },
    {deep: true}
)

const {isDiaryNeedToBeSaved, isDiaryNeedToBeRecovered, isHideContent} = storeToRefs(projectStore)
watch(isDiaryNeedToBeSaved,newValue => {
    if (newValue) {
        saveDiary()
    }
})
watch(isDiaryNeedToBeRecovered, newValue => {
    if (newValue) {
        recoverDiary()
    }
})
watch(isHideContent, newValue => {
    if (newValue){ // 保存当前未保存的日记内容
        if (projectStore.isDiaryEditorContentHasChanged){
            recoverDiaryContent.value = {
                title: diary.value.title,
                content: diary.value.content
            }
        }
        diary.value.title = diary.value.title.replace(/[^，。 \n]/g, '*')
        diary.value.content = diary.value.content.replace(/[^，。 \n]/g, '*')
    } else {
        if (recoverDiaryContent.value.title || recoverDiaryContent.value.content) { // 如果存在没有保存的日记内容
            diary.value.title = recoverDiaryContent.value.title
            diary.value.content = recoverDiaryContent.value.content
        } else {
            diary.value.title = diaryOrigin.value.title
            diary.value.content = diaryOrigin.value.content
        }
    }
})

// 日期前后移动
function dayHasChanged(isToday: boolean){
    if (isToday){
        hasTriedAutoRefreshWeather.value = false
        tryRefreshWeatherForTodayDiary()
    } else {
        hasTriedAutoRefreshWeather.value = false
        diary.value.temperature = ''
        diary.value.temperature_outside = ''
        diary.value.weather = 'sunny'
    }
}

/**
 * 去除前面的空格
 * @param initSpaceCount 初始空格数
 * @param lineContent 行的内容
 * @returns {*}
 */
function removeSpaceBeforeLine(initSpaceCount: number, lineContent: string){  // 去除字符行中前面的空格
    let countSpace = initSpaceCount
    if (lineContent.substring(0,1) === ' '){
        countSpace  = countSpace + 1
        lineContent = lineContent.substring(1)
        return removeSpaceBeforeLine(countSpace, lineContent)
    } else {
        return {countSpace, lineContent}
    }
}

function getTextareaInfo(textarea: HTMLTextAreaElement, textContent: string){
    let cursorSelectionStart = textarea.selectionStart // cursorPos
    let cursorSelectionEnd = textarea.selectionEnd // cursorPos
    let cursorLineIndex = textContent.substring(0, cursorSelectionStart).split('\n').length - 1 // 光标所在行
    let textLineArray = textContent.split('\n') // 原始文字 行数组
    let cursorLineContent = textLineArray[cursorLineIndex] // 光标所在行的内容

    return {
        cursorSelectionStart,
        cursorSelectionEnd,
        cursorLineIndex,
        textLineArray,
        cursorLineContent
    }
}
function setCategory(categoryNameEn: string) {
    diary.value.category = categoryNameEn
}
function updateDiaryIcon() {
    document.title = diaryHasChanged.value ? '日记 - 编辑中...' : '日记' // 变更标题
    projectStore.editingDiaryTitle = diary.value.title // 同步至 navbar 展示
    projectStore.isDiaryEditorContentHasChanged = diaryHasChanged.value
}

function localDraftKey() {
    const id = route.params.id ? String(route.params.id) : 'new'
    return `DiaryLocalDraft:${id}`
}

function currentDraftPayload() {
    return {
        savedAt: new Date().toISOString(),
        diary: {
            ...diary.value,
            date: diary.value.date instanceof Date ? diary.value.date.toISOString() : diary.value.date,
        }
    }
}

function scheduleLocalDraftSave() {
    if (!diaryHasChanged.value || projectStore.isHideContent) return
    if (draftSaveTimer) clearTimeout(draftSaveTimer)
    draftSaveTimer = setTimeout(() => {
        localStorage.setItem(localDraftKey(), JSON.stringify(currentDraftPayload()))
        draftSavedAt.value = new Date().toISOString()
        hasLocalDraft.value = true
    }, 800)
}

function checkLocalDraft() {
    const draftString = localStorage.getItem(localDraftKey())
    if (!draftString) {
        hasLocalDraft.value = false
        draftSavedAt.value = ''
        return
    }
    try {
        const draft = JSON.parse(draftString)
        hasLocalDraft.value = !!draft.diary
        draftSavedAt.value = draft.savedAt || ''
        if (hasLocalDraft.value) {
            popMessage('warning', '发现本地草稿，可点击恢复草稿', () => {}, 3)
        }
    } catch {
        localStorage.removeItem(localDraftKey())
        hasLocalDraft.value = false
        draftSavedAt.value = ''
    }
}

function clearLocalDraft() {
    localStorage.removeItem(localDraftKey())
    hasLocalDraft.value = false
    draftSavedAt.value = ''
}

function restoreLocalDraft() {
    const draftString = localStorage.getItem(localDraftKey())
    if (!draftString) return
    try {
        const draft = JSON.parse(draftString)
        if (draft.diary) {
            diary.value = {
                ...draft.diary,
                date: draft.diary.date ? new Date(draft.diary.date) : new Date(),
            }
            draftSavedAt.value = draft.savedAt || ''
            hasLocalDraft.value = true
            popMessage('success', '草稿已恢复')
        }
    } catch {
        popMessage('danger', '草稿恢复失败')
    }
}


function getDiary(diaryId: number) {

    console.log('is new:getDiary: ', isNew.value)
    // 编辑日记
    diaryApi
        .detail({
            diaryId: diaryId
        })
        .then(res => {
            let tempDiary = res.data

            // `diaryOrigin` 必须始终保存真实内容（非 *），否则隐藏模式下无法恢复/保存原文。
            const realTitle = tempDiary.title
            const realContent = tempDiary.content

            diary.value.id = tempDiary.id
            diary.value.category = tempDiary.category
            diary.value.date = new Date(tempDiary.date.replace(' ', 'T')) // safari 只识别 2020-10-27T14:35:33 格式的日期
            diary.value.weather = tempDiary.weather
            diary.value.is_public = !!tempDiary.is_public
            diary.value.is_markdown = !!tempDiary.is_markdown
            diary.value.temperature = temperatureProcessSTC(tempDiary.temperature)
            diary.value.temperature_outside = temperatureProcessSTC(tempDiary.temperature_outside)
            diary.value.mood = tempDiary.mood || 'calm'
            diary.value.tags = Array.isArray(tempDiary.tags) ? tempDiary.tags : []
            diary.value.locationName = tempDiary.locationName || ''
            diary.value.longitude = tempDiary.longitude || ''
            diary.value.latitude = tempDiary.latitude || ''
            diary.value.weatherText = tempDiary.weatherText || ''
            diary.value.weatherCode = tempDiary.weatherCode || ''
            diary.value.humidity = tempDiary.humidity || ''
            diary.value.windText = tempDiary.windText || ''
            diary.value.contextUpdatedAt = tempDiary.contextUpdatedAt || ''

            if (projectStore.isHideContent){
                diary.value.title = realTitle.replace(/[^，。 \n]/g, '*')
                diary.value.content = realContent.replace(/[^，。 \n]/g, '*')
            } else {
                diary.value.title = realTitle
                diary.value.content = realContent
            }

            Object.assign(diaryOrigin.value, diary.value, { title: realTitle, content: realContent }) // 不能直接赋值，赋值的是它的引用
            nextTick(checkLocalDraft)

        })
        .catch(err => {
            console.log('EDIT: get diary info error: ', err)
            router.push({name: 'List'})
        })
}
function saveDiary() {
    const titleToSave = projectStore.isHideContent
        ? (recoverDiaryContent.value.title || diaryOrigin.value.title)
        : diary.value.title
    const contentToSave = projectStore.isHideContent
        ? (recoverDiaryContent.value.content || diaryOrigin.value.content)
        : diary.value.content

    if (!/^(-?\d{1,3}(\.\d{1,2})?)?$/.test(diary.value.temperature)){
        popMessage('warning', '身处温度填写错误，应为 23.45 这样', ()=>{}, 2)
        return
    } else if (!/^(-?\d{1,3}(\.\d{1,2})?)?$/.test(diary.value.temperature_outside)){
        popMessage('warning', '室外温度填写错误，请检查 23.45 这样', ()=>{}, 2)
        return
    } else if  (titleToSave.trim().length === 0) {
        if (!projectStore.isHideContent){
            diary.value.title = '' // clear content
        }
        popMessage('warning', '内容未填写', null)
        projectStore.isDiaryNeedToBeSaved = false// 未能成功保存时，复位 isDiaryNeedToBeSaved 标识
        return
    }
    let requestData: DiarySubmitEntity = {
        id: diary.value.id,
        title: titleToSave,
        content: contentToSave,
        category: diary.value.category,
        temperature: temperatureProcessCTS(diary.value.temperature),
        temperature_outside: temperatureProcessCTS(diary.value.temperature_outside),
        weather: diary.value.weather,
        is_public: diary.value.is_public ? 1 : 0,
        is_markdown: diary.value.is_markdown ? 1 : 0,
        date: dateFormatter(diary.value.date),
        mood: diary.value.mood,
        tags: diary.value.tags,
        locationName: diary.value.locationName,
        longitude: diary.value.longitude,
        latitude: diary.value.latitude,
        weatherText: diary.value.weatherText,
        weatherCode: diary.value.weatherCode,
        humidity: diary.value.humidity,
        windText: diary.value.windText,
        contextUpdatedAt: diary.value.contextUpdatedAt,
    }
    if (isNew.value){
        projectStore.isSavingDiary = true
        diaryApi
            .add(requestData)
            .then((res) => processAfterSaveDiary(res, requestData))
            .catch(err => {
                popMessage('danger', err.message, () => {
                    projectStore.isSavingDiary = false
                    projectStore.isDiaryNeedToBeSaved = false
                }, 3)
            })
            .finally(() => {
                projectStore.isSavingDiary = false
            })
    } else {
        projectStore.isSavingDiary = true
        diaryApi
            .modify(requestData)
            .then((res) => processAfterSaveDiary(res, requestData))
            .catch(err => {
                popMessage('danger', err.message, () => {
                    projectStore.isSavingDiary = false
                    projectStore.isDiaryNeedToBeSaved = false
                }, 3)
            })
            .finally(() => {
                projectStore.isSavingDiary = false
            })
    }
}

// 保存日记后要操作的
function processAfterSaveDiary(res: ResponseDiaryAdd, requestData: DiarySubmitEntity){
    projectStore.isSavingDiary = false

    // 成功后更新 origin 字符串
    Object.assign(diaryOrigin.value, diary.value, { title: requestData.title, content: requestData.content })
    updateDiaryIcon() // 更新 navbar icon
    projectStore.isDiaryNeedToBeSaved = false
    recoverDiaryContent.value = { title: '', content: '' }
    lastSavedAt.value = new Date().toISOString()
    clearLocalDraft()

    if (isNew.value) { // 如果是新建日记，跳转到对应路由
        diary.value.id = res.data.id // 保存成功后需要将当前页的 diary id 设置为已经保存的 id
        popMessage('success', res.message, ()=>{
            projectStore.listOperation = {type: 'add', diary: convertToServerVersion()} // 向列表发送添加动作
            nextTick(() => {
                router.push({
                    name: 'Edit',
                    params: {
                        id: res.data.id
                    }
                })
            })
        }, 1)  // 日记保存完成之后，应立即处理上面的内容，再显示消息，而不是等消息消失再处理，会有问题
    } else {
        popMessage('success', res.message, ()=>{
            projectStore.listOperation = {type: 'change', diary: convertToServerVersion()}// 向列表发送改变动作
        }, 1)  // 日记保存完成之后，应立即处理上面的内容，再显示消息，而不是等消息消失再处理，会有问题
    }
    isNew.value = false
}

function createDiary() {
    console.log('create diary been called.')
    isNew.value = true

    diary.value = {
        id: -1,
        title: '',
        content: "",
        is_public: false,
        is_markdown: false,
        date: diary.value.date || new Date(), // 本页面新建时，保留之前日记的时间，因为可能一次性补全很多之前的日记
        weather: 'sunny',
        category: diary.value.category,
        temperature: '',
        temperature_outside: '',
        mood: 'calm',
        tags: [],
        locationName: '',
        longitude: '',
        latitude: '',
        weatherText: '',
        weatherCode: '',
        humidity: '',
        windText: '',
        contextUpdatedAt: '',
    }
    // 新建日记时也记录原始数据
    Object.assign(diaryOrigin.value, diary.value)
    hasTriedAutoRefreshWeather.value = false
    tryRefreshWeatherForTodayDiary()
    updateDiaryIcon()
    nextTick(checkLocalDraft)
}

function tryRefreshWeatherForTodayDiary() {
    if (!isNew.value) return
    if (!Moment(diary.value.date).isSame(new Date(), 'day')) return
    if (hasTriedAutoRefreshWeather.value) return

    hasTriedAutoRefreshWeather.value = true
    resolveContextFromBrowser({silent: true})
}

function recoverDiary() {
    Object.assign(diary.value, diaryOrigin.value)
    recoverDiaryContent.value = {
        title: '',
        content: ''
    }
    projectStore.isDiaryNeedToBeRecovered = false
    clearLocalDraft()
}

function convertToServerVersion() { // 转换为数据库格式的日记
    let date = dateFormatter(diary.value.date)
    const title = projectStore.isHideContent ? diaryOrigin.value.title : diary.value.title
    const content = projectStore.isHideContent ? diaryOrigin.value.content : diary.value.content
    return {
        id: diary.value.id,
        date: date,
        title: title,
        content: content,
        temperature: temperatureProcessCTS(diary.value.temperature),
        temperature_outside: temperatureProcessCTS(diary.value.temperature_outside),
        weather: diary.value.weather,
        category: diary.value.category,
        date_create: date,
        date_modify: "",
        is_public: diary.value.is_public ? 1 : 0,
        is_markdown: diary.value.is_markdown ? 1 : 0,
        mood: diary.value.mood,
        tags: diary.value.tags,
        locationName: diary.value.locationName,
        longitude: diary.value.longitude,
        latitude: diary.value.latitude,
        weatherText: diary.value.weatherText,
        weatherCode: diary.value.weatherCode,
        humidity: diary.value.humidity,
        windText: diary.value.windText,
        contextUpdatedAt: diary.value.contextUpdatedAt,
    }
}

function applyDiaryContext(context) {
    diary.value.locationName = context.locationName || ''
    diary.value.longitude = context.longitude || ''
    diary.value.latitude = context.latitude || ''
    diary.value.weather = context.weather || diary.value.weather
    diary.value.weatherText = context.weatherText || ''
    diary.value.weatherCode = context.weatherCode || ''
    diary.value.temperature_outside = context.temperatureOutside || ''
    diary.value.humidity = context.humidity || ''
    diary.value.windText = context.windText || ''
    diary.value.contextUpdatedAt = context.contextUpdatedAt || new Date().toISOString()
}

function resolveContextFromBrowser(options: {silent?: boolean} = {}) {
    if (!navigator.geolocation) {
        if (!options.silent) popMessage('warning', '浏览器不支持定位')
        return
    }
    isResolvingContext.value = true
    navigator.geolocation.getCurrentPosition(
        position => {
            diaryApi.resolveContext({
                longitude: position.coords.longitude,
                latitude: position.coords.latitude,
            })
                .then(res => {
                    applyDiaryContext(res.data)
                    if (!options.silent) popMessage('success', '天气与位置已识别')
                })
                .catch(err => {
                    if (!options.silent) popMessage('warning', err.message || '天气位置识别失败', null, 4)
                })
                .finally(() => {
                    isResolvingContext.value = false
                })
        },
        error => {
            isResolvingContext.value = false
            if (!options.silent) popMessage('warning', error.message || '定位授权失败', null, 4)
        },
        {enableHighAccuracy: false, timeout: 8000, maximumAge: 1000 * 60 * 20}
    )
}

function resolveContextFromCity(city: string) {
    if (!city.trim()) {
        popMessage('warning', '请先输入城市')
        return
    }
    isResolvingContext.value = true
    diaryApi.resolveContext({city})
        .then(res => {
            applyDiaryContext(res.data)
            popMessage('success', '天气与位置已识别')
        })
        .catch(err => {
            popMessage('warning', err.message || '天气位置识别失败', null, 4)
        })
        .finally(() => {
            isResolvingContext.value = false
        })
}

function clearDiaryContext() {
    diary.value.locationName = ''
    diary.value.longitude = ''
    diary.value.latitude = ''
    diary.value.weatherText = ''
    diary.value.weatherCode = ''
    diary.value.humidity = ''
    diary.value.windText = ''
    diary.value.contextUpdatedAt = ''
    diary.value.temperature_outside = ''
}
</script>

<style lang="scss">
@use "edit" as *;
</style>
