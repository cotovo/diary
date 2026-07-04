<template>
    <section class="context-block weather-context-section">
        <div class="context-section-header">
            <h3>天气与位置</h3>
            <span class="free-source">免费天气</span>
        </div>

        <div class="weather-summary">
            <div class="weather-summary-main">
                <strong>{{ locationName || '等待识别位置' }}</strong>
                <span>{{ weatherLabel }}</span>
            </div>
            <div class="weather-temp">
                {{ normalizedOutsideTemperature }}<small>℃</small>
            </div>
        </div>

        <div class="weather-metrics">
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

        <NForm class="weather-form" label-placement="top" :show-feedback="false">
            <NGrid :cols="2" :x-gap="10" :y-gap="10" responsive="screen">
                <NFormItemGi label="室内温度">
                    <NInput
                        size="small"
                        :value="temperatureInside"
                        placeholder="手动输入"
                        @update:value="value => emit('update:temperatureInside', value)"
                    />
                </NFormItemGi>
                <NFormItemGi label="室外温度">
                    <NInput
                        size="small"
                        :value="temperatureOutside"
                        placeholder="自动识别"
                        @update:value="value => emit('update:temperatureOutside', value)"
                    />
                </NFormItemGi>
                <NFormItemGi label="城市" :span="2">
                    <NInputGroup class="city-resolve-group">
                        <NInput size="small" v-model:value="cityKeyword" placeholder="例如：上海"/>
                        <NButton size="small" :loading="loading" @click="emit('resolve-city', cityKeyword)">识别</NButton>
                    </NInputGroup>
                </NFormItemGi>
            </NGrid>
        </NForm>

        <div class="context-actions">
            <NButton secondary size="small" :loading="loading" @click="emit('resolve-location')">
                <template #icon><LocateFixed :size="16"/></template>
                使用当前位置
            </NButton>
            <NButton quaternary size="small" :disabled="!contextUpdatedAt" @click="emit('clear')">
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
const weatherTextMap: Record<string, string> = {
    sunny: '晴',
    cloudy: '多云',
    overcast: '阴',
    fog: '雾',
    sprinkle: '毛毛雨',
    rain: '雨',
    thunderstorm: '雷雨',
    snow: '雪',
    smog: '雾霾',
    sandstorm: '沙尘',
}
const weatherLabel = computed(() => {
    if (props.weatherText) return props.weatherText
    if (props.weather && weatherTextMap[props.weather]) return weatherTextMap[props.weather]
    return props.locationName ? '天气待更新' : '新日记会自动尝试识别'
})
const normalizedOutsideTemperature = computed(() => {
    const value = String(props.temperatureOutside ?? '').trim()
    return value && value !== '-273' ? value : '--'
})
const updatedLabel = computed(() => {
    if (!props.contextUpdatedAt) return ''
    return new Date(props.contextUpdatedAt).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})
})
</script>
