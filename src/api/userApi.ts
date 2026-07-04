import request  from '../request.ts'

export default {
    login(requestData: {email?: string, password: string})         { return request('post', {}, requestData, 'user/login')}          ,
    logout()         { return request('post', {}, null, 'user/logout')}          ,
}
