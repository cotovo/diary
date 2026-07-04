<template>
    <!--加载动画-->
    <div v-if="loading" class="loading">
        <div class="loading-1 loading-item"></div>
        <div class="loading-2 loading-item"></div>
        <div class="loading-3 loading-item"></div>
        <div class="loading-4 loading-item"></div>
    </div>
</template>

<script lang="ts" setup>
withDefaults(defineProps<{
    loading: boolean
}>(), {
    loading: false
})
</script>

<style scoped lang="scss">
.loading{
    box-sizing: content-box;
    height: 30px;
    padding: 8px 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    .loading-item{
        width: 3px;
        margin-right: 4px;
        &:last-child{
            margin-right: 0;
        }
    }
    .loading-1{
        animation: load-frame-1 1.2s infinite linear 0s;
        background-color: var(--diary-danger);
    }
    .loading-2{
        animation: load-frame-2 1.2s infinite linear 0s;
        background-color: var(--diary-accent);
    }
    .loading-3{
        animation: load-frame-3 1.2s infinite linear 0s;
        background-color: var(--diary-success);

    }
    .loading-4{
        animation: load-frame-4 1.2s infinite linear 0s;
        background-color: var(--diary-warning);
    }
}

@keyframes load-frame-1 {
    0% {height: 5px}
    25% {height: 20px}
    50% {height: 30px}
    75% {height: 20px}
    100% {height: 5px}
}
@keyframes load-frame-2 {
    0% {height: 20px}
    25% {height: 30px}
    50% {height: 20px}
    75% {height: 5px}
    100% {height: 20px}
}
@keyframes load-frame-3 {
    0% {height: 30px}
    25% {height: 20px}
    50% {height: 5px}
    75% {height: 20px}
    100% {height: 30px}
}
@keyframes load-frame-4 {
    0% {height: 20px}
    25% {height: 5px}
    50% {height: 20px}
    75% {height: 30px}
    100% {height: 20px}
}

</style>
