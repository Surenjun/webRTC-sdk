

/**
 * @Description: 类型注释
 * @author: Renjun Su
 * @date: 2023/2/13
*/


interface PARAMS {
    //websocket地址
    url: string
    //http接口url
    httpUrl:string
    peerId:string
    //发起方 | 接收方
    type: 'offer' | 'answer'
    //绑定的video元素
    myVideoEle: HTMLVideoElement | null
    answerELes: (HTMLVideoElement | null)[]
    onInvited: (userId:string) => void,
    onEndListen:(userId:string) => void,
    onOpen:() => void,
    iceServers:RTCIceServer[]
}

interface MESSAGEFn{
    log:(msg:string) => void,
    error:(msg:string) => void
}

interface StunConfig {
    turnConfig:{
        username:string,
        credential:'',
        urls:''
    }[]
    stunUrls:string[],
}

interface MESSAGE {
    type: MESSAGETYPE,
    peerId: string,
    sdp?: string,
    ice?: string
    status?: STATUS
}


//当前客户端的状态
enum STATUS {
    wait,
    open,
    connecting,
    closed,
}


enum MESSAGETYPE  {
    ICE = 'ice',
    PEER = 'peer',
    OFFER = 'offer',
    ANSWER = 'answer'
}

interface USERLIST{
  userId:string,
  avatar:string,
}[]

export {PARAMS,MESSAGEFn,MESSAGE,USERLIST ,MESSAGETYPE,STATUS,StunConfig};
