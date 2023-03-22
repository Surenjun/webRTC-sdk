import {PARAMS,MESSAGETYPE,MESSAGE,STATUS,USERLIST} from '../types';
import {getUserList} from "../api";
import DuolunSocket from "./sockert";
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
    public peer?: RTCPeerConnection;

    //是否是发起方
    public isOffer?:Boolean
    public status ?: STATUS

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
        const {url,onInvited} = param;
        const {startPeer,listenVideoPlay,handleMessage} = this;

        //连接远程服务器
        const duolunSocket = new DuolunSocket(url)
        this.duolunsocket = duolunSocket

        listenVideoPlay();
        //创建本地sdp
        startPeer()
        this.events = {onInvited}

        //socket信息监听
        duolunSocket.socket.onmessage = async e => {
            await handleMessage(e.data)
        };
    }

    //socket消息处理
    private async handleMessage(data:string){
        const socketMessage = JSON.parse(data);
        const {startSession,peer,listenSession,isOffer,duolunsocket,onInvited} = this;
        const {eventName,data:{candidate,sdp,room}} = socketMessage;

        switch (eventName.split('__')[1]){

            //收到对方邀请通话
            case 'invite':
                await onInvited(room)
                break;

            //对方接受通话邀请
            case 'new_peer':
                await startSession('__offer')
                break;

            //添加ice证书
            case 'ice_candidate':
                if(isOffer){
                    const ufragIndex = candidate.split(' ').indexOf('ufrag')
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

    public async onInvited(room:string){

    }

    private peerListen(){
        const {peer,message,answerELes,events,duolunsocket} = this;

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
                duolunsocket!.sendCandidate('t2',e.candidate.candidate)
            } else {
                message.log('候选人收集完成！');
            }
        };

    }

    //创建本地sdp并传输
    private startPeer (){
       const {message,peerListen} = this;

        // @ts-ignore
       const PeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
       !PeerConnection && message.error('当前浏览器不支持WebRTC！');
        this.peer = new PeerConnection();
        peerListen()

    }

    //发起通话请求
    public  startSession = async (eventName:'__offer' | '__answer')=>{
        //获取本地摄像头
        const {peer,myVideoEle,message,duolunsocket} = this;
        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: {frameRate:60 }, audio: true });
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
        const {sdp} = offer;
        this.isOffer = true

        //向服务器更新状态
        duolunsocket!.sendOffer(eventName,'t2',sdp)

    };

    //收到对方的sdp信息
    private listenSession =  async (remotePeer:RTCSessionDescription)=>{
        const {message,duolunsocket,peer} = this;
        let stream: MediaStream;
        try {
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

        duolunsocket!.sendOffer('__answer','t2',sdp)
        await peer!.setLocalDescription(answer);
    }

    //摄像头输出
    private listenVideoPlay(){
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
