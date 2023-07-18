import {PARAMS,MESSAGETYPE,MESSAGE,STATUS,USERLIST} from '../types';
import {getUserList} from "../api";
import DuolunSocket from "./sockert";
import sockert from "./sockert";

/**
 * @Description: RTC客户端服务
 * @author: Renjun Su
 * @date: 2023/2/13
*/

class RTCPeer{

    //客户端id
    public currentPeerId?: string
    public myVideoEle?: HTMLVideoElement | null
    public answerELes?: (HTMLVideoElement | null)[]
    public peer?: RTCPeerConnection | null;
    public stream?:MediaStream
    public connectTrack?:RTCRtpSender

    //是否是发起方
    public isOffer?:Boolean
    public status ?: STATUS
    //@ts-ignore
    public onLeave:(userId :string)=>void
    //@ts-ignore
    public onInvited:(userId :string)=>void
    /*******************************************************************************************************/

    private duolunsocket?:typeof DuolunSocket.prototype
    private events?: {
        onPlay?:()=>void
        onInvited?:()=>void
    }
    private message:{
        log:(msg:string) =>void,
        error:(msg:string) => void
    };

    private iceServers:RTCIceServer[]

    constructor (param:PARAMS) {
        this.message = {
            log (msg){
                console.log(msg);
            },
            error (msg){
                throw Error(msg);
            }
        };
        const {myVideoEle,answerELes,iceServers} = param;
        this.myVideoEle = myVideoEle;
        this.answerELes = answerELes;
        this.iceServers = iceServers
        this.status = 0;
        this.listenVideoPlay()
        this.init(param);

        this.onLeave = (userId) =>{
            param.onEndListen(userId);
            this.peer?.close();
        }

        this.onInvited = (userId) =>{
            param.onInvited(userId)
        }

    }

    //创建socket服务，并监听
    private  init =  (param:PARAMS) => {
        const {url,onInvited,peerId} = param;
        const {startPeer,listenVideoPlay,handleMessage} = this;
        //连接远程服务器
        const duolunSocket = new DuolunSocket(url,peerId)
        this.duolunsocket = duolunSocket

        listenVideoPlay();
        //创建本地sdp
        startPeer()

        // TODO 时间通信待封装
        // this.events = {onInvited}

        // TODO http服务地址初始化，待替换
        //@ts-ignore
        window.baseHttpUrl = param.httpUrl;


        //socket信息监听
        duolunSocket.socket.onmessage = async e => {
            await handleMessage(e.data)
        };
    }

    //socket消息处理
    private  handleMessage = async (data:string) => {
        const socketMessage = JSON.parse(data);
        const {startSession,listenSession,peer,isOffer,duolunsocket,onInvited,onLeave} = this;
        const {eventName,data:{candidate,sdp,room,userID}} = socketMessage;

        switch (eventName.split('__')[1]){

            //离开
            case 'leave':
                await onLeave(userID)
                break;

            //收到对方邀请通话
            case 'invite':
                await onInvited(room)
                break;

            //对方接受通话邀请
            case 'new_peer':
                await startSession('__offer',userID)
                break;

            //添加ice证书
            case 'ice_candidate':
                if(isOffer){
                    const ufragIndex = candidate.split(' ').indexOf('ufrag')
                    console.log('收到对方的ice证书',candidate);

                    await peer!.addIceCandidate({
                        candidate,
                        sdpMLineIndex:0,
                        sdpMid:'0',
                        usernameFragment:candidate.split(' ')[ufragIndex+1]
                    });


                }
                break;

            case 'answer':
                await peer!.setRemoteDescription(new RTCSessionDescription({ type:'answer', sdp }));
                this.status = 1;
                break

            case 'offer':
                await listenSession(new RTCSessionDescription({ type:'offer', sdp }));
                break;
        }
    }

    private peerListen = ()=> {
        const {peer,message,answerELes,events,duolunsocket,currentPeerId} = this;


        if(peer){
            peer!.ontrack = e => {
                if (e && e.streams) {
                    message.log('收到对方音频/视频流数据...');
                    //@ts-ignore
                    events?.onPlay()
                    //@ts-ignore
                    answerELes[0]!.srcObject = e.streams[0];
                }
            };

            peer!.onconnectionstatechange = e =>{
                if(peer.connectionState === 'connected'){
                    console.log('webrtc服务连接成功');
                }
                if(peer.connectionState === 'disconnected'){
                    console.log('webrtc服务连接断开');
                }
            };

            let i = 0;
            peer!.onicecandidate = e => {

                // console.log('当前ICE状态:', peer.iceConnectionState);

                i+=1;
                if (e.candidate) {
                    message.log('搜集并发送候选人');
                    //@ts-ignore
                    duolunsocket!.sendCandidate(currentPeerId,e.candidate.candidate)
                } else {
                    message.log('候选人收集完成！');
                }
            };
        }
    }

    //创建本地sdp并传输
    private startPeer  = () => {
       const {message,peerListen,iceServers} = this;

        // @ts-ignore
       const PeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
       !PeerConnection && message.error('当前浏览器不支持WebRTC！');

        this.peer = new PeerConnection({iceServers});

        peerListen()
    }


    //发起通话请求
    public  startSession = async (eventName:'__offer' | '__answer',userID:string)=>{
        //获取本地摄像头
        const {peer,myVideoEle,message,duolunsocket,currentPeerId} = this;
        let stream: MediaStream;
        try {
            // 只开启音频
            // stream = await navigator.mediaDevices.getUserMedia({ video: {frameRate:60 }, audio: true });
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            message.log('摄像头/麦克风获取成功！');
            // @ts-ignore
            myVideoEle.srcObject = stream
        } catch {
            message.error('摄像头/麦克风获取失败！');
            return;
        }

        stream.getTracks().forEach(track => {
            console.log('视频流轨道',track);
            this.connectTrack = peer!.addTrack(track, stream);
        });
        this.stream = stream

        message.log('创建本地SDP');
        const offer = await peer!.createOffer();
        await peer!.setLocalDescription(offer);
        const {sdp} = offer;
        this.isOffer = true

        //向服务器更新状态
        // @ts-ignore
        duolunsocket!.sendOffer(eventName,userID,sdp)

    };

    //收到对方的sdp信息
    private listenSession =  async (remotePeer:RTCSessionDescription)=>{
        const {message,duolunsocket,peer,currentPeerId} = this;
        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

        // @ts-ignore
        duolunsocket!.sendOffer('__answer',currentPeerId,sdp)
        await peer!.setLocalDescription(answer);
    }

    //摄像头输出
    private listenVideoPlay = () => {
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

    //邀请别人进入房间 type:音频｜视频
    public inviteRoom = (type:1|2,remoteUserId:string|number,room:string) =>{
        const {duolunsocket,peer} = this;
        duolunsocket?.inviteRoom(type,remoteUserId,room)
    }

    //手动挂断
    public endRTC = async (userId:string)=>{
        const {
            duolunsocket,
            peer,
            stream,
            connectTrack,
            myVideoEle,
            answerELes
        } = this;
        await duolunsocket?.endRTC(userId);
        //@ts-ignore
        myVideoEle?.srcObject?.getTracks().forEach(track => track.stop());
        //@ts-ignore
        answerELes?.srcObject?.getTracks().forEach(track => track.stop());

        peer?.removeTrack(connectTrack!);
        peer?.close();
        this.peer = null;
        console.log(this.peer);
        console.log(this.peer,123);
        duolunsocket?.socket.close()
    }


}

export default RTCPeer;
