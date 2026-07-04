<template>
    <div class="indicator-list-inline">
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
.indicator-list-inline{
    padding: 0 10px;
    width: 100%;
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    cursor: pointer;
    display: flex;
    justify-content: stretch;
    flex-flow: row nowrap;
    transition: opacity var(--diary-transition);
    &:hover{
        opacity: 0.82;
    }
    .indicator-list-item{
        flex-shrink: 0;
        flex-grow: 1;
        height: 2px;
        &:nth-child(2n){
            margin-bottom: 0;
        }
        //&:first-child{
        //    border-radius: 0 0 0 $radius-mobile;
        //}
        //&:last-child{
        //    border-radius: 0 0 $radius-mobile 0;
        //}
    }
}


</style>
