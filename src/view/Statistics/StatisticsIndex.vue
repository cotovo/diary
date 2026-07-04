<template>
    <div class="statistic-container" :style="`min-height: ${projectStore.insets.windowsHeight}px`">

        <PageHeader title="写作统计" subtitle="日记数量、类别和天气趋势">
            <div class="main-statistic">
                <div class="main-statistic-item">
                    <div class="label">共享</div>
                    <div class="number value">{{ statisticStore.statisticsCategory.shared}}</div>
                </div>
                <div class="main-statistic-item">
                    <div class="label">总计</div>
                    <div class="number value">{{ statisticStore.statisticsCategory.amount }}</div>
                </div>
            </div>
        </PageHeader>

        <div v-if="isLoading" class="statistic-loading">
            <Loading :loading="isLoading"/>
        </div>

        <MenuPanelContainer v-else>
            <div class="statistic-content">
                <StatisticCharts/>
            </div>
        </MenuPanelContainer>

    </div>
</template>

<script lang="ts" setup>
import statisticApi from "@/api/statisticApi.ts"
import PageHeader from "@/framework/pageHeader/PageHeader.vue"
import Loading from "@/components/Loading.vue"
import StatisticCharts from "@/view/Statistics/Diary/StatisticCharts.vue";
import {useStatisticStore} from "@/pinia/useStatisticStore.ts";
import {useProjectStore} from "@/pinia/useProjectStore.ts";

const projectStore = useProjectStore()
const statisticStore = useStatisticStore()
import {onMounted, ref} from "vue";
import MenuPanelContainer from "@/framework/MenuPanelContainer.vue";


const isLoading = ref(false)

onMounted(()=>{
    getStatistic()
})

// 获取日记统计信息
function getStatistic() {
    statisticApi
        .category()
        .then(res => {
            statisticStore.statisticsCategory = res.data
            let keys = Object.keys(res.data)
            keys = keys.filter(item =>  item !== 'amount' && item !== 'shared')
            statisticStore.dataArrayCategory =  keys.map(key => {
                return {
                    name: statisticStore.categoryNameMap.get(key),
                    key: key,
                    value: res.data[key]
                }
            })
        })
    statisticApi
        .year()
        .then(res => {
            statisticStore.statisticsYear = res.data
            if (res.data){
                statisticStore.dataArrayYear = res.data.reverse().map(year => {
                    return {
                        name: year.year,
                        value: year.count
                    }
                })
            }
        })
}

</script>

<style lang="scss" scoped>
.main-statistic{
    display: flex;
    align-items: center;
    gap: 8px;
    .main-statistic-item{
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border-radius: var(--diary-radius-sm);
        background: var(--diary-surface-muted);
        .label{
            font-size: 12px;
            color: var(--diary-muted);
        }
        .value{
            font-size: 14px;
            font-weight: 750;
            color: var(--diary-ink);
        }
    }
}

.statistic-loading {
    padding: 32px 0;
}

.statistic-content {
    display: grid;
    gap: 16px;
}

</style>
