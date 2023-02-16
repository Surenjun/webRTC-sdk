import {PARAMS} from '../types';
/**
 * @Description: RTC客户端服务
 * @author: Renjun Su
 * @date: 2023/2/13
*/

class RTCPeer{

    //客户端id
    public currentPeerId: string | undefined;
    public myVideoEle: Element | null;

    private message:{
        log:(msg:string) =>void,
        error:(msg:string) => void
    };

    constructor (param:PARAMS) {
        this.message = {
            log (msg){
                console.log(msg);
            },
            error (msg){
                throw Error(msg);
            }
        };
        const {myVideoEle} = param;
        this.myVideoEle = myVideoEle
        this.init(param);
    }

    //创建socket服务，并监听
    private  init (param:PARAMS){
        const {url,onOpen,onError,onMessage,type,myVideoEle} = param;
        const {message} = this;

        //生成客户端id
        const peerId = crypto.randomUUID();
        this.currentPeerId = peerId;

        //连接远程服务器
        const socket = new WebSocket(`${url}?peerId=${peerId}`);

        //socket连接监听
        socket.onopen= async ()=> {
            message.log('信令服务器连接成功');
            // 心跳监听
            await (onOpen && onOpen());
            // await this.heartCheckFn(socket);
        };

        //socket错误监听
        socket.onerror = (err)=>{
            onError && onError();
            message.error('信令服务器连接失败');
        };

        //socket信息监听
        socket.onmessage = e => {
            const { type, sdp, iceCandidate } = JSON.parse(e.data);
            console.log(`收到服务器信息:${e.data}`);
            onMessage && onMessage(e.data);
        };
    }

    //socket心跳监听
    private async heartCheckFn (socket:WebSocket){
        const currentPeerId = this.currentPeerId;
        const heartCheck = {
            timeout: 3000,
            timeoutObj: null,
            serverTimeoutObj: null,
            start: function () {
                console.log(123);
                //@ts-ignore
                heartCheck.timeoutObj = setInterval(()=>{
                    try {
                        const pingStr = JSON.stringify({type:'ping',peerId:currentPeerId});
                        socket.send(pingStr);
                    }catch (e){
                        console.log(e);
                        //@ts-ignore
                        clearInterval(heartCheck.timeoutObj);
                    }
                },heartCheck.timeout);
            }
         };
        heartCheck.start();

    }

    //发起webRTC通话
    public async startPeer (){
       const myVideoEle = this.myVideoEle;
       const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
       // @ts-ignore
       //输出本地摄像头
       myVideoEle && (myVideoEle.srcObject = stream);



    }

    //结束webRTC通话
    public endPeer(){

    }



}

export default RTCPeer;
