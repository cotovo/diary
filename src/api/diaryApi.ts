import request  from '../request.ts'
import {
    EntityDiaryFromServer,
    EntityDiaryFromServerCategoryOnly,
    EntityDiaryFromServerTitleOnly,
    DiarySearchParams,
    DiarySearchParamsForCalendar,
    DiarySubmitEntity,
    ResponseDiaryAdd
} from "@/view/DiaryList/Diary.ts";
import {CategoryEntity} from "../entity/Category.ts";

export interface DiaryStorageStatus {
    dataDir: string
    entriesDir: string
    backupsDir: string
    trashDir: string
    indexPath: string
    diaryCount: number
    markdownFileCount: number
    backupCount: number
    trashCount: number
    latestBackup: string
    indexHealthy: boolean
    missingFiles: string[]
}

export interface DiaryFullExport {
    exportedAt: string
    version: number
    storage: DiaryStorageStatus
    entries: Array<EntityDiaryFromServer>
}

export interface DiaryContextPayload {
    city?: string
    longitude?: string | number
    latitude?: string | number
}

export interface DiaryContextResult {
    locationName: string
    longitude: string
    latitude: string
    weather: string
    weatherText: string
    weatherCode: string
    temperatureOutside: string
    humidity: string
    windText: string
    contextUpdatedAt: string
}

export default {
    // 所有类别列表，不需要登录就能访问
    getCategoryAll(): Promise<{
        success: boolean,
        data: Array<CategoryEntity>,
        message: string
    }> {
        return request('get',    null, null,'diary-category/list')},

    list(params: DiarySearchParams, signal?: AbortSignal): Promise<{
        success: boolean,
        data: Array<EntityDiaryFromServer>,
        message: string
    }>  {
        return request('get'   , params, null, 'diary/list', undefined, signal)}  ,


    add(requestData: DiarySubmitEntity): Promise<ResponseDiaryAdd>   {
        return request('post'  , {}, requestData, 'diary/add')}   ,
    modify(requestData: DiarySubmitEntity){
        return request('put'   , {}, requestData, 'diary/modify')},
    delete(requestData: {diaryId: number}){
        return request('delete', {}, requestData, 'diary/delete')},
    detail(params: {diaryId: number}): Promise<{
        success: boolean,
        data: EntityDiaryFromServer,
        message: string
    }>{
        return request('get',    params,null, 'diary/detail')},
    getDiaryWithTitleKeyword(
        params: { keyword: string }): Promise<{
        success: boolean,
        data: EntityDiaryFromServer,
        message: string
    }> {
        return request('get', params, null, 'diary/get-diary-content-with-keyword')
    },
    // 导出用户所有日记
    export(params: DiarySearchParams)  {
        return request('get'   , params, null, 'diary/export', 120000)}  ,
    exportFull(params: DiarySearchParams): Promise<{
        success: boolean,
        data: DiaryFullExport,
        message: string
    }>  {
        return request('get', params, null, 'diary/export-full', 120000) as Promise<{
            success: boolean,
            data: DiaryFullExport,
            message: string
        }>
    },
    storageStatus(): Promise<{
        success: boolean,
        data: DiaryStorageStatus,
        message: string
    }> {
        return request('get', null, null, 'diary/storage/status') as Promise<{
            success: boolean,
            data: DiaryStorageStatus,
            message: string
        }>
    },
    backup(): Promise<{
        success: boolean,
        data: {backupPath: string, status: DiaryStorageStatus},
        message: string
    }> {
        return request('post', null, null, 'diary/backup', 120000) as Promise<{
            success: boolean,
            data: {backupPath: string, status: DiaryStorageStatus},
            message: string
        }>
    },
    rebuildIndex(dryRun = false): Promise<{
        success: boolean,
        data: {dryRun: boolean, nextId: number, entryCount: number, entries: Array<any>, status: DiaryStorageStatus},
        message: string
    }> {
        return request('post', null, {dryRun}, 'diary/rebuild-index', 120000) as Promise<{
            success: boolean,
            data: {dryRun: boolean, nextId: number, entryCount: number, entries: Array<any>, status: DiaryStorageStatus},
            message: string
        }>
    },
    trash(): Promise<{
        success: boolean,
        data: string[],
        message: string
    }> {
        return request('get', null, null, 'diary/trash') as Promise<{
            success: boolean,
            data: string[],
            message: string
        }>
    },
    restoreTrash(fileName: string): Promise<{
        success: boolean,
        data: {entry: EntityDiaryFromServer, status: DiaryStorageStatus},
        message: string
    }> {
        return request('post', null, {fileName}, 'diary/trash/restore', 120000) as Promise<{
            success: boolean,
            data: {entry: EntityDiaryFromServer, status: DiaryStorageStatus},
            message: string
        }>
    },
    resolveContext(payload: DiaryContextPayload): Promise<{
        success: boolean,
        data: DiaryContextResult,
        message: string
    }> {
        return request('post', null, payload, 'diary/context/resolve', 60000) as Promise<{
            success: boolean,
            data: DiaryContextResult,
            message: string
        }>
    },
    clear()  {
        return request('post'   , null, null, 'diary/clear')}  ,


    // 获取日记列表，列表中只包含标题
    listTitleOnly(params: DiarySearchParams | DiarySearchParamsForCalendar): Promise<{
        success: boolean,
        data: Array<EntityDiaryFromServerTitleOnly>,
        message: string
    }>  {
        return request('get'   , params, null, 'diary/list-title-only')}  ,

    // 获取日记列表，列表中只包含类别
    listCategoryOnly(params: DiarySearchParamsForCalendar): Promise<{
        success: boolean,
        data: Array<EntityDiaryFromServerCategoryOnly>,
        message: string,
    }>  {
        return request('get'   , params, null, 'diary/list-category-only')}  ,

    // 获取日记列表，包含所有字段
    listAll(params: DiarySearchParams): Promise<{
        success: boolean,
        data: Array<EntityDiaryFromServer>,
        message: string
    }>  {
        return request('get'   , params, null, 'diary/list-all')}  ,
}
