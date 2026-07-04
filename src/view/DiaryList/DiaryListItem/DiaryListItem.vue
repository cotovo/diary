<template>
    <div ref="listItem"
                 :class="['diary-list-item', {active: isActive}]"
                 @click="emit('click')"
                 :style="diaryItemStyle"
    >
        <i :class="['category']" :style="`background-color: ${statisticStore.getCategoryColor(diary.category)}`"></i>

        <span class="date">{{ diary.day }}</span>

        <div class="detail">
            <p class="title" v-if="projectStore.isHideContent">
                {{ diary.title.replace(/[^，。 \n]/g, '*') }}
            </p>
            <p class="title" v-else>
                {{ diary.title }}
            </p>

            <img alt="Content"
                 v-if="diary.content"
                 class="icon"
                 :src="contentIcon"/>
            <img :alt="diary.weather"
                 v-if="diary.weather"
                 class="icon"
                 :src="weatherIcon"/>
        </div>
    </div>
</template>

<script lang="ts" setup>
import SVG_ICONS from "@/assets/icons/SVG_ICONS.ts"
import {computed} from "vue";
import {useProjectStore} from "@/pinia/useProjectStore.ts";
import {EntityDiaryFromServerLocal} from "@/view/DiaryList/Diary.ts";
import { useStatisticStore } from "@/pinia/useStatisticStore.ts";
const projectStore = useProjectStore()
const statisticStore = useStatisticStore()

const props = withDefaults(defineProps<{
    isActive: boolean,
    diary: EntityDiaryFromServerLocal
}>(), {
    isActive: false
})

const emit = defineEmits<{
    (e: 'click'): void
}>()

const weatherIcon = computed(() => {
    if (props.isActive) {
        return SVG_ICONS.weather_icons[`${props.diary.weather}_white`]
    } else {
        if (props.diary.is_public === 1) {
            return SVG_ICONS.weather_icons[`${props.diary.weather}_active`]
        } else {
            return SVG_ICONS.weather_icons[props.diary.weather]
        }
    }
})
const diaryItemStyle = computed(() => {
    const color = statisticStore.getCategoryColor(props.diary.category)
    return `--entry-category-color: ${color}; --entry-category-soft: ${color}1a; --entry-category-border: ${color}55;`
})
const contentIcon = computed(() => {
    if (props.diary.is_markdown === 1){
        if (props.isActive){
            return SVG_ICONS.content_md_white
        } else {
            return SVG_ICONS.content_md
        }
    } else {
        if (props.isActive){
            return SVG_ICONS.content_white
        } else {
            return SVG_ICONS.content
        }
    }
})

</script>

<style lang="scss" scoped>
@use "list-item" as *;
</style>

