<template>
    <MenuPanelContainer>
        <ul class="menu-category-list">
            <li class="menu-category-item" v-for="(item, index) in useStatisticStore().categoryAll" :key="index"
                :style="categoryMenuItemStyle(item)"
                role="button"
                tabindex="0"
                @click="toggleCategory(item)"
                @keydown.enter.prevent="toggleCategory(item)"
                @keydown.space.prevent="toggleCategory(item)"
            >
                <div>{{ item.name }}<span class="count">{{ useStatisticStore().statisticsCategory[item.name_en] }}</span></div>
            </li>
        </ul>

        <button
            v-if="projectStore.filteredCategories.length"
            class="menu-category-clear"
            type="button"
            @click="clearCategories"
        >
            清空分类筛选
        </button>
    </MenuPanelContainer>
</template>

<script lang="ts" setup>

import {useProjectStore} from "@/pinia/useProjectStore.ts";
import {CategoryEntity} from "@/entity/Category.ts";
import MenuPanelContainer from "@/framework/MenuPanelContainer.vue";
import {useStatisticStore} from "@/pinia/useStatisticStore.ts";
const projectStore = useProjectStore()

function toggleCategory(category: CategoryEntity){
    let index = projectStore.filteredCategories.indexOf(category.name_en)
    if ( index > -1) {
        projectStore.filteredCategories.splice(index, 1)
    } else {
        projectStore.filteredCategories.push(category.name_en)
    }
    projectStore.SET_FILTERED_CATEGORIES(projectStore.filteredCategories)
    projectStore.isListNeedBeReload = true
}
function categoryMenuItemStyle(category: CategoryEntity){
    if (projectStore.filteredCategories.indexOf(category.name_en) > -1){
        return `background-color: ${category.color}; border: 1px solid ${category.color};`
    } else {
        return ``
    }
}
function clearCategories() {
    projectStore.SET_FILTERED_CATEGORIES([])
    projectStore.isListNeedBeReload = true
}

</script>
