import {defineStore} from "pinia"

import systemConfigApi from "@/api/systemConfigApi"
import {DEFAULT_SYSTEM_CONFIG, PublicSystemConfig} from "@/entity/SystemConfig"

function normalizeSystemConfig(rawConfig: Partial<PublicSystemConfig> = {}): PublicSystemConfig {
    return {
        hefeng_weather_api_key: String(rawConfig.hefeng_weather_api_key || '').trim(),
        hefeng_weather_api_host: String(rawConfig.hefeng_weather_api_host || '').trim()
    }
}

export const useSystemConfigStore = defineStore('systemConfigStore', {
    state: () => ({
        config: {...DEFAULT_SYSTEM_CONFIG} as PublicSystemConfig,
        isLoaded: false,
        isLoading: false
    }),
    actions: {
        APPLY_CONFIG(config: Partial<PublicSystemConfig>) {
            this.config = normalizeSystemConfig({
                ...this.config,
                ...config
            })
            this.isLoaded = true
        },
        async fetchConfig(force = false) {
            if (this.isLoading) {
                return this.config
            }
            if (this.isLoaded && !force) {
                return this.config
            }

            this.isLoading = true
            try {
                const res = await systemConfigApi.get()
                this.APPLY_CONFIG(res.data)
                return this.config
            } finally {
                this.isLoading = false
            }
        }
    }
})
