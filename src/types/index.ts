

/**
 * @Description: 类型注释
 * @author: Renjun Su
 * @date: 2023/2/13
*/


interface PARAMS {
    //websocket地址
    url: string
    //发起方 | 接收方
    type: 'offer' | 'answer'
    //绑定的video元素
    myVideoEle: HTMLElement | null
    answerELes: (HTMLElement | null)[]
    onError?: () => void,
    onOpen?: () => void
    onMessage?: (data: string) => void
}

interface MESSAGEFn{
    log:(msg:string) => void,
    error:(msg:string) => void
}

enum MESSAGETYPE  {
    PING = 'ping',
    PEER = 'peer',
    OFFER = 'offer',
    ANSWER = 'answer'
}

export {PARAMS,MESSAGEFn ,MESSAGETYPE};
