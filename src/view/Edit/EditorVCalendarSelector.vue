<template>
    <div class="date-selector">
        <div class="date-set-item">
            <button class="button-date-change" type="button" aria-label="前一天" @click="dateMove(-1)">
                <ChevronLeft :size="18"/>
            </button>
            <DatePicker
                locale="zh"
                v-model="modelDate"
                mode="date"
                is24hr
                hide-time-header
                :attributes="attrs"
                :popover="popoverOptions"
            >
                <template #default="{ togglePopover }">
                    <div class="datetime" @click="() => togglePopover()">
                        <div class="date">{{dateFormatter(modelDate, 'yyyy.MM.dd')}}</div>
                        <div class="time">{{dateFormatter(modelDate, 'hh:mm')}}</div>
                    </div>
                </template>
                <template #footer>
                    <div class="p-2 pt-0">
                        <NButton size="small" secondary type="primary" block @click="moveToday">今天</NButton>
                        <TimePicker
                            v-model="modelDate"
                            :minute-simple="false"
                            orientation="vertical"/>
                    </div>
                </template>
            </DatePicker>

            <button class="button-date-change" type="button" aria-label="后一天" @click="dateMove(1)">
                <ChevronRight :size="18"/>
            </button>
        </div>
        <div class="date-meta">
            <div class="lunar">{{lunarObject.IMonthCn}}{{lunarObject.IDayCn}}</div>
            <div class="weekday">{{lunarObject.ncWeek}}</div>
        </div>
    </div>

</template>

<script lang="ts" setup>
import calendar from "js-calendar-converter" // 农历数据
import Moment from "moment/moment";
import { onMounted, ref, watch} from "vue";
import {LunarDateEntity} from "@/entity/LunarDate.ts";

import {DatePicker} from 'v-calendar';
import 'v-calendar/style.css';
import {dateFormatter} from "@/utility.ts";
import type {PopoverOptions} from "v-calendar";
import TimePicker from "@/view/Edit/TimePicker.vue";
import {NButton} from "naive-ui";
import {ChevronLeft, ChevronRight} from "@lucide/vue";

const emit = defineEmits(["dayChange"])
const modelDate = defineModel<Date>({ // v-model value
    required: true
})


// 显示时获取当前时间的农历值
onMounted(()=>{
    lunarObject.value = calendar.solar2lunar(
        modelDate.value.getFullYear(),
        modelDate.value.getMonth() + 1,
        modelDate.value.getDate()
    )
})

/**
 *  Calendar option
 */
const lunarObject = ref<LunarDateEntity>({})
const popoverOptions = ref<PopoverOptions>({
    visibility: 'click', // When the popover appears
    placement: 'bottom', // Where the popover appears
    autoHide: true, // Auto-hide popover based on visibility
    showDelay: 0, // Delay (ms) before popover is shown
    hideDelay: 0, // Delay (ms) before popover is hidden
})
const attrs = ref([
    {
        key: 'today',
        // highlight: true,
        dot: true, // 点状
        dates: new Date(),
    },
])

function moveToday() {
    // refCalendar.value.move(new Date())
    modelDate.value = new Date()
}

/**
 * Watches
 */

watch(modelDate, (newValue, oldValue) => {
    lunarObject.value = calendar.solar2lunar(
        newValue.getFullYear(),
        newValue.getMonth() + 1,
        newValue.getDate()
    )

    // 判断是否日期有变，day 有变，emit dayChange, 附带是否为今天的标识
    let dateMomentDiary = Moment(newValue)
    let dateMomentDiaryOrigin = Moment(oldValue)
    if ( dateMomentDiary.isSame(dateMomentDiaryOrigin, 'day')){
    } else {
        if (dateMomentDiary.isSame(new Date(), 'day')){
            emit('dayChange', true)
        } else {
            emit('dayChange', false)
        }
    }
})

function mouseWheelScrolled(event){
    event.preventDefault()
    if (event.ctrlKey){
        if (event.deltaY > 10){
            dateMove(1)
        } else if (event.deltaY < -10) {
            dateMove(-1)
        }
    } else {
        if (event.deltaY > 10){
            dateTimeMove(1)
        } else if (event.deltaY < -10) {
            dateTimeMove(-1)
        }
    }
}
// 日期前后移动
function dateMove(step: -1|0|1) {
    switch (step) {
        case -1:
        case 1:
            let dateTemp = Moment(modelDate.value)
            dateTemp.add(step, 'day')
            modelDate.value = dateTemp.toDate()
            break;
        case 0:
            modelDate.value = new Date()
            break;
    }
}
// 日期前后移动
function dateTimeMove(step: -1|0|1) {
    switch (step) {
        case -1:
        case 1:
            let dateTemp = Moment(modelDate.value)
            dateTemp.add(step, 'hour')
            modelDate.value = dateTemp.toDate()
            break;
        case 0:
            modelDate.value = new Date()
            break;
    }
}
</script>

<style lang="scss"></style>
