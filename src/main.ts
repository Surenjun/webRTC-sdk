import RTCPeer from './modules';

declare global {
    interface Window {
        RTCPeer: typeof RTCPeer;
    }
}

((RTCPeer)=>{
    window.RTCPeer = RTCPeer
})(RTCPeer)

