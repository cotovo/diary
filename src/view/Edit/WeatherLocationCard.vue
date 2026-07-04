<template>
    <section class="context-block weather-context-section">
        <div class="context-section-header">
            <h3>天气与位置</h3>
        </div>

        <div class="weather-summary">
            <div>
                <strong>{{ locationName || '未识别位置' }}</strong>
                <span>{{ weatherText || weather || '未识别天气' }}</span>
            </div>
            <div class="weather-temp">{{ temperatureOutside || '-' }}<small>℃</small></div>
        </div>

        <div class="weather-metrics" v-if="humidity || windText || contextUpdatedAt">
            <div>
                <span>湿度</span>
                <strong>{{ humidity || '--' }}</strong>
            </div>
            <div>
                <span>风况</span>
                <strong>{{ windText || '--' }}</strong>
            </div>
            <div>
                <span>更新</span>
                <strong>{{ updatedLabel || '--' }}</strong>
            </div>
        </div>

        <NForm label-placement="top" :show-feedback="false">
            <NGrid :cols="2" :x-gap="10" :y-gap="10" responsive="screen">
                <NFormItemGi label="室内温度">
                    <NInput
                        :value="temperatureInside"
                        placeholder="手动输入"
                        @update:value="value => emit('update:temperatureInside', value)"
                    />
                </NFormItemGi>
                <NFormItemGi label="室外温度">
                    <NInput
                        :value="temperatureOutside"
                        placeholder="自动识别"
                        @update:value="value => emit('update:temperatureOutside', value)"
                    />
                </NFormItemGi>
                <NFormItemGi label="城市" :span="2">
                    <NInputGroup>
                        <NInput v-model:value="cityKeyword" placeholder="输入城市手动识别"/>
                        <NButton :loading="loading" @click="emit('resolve-city', cityKeyword)">识别</NButton>
                    </NInputGroup>
                </NFormItemGi>
            </NGrid>
        </NForm>

        <div class="context-actions">
            <NButton secondary :loading="loading" @click="emit('resolve-location')">
                <template #icon><LocateFixed :size="16"/></template>
                使用当前位置
            </NButton>
            <NButton quaternary :disabled="!contextUpdatedAt" @click="emit('clear')">
                清除
            </NButton>
        </div>
    </section>
</template>

<script lang="ts" setup>
import {computed, ref} from "vue"
import {NButton, NForm, NFormItemGi, NGrid, NInput, NInputGroup} from "naive-ui"
import {LocateFixed} from "@lucide/vue"

const props = defineProps<{
    loading: boolean
    weather: string
    weatherText: string
    temperatureInside: string
    temperatureOutside: string
    locationName: string
    humidity: string
    windText: string
    contextUpdatedAt: string
}>()

const emit = defineEmits<{
    'update:temperatureInside': [value: string]
    'update:temperatureOutside': [value: string]
    'resolve-location': []
    'resolve-city': [value: string]
    'clear': []
}>()

const cityKeyword = ref('')
const updatedLabel = computed(() => {
    if (!props.contextUpdatedAt) return ''
    return new Date(props.contextUpdatedAt).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})
})
</script>
