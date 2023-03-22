import {getUserList} from "../api";
import {USERLIST} from "../types";
import RTCPeer from './index'
import {msg} from './event'

class DuolunSocket{

    //客户端id
    public peerId:string;
    //群聊id
    public roomId ?:string

    public socket: WebSocket
    
    //远程用户列表
    public userList ?: USERLIST[]

    private message:{
        log:(msg:string) =>void,
        error:(msg:string) => void
    };

    constructor(url:string) {
        this.message = {
            log (msg){
                console.log(msg);
            },
            error (msg){
                throw Error(msg);
            }
        };

        const peerId = crypto.randomUUID();
        const socket = new WebSocket(`${url}/${peerId}/2`);
        this.peerId = peerId
        this.socket = socket;
        this.init();

    }

    init() {
        const {socket,message,peerId} = this;

        //socket连接监听
        socket.onopen= async ()=> {
            message.log('信令服务器连接成功');
            //获取远程用户列表
            const userList = await getUserList({});
            this.userList = userList.filter(user => user.userId !== peerId)
        };

        //socket错误监听
        socket.onerror = (err)=>{
            message.error('信令服务器连接失败');
        };

    }

    //TODO 发送ice证书
    public sendCandidate(userID:string,candidate:string){
        const {socket,peerId:fromID} = this;
        socket.send(JSON.stringify({
            eventName:'__ice_candidate',
            data:{
                userID,
                id:'audio',
                label:0,
                fromID,
                candidate
            }
        }));
    }

    //传输sdp协议
    public sendOffer(eventName:'__offer' | '__answer',userID:string,sdp?:string,){
        const {socket,peerId:fromID,message} = this;
        const offerData = {
            eventName,
            data:{
                userID,
                fromID,
                label:0,
                id:'audio',
                sdp
            }
        }
        socket.send(JSON.stringify(offerData));
        message.log(`传输发起方本地SDP`);
    }

    //同意邀请后加入房间
    public async joinRoom(room:string){
        const {socket,peerId:userID} = this;
        const joinData = {
            eventName:"__join",
            data:{
                userID,
                room
            }
        }
        socket.send(JSON.stringify(joinData))
    }

    //创建房间
    public async createRoom(){
        const {socket,peerId:userID} = this;
        const roomId = `room-${crypto.randomUUID()}`
        // 创建房间
        const createData = {
            eventName:"__create",
            data:{
                roomSize:2,
                userID,
                room:roomId
            }
        }
        this.roomId = roomId
        socket.send(JSON.stringify(createData))
    }

    //邀请别人进入房间 type:音频｜视频
    public async inviteRoom(type:1|2,remoteUserId:string|number,room:string){
        const {socket,peerId:inviteID} = this
        const inviteData = {
            eventName:"__invite",
            data:{
                inviteID,
                userList:remoteUserId,
                audioOnly:type === 1 ,
                room
            }
        }
        socket.send(JSON.stringify(inviteData))
    }
}

export default DuolunSocket;
