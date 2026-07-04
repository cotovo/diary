export interface PublicSystemConfig {
    hefeng_weather_api_key: string
    hefeng_weather_api_host: string
}

export interface AdminSystemConfig extends PublicSystemConfig {}

export const DEFAULT_SYSTEM_CONFIG: PublicSystemConfig = {
    hefeng_weather_api_key: "",
    hefeng_weather_api_host: ""
}

export const DEFAULT_ADMIN_SYSTEM_CONFIG: AdminSystemConfig = {
    ...DEFAULT_SYSTEM_CONFIG
}
