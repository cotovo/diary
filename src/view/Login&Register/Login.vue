<template>
    <div class="body-login-bg" :style="`min-height: ${projectStore.insets.windowsHeight}px`">
        <transition
            enter-active-class="animated-fast fadeIn"
            leave-active-class="animated-fast faceOut"
        >
            <div class="body-login" v-if="show">
                <div class="logo-wrapper">
                    <div class="logo">
                        <img :src="SVG_ICONS.logo_icons.logo_rounded" alt="LOGIN-LOGO">
                    </div>
                </div>

                <form method="post" id="regForm" @submit.prevent="loginSubmit">
                    <div class="input-group">
                        <label for="password">密码</label>
                        <div class="password-field">
                            <input
                                v-model="password"
                                name="password"
                                :type="isPasswordVisible ? 'text' : 'password'"
                                id="password"
                                autocomplete="current-password"
                                autofocus>
                            <button type="button" @click="isPasswordVisible = !isPasswordVisible">
                                {{ isPasswordVisible ? '隐藏' : '显示' }}
                            </button>
                        </div>
                    </div>
                    <button :class="['btn', 'mt-8', verified ? 'btn-active' : 'btn-inactive']"
                            :disabled="!verified || loginLabel === '登录中...'"
                            type="submit">{{ loginLabel }}</button>
                </form>
                <div :class="['footer', {center: !is_show_demo_account}]">
                    <a v-if="is_show_demo_account" @click="useTestAccount">试用演示账户</a>
                </div>
                <div class="copyright">
                    <a class="project-name" target="_blank"
                       href="http://kylebing.cn/diary/#/share/6766">{{ packageInfo.nameZh }}</a>
                    <span class="version ml-1">v{{ packageInfo.version }}</span>
                    <span class="ml-1"> {{ packageInfo.dateInit.substring(0,4) }}-{{ packageInfo.dateModify.substring(0,4) }}</span>
                </div>
            </div>


        </transition>
    </div>
</template>

<script lang="ts" setup>
import packageInfo from "../../../package.json"

import userApi from "@/api/userApi.ts"
import billApi from "@/api/billApi.ts";

import {popMessage, setAuthorization, setBillKeys} from "@/utility.ts";
import {useProjectStore} from "@/pinia/useProjectStore.ts";
import {useSystemConfigStore} from "@/pinia/useSystemConfigStore.ts";
const projectStore = useProjectStore()
const systemConfigStore = useSystemConfigStore()
import {computed, onMounted, ref} from "vue";
import {useRouter} from "vue-router";
import SVG_ICONS from "@/assets/icons/SVG_ICONS.ts";

const router = useRouter()

const show = ref(false)
onMounted(()=> {
    show.value = true
    document.title = '日记 - 登录' // 变更标题
})



const password = ref('')
const isPasswordVisible = ref(false)
const loginLabel = ref('登录')
const systemConfig = computed(() => systemConfigStore.config)
const is_show_demo_account = computed(() => systemConfig.value.is_show_demo_account)
const passwordVerified = computed(() => {
    return password.value.length > 0
})
const verified = computed(() => {
    return passwordVerified.value
})


function loginSubmit() {
    if (verified.value){
        loginLabel.value = '登录中...'
        let requestData = {
            password: password.value,
        }
        userApi
            .login(requestData)
            .then(res => {
                // set authorization
                setAuthorization({
                    nickname : res.data.nickname,
                    uid : res.data.uid,
                    email : res.data.email,
                    phone : res.data.phone,
                    avatar : res.data.avatar,
                    token : res.data.password,
                    group_id : res.data.group_id,
                    city : res.data.city,
                    geolocation : res.data.geolocation,
                })
                getBillKeys()
                popMessage('success', res.message, () => router.push({name: 'Index'}))
                loginLabel.value = '登录成功'
            })
            .catch(err => {
                loginLabel.value = '登录失败'
                popMessage('danger', err.message, () => loginLabel.value = '登录', 5)
            })
    } else {

    }
}

function getBillKeys() {
    billApi
        .keys()
        .then(res => {
            setBillKeys(res.data)
        })
        .catch(err => {
            popMessage('warning', err.message)
        })
}
function useTestAccount() {
    password.value = systemConfig.value.demo_account_password
}


</script>
<style lang="scss" scoped>
@use "../../scss/plugin" as *;
.copyright{
    left: 0;
    width: 100%;
    position: fixed;
    bottom: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: $fz-tiny;
    line-height: 1;
    color: $text-subtitle;
    a{
        color: $dark-text-subtitle;

        &:hover{
            color: $color-main;
            text-decoration: underline;
        }
    }
    .version{
        color: $dark-text-subtitle;
    }
    .project-name{
        font-weight: bold;
    }
    .valid-date{
    }
    .version{
    }
    .password{
        color: $dark-text-subtitle;
        @extend .btn-like;
        &:hover{
            color: $color-main;
        }
    }
}
</style>


