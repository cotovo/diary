<template>
    <div class="indicator-list">
        <div class="indicator-list-item"
             v-for="(item, index) in useStatisticStore().categoryAll" :key="index"
             :style="`border-color: ${item.color}; ${indicatorItemStyle(item)}`"
        />
    </div>
</template>

<script lang="ts" setup>
import {CategoryEntity} from "@/entity/Category.ts";
import {useProjectStore} from "@/pinia/useProjectStore.ts";
import {useStatisticStore} from "@/pinia/useStatisticStore.ts";
const projectStore = useProjectStore()

function indicatorItemStyle(category: CategoryEntity): string{
    if (projectStore.filteredCategories.indexOf(category.name_en) > -1){
        return `background-color: ${category.color};`
        // return `border-bottom: 1px solid ${category.color};`
    } else {
        return ``
    }
}

</script>

<style lang="scss" scoped>
.indicator-list{
    width: 88px;
    cursor: pointer;
    height: 45px;
    padding: 13px 0;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    flex-flow: row wrap;
    transition: opacity var(--diary-transition);
    &:hover{
        opacity: 0.82;
    }
    .indicator-list-item{
        margin-right: 3px;
        margin-bottom: 3px;
        flex-shrink: 0;
        border: 1px solid rgba(255, 255, 255, 0.72);
        height: 8px;
        width: 8px;
        border-radius: 2px;
        &:nth-child(2n){
            margin-bottom: 0;
        }
    }
}


</style>
