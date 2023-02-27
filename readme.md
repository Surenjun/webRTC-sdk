```javascript
const peer = new RTCPeer({
    url: 'ws://localhost:7001/',
    type: 'offer',
    myVideoEle: document.querySelector('#local-video'),
    answerELes: [document.getElementById('remote-video')],
    onError: () => console.log('error'),
    //连接成功的回调
    onOpen: () => {
        console.log('信令服务器连接成功')
    },
    //连收到消息的回调
    onMessage: (messages) => {
        console.log('收到服务端消息', messages)
    },
    // 播放远程视频流的回调
    onPlay: () => {
        console.log('正在播放远程视频流')
    }
});

const button = document.querySelector('.start-button');

function startLive() {
    button.style.display = 'none';
    peer.startSession();
}
```
