import {PARAMS,MESSAGETYPE,MESSAGE,STATUS} from '../types';


/**
 * @Description: RTC客户端服务
 * @author: Renjun Su
 * @date: 2023/2/13
*/

class RTCPeer{

    //客户端id
    public currentPeerId?: string ;
    public myVideoEle?: HTMLVideoElement | null;
    public answerELes?: (HTMLVideoElement | null)[];
    public peer?: RTCPeerConnection;
    public status ?: STATUS;
    private socket?: WebSocket
    private events?: {
        onPlay?:()=>void
    }
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
        const {myVideoEle,answerELes} = param;
        this.myVideoEle = myVideoEle;
        this.answerELes = answerELes;
        this.status = 0;
        this.listenVideoPlay()
        this.init(param);
    }

    //创建socket服务，并监听
    private  init (param:PARAMS){
        const {url,onOpen,onError,onMessage,onPlay,type,myVideoEle} = param;
        const {message} = this;

        //生成客户端id
        const peerId = crypto.randomUUID();
        this.currentPeerId = peerId;

        //连接远程服务器
        const socket = new WebSocket(`${url}?peerId=${peerId}`);
        this.socket = socket;

        this.events = {
            onPlay
        }

        //socket连接监听
        socket.onopen= async ()=> {
            message.log('信令服务器连接成功');
            // 心跳监听
            await (onOpen && onOpen());
            this.startPeer()
        };

        //socket错误监听
        socket.onerror = (err)=>{
            onError && onError();
            message.error('信令服务器连接失败');
        };

        //socket信息监听
        socket.onmessage = e => {
            const {peer,currentPeerId,lisenSession,status} = this;
            // const { type, sdp, iceCandidate } = JSON.parse(e.data);
            const peers = JSON.parse(e.data);
            const remotePeers = peers.filter((peer:MESSAGE) => peer.peerId !== currentPeerId) || [];
            if(!remotePeers.length){
                return
            }

            //TODO 只考虑一对一的情况
            const { type, sdp, iceCandidate,peerId } = remotePeers[0];
            switch (type) {
                case MESSAGETYPE.ICE:
                    // ICE交换
                    peer!.addIceCandidate(iceCandidate);
                    return

                case MESSAGETYPE.ANSWER:
                    // 对方接受请求
                    peer!.setRemoteDescription(new RTCSessionDescription({ type:'answer', sdp }));
                    this.status = 1;
                    return

                case MESSAGETYPE.OFFER:
                    // 收到另外一端的请求
                    lisenSession(new RTCSessionDescription({ type:'offer', sdp }));
                    return;

            }
        };
    }

    private async peerListen(){
        const {peer,message,socket,currentPeerId,answerELes,events} = this;

        peer!.ontrack = e => {
            if (e && e.streams) {
                message.log('收到对方音频/视频流数据...');
                //@ts-ignore
                events?.onPlay()
                //@ts-ignore
                answerELes[0]!.srcObject = e.streams[0];
            }
        };

        peer!.onicecandidate = e => {

            if (e.candidate) {
                message.log('搜集并发送候选人');
                socket!.send(JSON.stringify({
                    peerId: currentPeerId,
                    type: `ice`,
                    iceCandidate: e.candidate
                }));
            } else {
                message.log('候选人收集完成！');
            }
        };

    }

    //创建本地sdp并传输
    private async startPeer (){
       const {message,socket,currentPeerId,answerELes} = this;

        // @ts-ignore
       const PeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
       !PeerConnection && message.error('当前浏览器不支持WebRTC！');
        this.peer = new PeerConnection();
        this.peerListen()

    }

    //发起通话请求
    public async startSession(){
        //获取本地摄像头
        const {peer,myVideoEle,message,socket,currentPeerId} = this;
        let stream: MediaStream;
        try {
            message.log('尝试调取本地摄像头/麦克风');
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            message.log('摄像头/麦克风获取成功！');
            // @ts-ignore
            myVideoEle.srcObject = stream
        } catch {
            message.error('摄像头/麦克风获取失败！');
            return;
        }

        stream.getTracks().forEach(track => {
            peer!.addTrack(track, stream);
        });

        message.log('创建本地SDP');
        const offer = await peer!.createOffer();
        await peer!.setLocalDescription(offer);
        const {type,sdp} = offer;
        //向服务器更新状态
        socket!.send(JSON.stringify({type:'offer',peerId:currentPeerId,sdp,status:STATUS.open}));
        message.log(`传输发起方本地SDP`);

    };

    //收到对方的sdp信息
    private lisenSession =  async (remotePeer:RTCSessionDescription)=>{
        const {message,socket,currentPeerId,peer} = this;
        let stream: MediaStream;
        try {
            message.log('尝试调取本地摄像头/麦克风');
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            message.log('摄像头/麦克风获取成功！');
            // @ts-ignore
            myVideoEle.srcObject = stream
        } catch {
            message.error('摄像头/麦克风获取失败！');
            return;
        }
        stream.getTracks().forEach(track => {
            peer!.addTrack(track, stream);
        });
        await peer!.setRemoteDescription(remotePeer);
        message.log('创建接收方（应答）SDP');
        const answer = await peer!.createAnswer();

        const {sdp}= answer
        this.status = 1;
        socket!.send(JSON.stringify({sdp,peerId:currentPeerId,type:'answer'}));

        await peer!.setLocalDescription(answer);
    }

    //摄像头输出
    private async listenVideoPlay(){
        const {myVideoEle,answerELes,message} = this;

        //TODO 目前只考虑一对一的情况
        //@ts-ignore
        myVideoEle!.onloadeddata = () => {
            message.log('播放本地视频');
            //@ts-ignore
            myVideoEle!.play();
        }
        //@ts-ignore
        answerELes[0]!.onloadeddata = () => {
            message.log('播放远程视频');
            //@ts-ignore
            answerELes[0]!.play();
        }

    }

    //结束webRTC通话
    public endPeer(){

    }




}

export default RTCPeer;
