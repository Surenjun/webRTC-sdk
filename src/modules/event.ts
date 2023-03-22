import mitt, {Handler} from "mitt";

const bus = mitt();

type TMsgListeners = { [eventName: string]: Handler };

function on(listener: TMsgListeners = {}): Function {
    const keys = Object.keys(listener);

    for (let key of keys) {
        bus.on(key, listener[key]);
    }

    return () => {
        for (let key of keys) {
            bus.off(key, listener[key]);
        }
    };
}
function emit(eventName: string, payload?: any) {
    bus.emit(eventName, payload);
}

function off(eventName: string, payload?: any) {
    bus.off(eventName, payload);
}


export const msg = {
    on,
    bus,
    emit,
    off
};
