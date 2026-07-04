<template>
    <div class="profile-page" :style="`min-height: ${projectStore.insets.windowsHeight}px`">
        <transition
            enter-active-class="animated-fast fadeIn"
            leave-active-class="animated-fast faceOut"
        >
            <div class="profile-panel" v-if="show">
                <header class="profile-header">
                    <NButton quaternary circle aria-label="返回" @click="router.go(-1)">
                        <template #icon><ArrowLeft :size="18"/></template>
                    </NButton>
                    <div>
                        <h1>个人资料</h1>
                        <p>用于日记署名、天气城市和个人头像</p>
                    </div>
                </header>

                <div class="avatar-row">
                    <label class="avatar-uploader" for="avatar">
                        <img
                            v-if="formUser.avatar"
                            :src="formUser.avatar + '-' + projectConfig.qiniu_style_suffix || SVG_ICONS.logo_icons.logo_avatar"
                            alt="头像"
                        >
                        <img v-else :src="SVG_ICONS.logo_icons.logo_avatar" alt="默认头像">
                        <span><Camera :size="16"/>更换头像</span>
                    </label>
                    <input type="file" accept="image/*" @change="uploadAvatar" id="avatar">
                    <div class="avatar-copy">
                        <strong>{{ formUser.nickname || '未设置昵称' }}</strong>
                        <span>{{ formUser.city || '未设置城市' }}</span>
                    </div>
                </div>

                <NForm class="profile-form" label-placement="top" :show-feedback="false">
                    <NFormItem label="昵称">
                        <NInput
                            v-model:value="formUser.nickname"
                            input-id="nickname"
                            placeholder="写日记时显示的名字"
                        />
                    </NFormItem>
                    <NFormItem label="手机号">
                        <NInput
                            v-model:value="formUser.phone"
                            input-id="phone"
                            placeholder="可选"
                            type="tel"
                        />
                    </NFormItem>
                    <NFormItem label="城市">
                        <NInput
                            v-model:value="formUser.city"
                            input-id="city"
                            placeholder="例如：上海"
                        />
                    </NFormItem>
                    <NFormItem label="经纬度">
                        <NInput
                            v-model:value="formUser.geolocation"
                            input-id="geolocation"
                            placeholder="城市识别后自动填入"
                            disabled
                        />
                    </NFormItem>
                </NForm>

                <footer class="profile-actions">
                    <NButton secondary @click="router.go(-1)">取消</NButton>
                    <NButton type="primary" @click.prevent="changeProfileSubmit">
                        <template #icon><Save :size="16"/></template>
                        保存资料
                    </NButton>
                </footer>
            </div>
        </transition>
    </div>
</template>


<script lang="ts" setup>
import userApi from "@/api/userApi.ts"
import fileApi from "@/api/fileApi.ts";
import * as qiniu from 'qiniu-js'
import axios from "axios";

import {popMessage, setAuthorization, getAuthorization} from "@/utility.ts";
import {useProjectStore} from "@/pinia/useProjectStore.ts";
import {useSystemConfigStore} from "@/pinia/useSystemConfigStore.ts";

const projectStore = useProjectStore();
const systemConfigStore = useSystemConfigStore()
import {computed, onMounted, ref, watch} from "vue";
import {useRouter} from "vue-router";
import SVG_ICONS from "@/assets/icons/SVG_ICONS.ts";
import {UserProfileEntity} from "@/entity/User.ts";
import {NButton, NForm, NFormItem, NInput} from "naive-ui";
import {ArrowLeft, Camera, Save} from "@lucide/vue";

const router = useRouter()
const projectConfig = computed(() => systemConfigStore.config)


const show = ref(false)
let avatarFile: File | null = null // 头像文件
const formUser = ref<UserProfileEntity>({
    nickname: '',
    phone: '',
    avatar: '',
    city: '',
    geolocation: '',
})

onMounted(()=>{
    show.value = true
    document.title = '日记 - 资料修改' // 变更标题
    formUser.value.nickname = getAuthorization()?.nickname || ''
    formUser.value.phone = getAuthorization()?.phone || ''
    formUser.value.avatar = getAuthorization()?.avatar || ''
    formUser.value.city = getAuthorization()?.city || ''
    formUser.value.geolocation = getAuthorization()?.geolocation || ''

    // 在给 formUser.city 赋值之后再添加其 watcher
    watch(() => formUser.value.city, newValue => {
        if (newValue.trim().length > 0){
            formUser.value.city = newValue
            if (!projectConfig.value.hefeng_weather_api_host || !projectConfig.value.hefeng_weather_api_key) {
                formUser.value.geolocation = ''
                return
            }
            // 根据城市名获取经纬度
            axios
                .get(`https://${projectConfig.value.hefeng_weather_api_host}/geo/v2/city/lookup`,
                    {
                        params: {
                            key: projectConfig.value.hefeng_weather_api_key,
                            location: newValue, // 县区名
                            number: 1, // 返回数据数量 1-20
                        }
                    })
                .then(res => {
                    if (res.data.code === '200'){
                        if (res.data.location.length > 0){
                            formUser.value.geolocation = `${res.data.location[0].lon},${res.data.location[0].lat}`
                        } else {
                            formUser.value.geolocation = ''
                        }
                    }
                })
        }
    })
})

function uploadAvatar(event: Event){
    if (getAuthorization()?.email === projectConfig.value.demo_account){
        popMessage('danger', '演示账户不允许修改资料', ()=>{}, 3)
        return
    }
    let inputEl = event.target as HTMLInputElement
    if (inputEl.files!.length > 0){
        avatarFile = inputEl.files![0]
        if (!/image\/.*/.test(avatarFile.type)){
            popMessage('warning', '请选择图片文件')
            inputEl.value = '' // 清空 Input 内容
            return
        }
        if (avatarFile.size > 1024 * 1024 * 3){
            popMessage('warning', '头像文件应小于 3M', ()=>{}, 3)
            inputEl.value = '' // 清空 Input 内容
            return
        }

        fileApi
            .getUploadToken({
                bucket: projectConfig.value.qiniu_bucket_name
            })
            .then(res => {
                console.log('get token success')
                // 上传文件
                const observer = {
                    next: res => {
                        console.log('next: ',res)
                    },
                    error: err => {
                        console.log(err)
                    },
                    complete: res => {
                        // res = {hash: 'hash', key: 'key'}
                        console.log('complete: ',res)
                        formUser.value.avatar = projectConfig.value.qiniu_img_base_url + res.key
                    }
                }
                const observable = qiniu.upload(avatarFile, null, res.data, {}, {})
                const subscription = observable.subscribe(observer) // 上传开始
                // subscription.unsubscribe() // 上传取消
            })
            .catch(err => {
                popMessage('danger', '获取上传 token 失败', ()=>{}, 3)
            })
    }
}
function changeProfileSubmit() {
    userApi
        .setProfile(formUser.value)
        .then(res => {
            // update auth
            setAuthorization(
                {
                    nickname: res.data.nickname,
                    uid: res.data.uid,
                    email: res.data.email,
                    phone: res.data.phone,
                    avatar: res.data.avatar,
                    token: res.data.password,
                    group_id: res.data.group_id,
                    city: res.data.city,
                    geolocation: res.data.geolocation,
                }
            )
            popMessage('success', '修改成功', ()=>router.go(-1), 1)

        })
        .catch(err => {
            popMessage('danger', err.message, ()=>{}, 5)
        })
}
</script>


<style lang="scss">
@use "./change-profile" as *;
</style>
