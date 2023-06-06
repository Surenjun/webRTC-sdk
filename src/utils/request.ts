import axios from 'axios'

const service = axios.create({
    //@ts-ignore
    baseURL: window.baseHttpUrl,
    timeout: 100000 // request timeout
})

//@ts-ignore
service.interceptors.request.use((options) => {
    const headers = {
        "Content-Type": "application/json",
    };
    return {
        ...options,
        headers,
    };
});

service.interceptors.response.use(res => {
    // if (res.data.code != 1) {
    //     if (res.data.code == 0) {
    //         console.log(res.data.msg);
    //     }
    //     return Promise.reject(res.data)
    // }
    return res.data
})

export default service
