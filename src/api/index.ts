import request from "../utils/request";
import {USERLIST} from '../types/index'
//获取用户列表
export async function getUserList(params:{

}): Promise<ListRes> {
    return await request({
        url: '/userList',
        method: 'get',
        params
    })
}

type ListRes = USERLIST[]
