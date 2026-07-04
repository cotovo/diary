<template>
    <div class="not-found-page" :style="`min-height: ${projectStore.insets.windowsHeight}px`">
        <div class="not-found">
            <div class="logo">
                <img :src="SVG_ICONS.logo_icons.logo_server_error" alt="logo error">
            </div>
            <h1>访问的页面不存在</h1>
            <RouterLink class="home-link" to="/">返回主页</RouterLink>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {useProjectStore} from "../pinia/useProjectStore.ts";
import SVG_ICONS from "@/assets/icons/SVG_ICONS.ts";
const projectStore = useProjectStore()
</script>

<style scoped lang="scss">
.not-found-page{
    min-height: 100dvh;
    display: flex;
    flex-flow: column nowrap;
    justify-content: center;
    align-items: center;
    padding: 24px;
    background: var(--diary-bg);
    color: var(--diary-ink);
}

.not-found{
    width: min(100%, 360px);
    padding: 28px;
    border: 1px solid var(--diary-border);
    border-radius: var(--diary-radius);
    background: var(--diary-surface);
    box-shadow: var(--diary-card-shadow);
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-flow: column nowrap;
    h1{
        color: var(--diary-ink);
        font-size: 17px;
        font-weight: 700;
        margin: 16px 0 14px;
    }
    .logo{
        img{
            display: block;
            width: 80px;
        }
    }
}
.home-link{
    color: var(--diary-accent);
    line-height: 1.5;
    &:hover{
        color: var(--diary-accent-pressed);
        text-decoration: underline;
    }
}
</style>
