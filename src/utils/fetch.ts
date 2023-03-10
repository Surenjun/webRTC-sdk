import request from "./request"

interface IFetch {
    url: string;
    method?: string;
    data?: any;
    params?: any;
    contentType?: string;
}

export default async function api<T = any>(params: IFetch) {
    return await Common<T>(params);
}

async function Common<T = object>(arg: IFetch): Promise<T> {
    //取环境变量拿host
    
    const {url, data = {}, params = {}, method = 'get'} = arg;
    const options: any = {
        method
    };
    isEmpty(data) || (options.data = data);
    isEmpty(params) || (options.params = params);
    try {
      const res: any = await request(url, options)
      return res
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        return Promise.reject(e)
        // window.Raven && window.Raven.captureException(e);
    }
}

/**
 * 是否是空对象
 * @param param
 */
function isEmpty(param: Object) {
    return !Object.keys(param).length;
}
