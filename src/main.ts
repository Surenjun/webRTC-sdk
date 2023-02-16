import RTCPeer from './modules/index';

(()=>{

    const peer = new RTCPeer({
        url:'ws://localhost:7001/',
        type:'offer',
        myVideoEle:document.getElementById('video'),
        answerELes:[document.getElementById('video1')],

        onError:()=>console.log('error'),

        onOpen:()=>console.log('open'),

        onMessage:()=>console.log('message')
    });

    setTimeout(()=>{
        //发起通话
        peer.startPeer()
    })



})();
